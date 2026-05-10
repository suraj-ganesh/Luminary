import { Queue, Worker, Job } from 'bullmq';
import { redisConnection } from '../lib/redis';
import { scanUrl } from '../services/crawler';
import { analyzeViolations } from '../services/ai';
import { calculateScore } from '../services/scorer';
import { createClient } from '@supabase/supabase-js';
import { sendScanAlert } from '../services/email';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const SCAN_QUEUE_NAME = 'site-scans';

export const scanQueue = new Queue(SCAN_QUEUE_NAME, {
  connection: redisConnection,
});

export const scanWorker = new Worker(
  SCAN_QUEUE_NAME,
  async (job: Job) => {
    const { url, userId, monitoredSiteId } = job.data;
    console.log(`[Worker] Starting background scan for: ${url} (User: ${userId})`);

    try {
      // 1. Run the scan
      const rawViolations = await scanUrl(url);
      
      // 2. Calculate score
      const { score, counts } = calculateScore(rawViolations);
      
      // 3. Run AI analysis
      const analyzedViolations = await analyzeViolations(rawViolations);
      
      // 4. Save to Supabase
      const { data, error } = await supabase
        .from('scans')
        .insert([
          { 
            user_id: userId, 
            url, 
            score, 
            counts: JSON.stringify(counts), 
            results: JSON.stringify(analyzedViolations) 
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      const scanId = data.id;

      // 5. Dispatch Webhooks
      const { data: webhooks } = await supabase
        .from('webhooks')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true);

      if (webhooks && webhooks.length > 0) {
        console.log(`[Worker] Dispatching ${webhooks.length} webhooks for user ${userId}`);
        for (const webhook of webhooks) {
          try {
            await fetch(webhook.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Luminary-Signature': 'sha256=...' },
              body: JSON.stringify({
                event: 'scan.completed',
                data: {
                  scanId,
                  url,
                  score,
                  counts,
                  timestamp: new Date().toISOString()
                }
              })
            });
          } catch (whError) {
            console.error(`[Worker] Webhook failed for ${webhook.url}:`, whError);
          }
        }
      }

      // 6. Update monitored_site if applicable
      if (monitoredSiteId) {
        // Fetch previous score and site details
        const { data: siteData } = await supabase
          .from('monitored_sites')
          .select('last_score, url')
          .eq('id', monitoredSiteId)
          .single();

        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const email = userData.user?.email;

        // Check for significant score drop
        const previousScore = siteData?.last_score;
        console.log(`[Worker] Comparing scores for ${url}: Prev: ${previousScore}, New: ${score}`);

        if (previousScore !== null && previousScore !== undefined && score < previousScore) {
          const dropAmount = (previousScore - score).toFixed(1);
          console.log(`[Worker] Score drop detected: ↓${dropAmount}%`);
          
          const { error: notifError } = await supabase.from('notifications').insert([
            {
              user_id: userId,
              title: `Score Drop Detected: ${url}`,
              body: `Accessibility score dropped from ${previousScore}% to ${score}% (↓${dropAmount}%).`,
              type: 'warning',
              read: false
            }
          ]);
          if (notifError) console.error('[Worker] Failed to create drop notification:', notifError);
        } else {
          console.log(`[Worker] Regular completion for ${url}`);
          const { error: notifError } = await supabase.from('notifications').insert([
            {
              user_id: userId,
              title: `Audit Complete: ${url}`,
              body: `The scheduled scan for ${url} finished with a score of ${score}%.`,
              type: 'success',
              read: false
            }
          ]);
          if (notifError) console.error('[Worker] Failed to create completion notification:', notifError);
        }

        const { error: updateError } = await supabase
          .from('monitored_sites')
          .update({ 
            last_scan_at: new Date().toISOString(),
            last_score: score 
          })
          .eq('id', monitoredSiteId);
        
        if (updateError) console.error('[Worker] Failed to update monitored site:', updateError);

        if (email) {
          await sendScanAlert(email, url, score, previousScore);
        }
      }

      console.log(`[Worker] Scan completed for ${url}. Score: ${score}`);
      return { scanId: data.id, score };

    } catch (error: any) {
      console.error(`[Worker] Scan failed for ${url}:`, error);
      throw error;
    }
  },
  { connection: redisConnection }
);

scanWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully`);
});

scanWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err);
});
