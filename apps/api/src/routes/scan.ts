import { Router, Request, Response } from 'express';
import { scanUrl } from '../services/crawler';
import { analyzeViolations } from '../services/ai';
import { calculateScore } from '../services/scorer';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

router.post('/', async (req: Request, res: Response) => {
  try {
    const { url, userId, orgId } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch (_) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    console.log(`Received scan request for: ${url} (User: ${userId || 'Anonymous'})`);

    // 0. Check limits if user is logged in
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', userId)
        .single();

      const plan = profile?.plan || 'free';
      const limits: Record<string, number> = {
        'free': 10,
        'pro': 500,
        'enterprise': 1000000
      };

      const limit = limits[plan] || 10;

      const { count } = await supabase
        .from('scans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (count !== null && count >= limit) {
        return res.status(429).json({ 
          error: 'Too Many Requests', 
          message: `You have reached your scan limit for the ${plan.toUpperCase()} plan. Please upgrade to continue.` 
        });
      }
    }
    
    // 1. Run the scan
    const rawViolations = await scanUrl(url);
    
    // 2. Calculate score
    const { score, counts } = calculateScore(rawViolations);
    
    // 3. Run AI analysis
    const analyzedViolations = await analyzeViolations(rawViolations);
    
    const result = {
      url,
      score,
      counts,
      violations: analyzedViolations,
      timestamp: new Date().toISOString()
    };

    // 4. Save to Supabase if userId is provided
    let savedScanId: string | null = null;
    if (userId) {
      const { data: savedData, error } = await supabase
        .from('scans')
        .insert([
          { 
            user_id: userId, 
            url, 
            score, 
            counts: JSON.stringify(counts), 
            results: JSON.stringify(analyzedViolations),
            org_id: orgId || null 
          }
        ])
        .select('id')
        .single();
      
      if (error) {
        console.error('Supabase save error:', error);
      } else {
        savedScanId = savedData.id;
        console.log('Scan saved to Supabase for user:', userId, 'ID:', savedScanId);

        // --- Webhook Delivery Engine ---
        console.log(`🔍 Checking for webhooks for user ${userId}...`);
        supabase
          .from('webhooks')
          .select('url')
          .eq('user_id', userId)
          .eq('active', true)
          .then(({ data: webhooks, error: webhookError }) => {
             if (webhookError) {
               console.error('Error fetching webhooks:', webhookError);
               return;
             }
             
             console.log(`📡 Found ${webhooks?.length || 0} active webhooks for user ${userId}`);
             
             if (webhooks && webhooks.length > 0) {
               const payload = {
                 event: 'scan.completed',
                 scanId: savedScanId,
                 url,
                 score,
                 timestamp: new Date().toISOString()
               };
               webhooks.forEach(wh => {
                 console.log(`📤 Dispatching webhook to ${wh.url}...`);
                 fetch(wh.url, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify(payload)
                 }).then(r => console.log(`✅ Webhook delivered to ${wh.url}: Status ${r.status}`))
                   .catch(e => console.error(`❌ Webhook delivery failed for ${wh.url}:`, e));
               });
             }
          });

        // --- In-App Notification Center ---
        supabase
          .from('notifications')
          .insert([{
             user_id: userId,
             title: 'Scan Complete',
             body: `Audit finished for ${url} with a score of ${score}%`,
             type: score >= 90 ? 'success' : score >= 70 ? 'info' : 'warning'
          }])
          .then(({ error: notifError }) => {
            if (notifError) console.error('Failed to create notification:', notifError);
          });
      }
    }
    
    return res.status(200).json({ ...result, id: savedScanId });

  } catch (error: any) {
    console.error('Scan route error:', error);
    return res.status(500).json({ 
      error: 'Failed to scan website',
      message: error.message 
    });
  }
});

// GET /api/scan/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error || !data) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    return res.status(200).json({
      id: data.id,
      url: data.url,
      score: data.score,
      counts: typeof data.counts === 'string' ? JSON.parse(data.counts) : data.counts,
      violations: typeof data.results === 'string' ? JSON.parse(data.results) : data.results,
      created_at: data.created_at
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/scan/bulk/site
router.delete('/bulk/site', async (req: Request, res: Response) => {
  try {
    const { url, userId } = req.body;
    if (!url || !userId) return res.status(400).json({ error: 'URL and User ID required' });

    const { error } = await supabase
      .from('scans')
      .delete()
      .eq('user_id', userId)
      .eq('url', url);

    if (error) return res.status(500).json({ error: 'Failed to delete scans' });
    return res.status(200).json({ message: 'Scans deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/scan/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('scans')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete scan' });
    }

    return res.status(200).json({ message: 'Scan deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
