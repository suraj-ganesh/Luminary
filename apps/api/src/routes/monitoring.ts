import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { scanQueue } from '../queues/scanQueue';

const router = Router();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Register a site for monitoring
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { url, userId, frequency, orgId } = req.body;

    if (!url || !userId) {
      return res.status(400).json({ error: 'URL and UserID are required' });
    }

    // Deduplication check
    const { data: existing } = await supabase
      .from('monitored_sites')
      .select('id')
      .eq('user_id', userId)
      .eq('url', url)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'This site is already being monitored.' });
    }

    const { data, error } = await supabase
      .from('monitored_sites')
      .insert([
        { 
          user_id: userId, 
          url, 
          frequency: frequency || 'weekly',
          active: true,
          created_at: new Date().toISOString(),
          org_id: orgId || null
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Trigger initial scan and schedule repeatable scans in background
    // Wrap in try/catch so registration still succeeds even if queue has issues
    try {
      await scanQueue.add(`initial-scan-${data.id}`, {
        url,
        userId,
        monitoredSiteId: data.id
      });

      // BullMQ repeat syntax — use 'cron' key
      let cron = '0 0 * * 1'; // Default: Weekly (Monday at midnight)
      if (frequency === 'daily') cron = '0 0 * * *';
      if (frequency === 'monthly') cron = '0 0 1 * *';

      await scanQueue.add(`monitor-scan-${data.id}`, {
        url,
        userId,
        monitoredSiteId: data.id
      }, {
        repeat: { pattern: cron }
      });

      console.log(`Site ${url} registered for ${frequency} monitoring`);
    } catch (queueError: any) {
      // Log but don't fail — site is saved, just background job didn't schedule
      console.error('Queue registration error (non-fatal):', queueError.message);
    }

    return res.status(201).json({ 
      message: 'Site registered for monitoring',
      site: data 
    });

  } catch (error: any) {
    console.error('Monitoring register error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get all monitored sites for a user
router.get('/sites/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('monitored_sites')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete a monitored site
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('monitored_sites')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return res.status(200).json({ message: 'Monitoring stopped' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Toggle monitoring (Pause/Resume)
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const { error } = await supabase
      .from('monitored_sites')
      .update({ active })
      .eq('id', id);

    if (error) throw error;
    return res.status(200).json({ 
      message: `Monitoring ${active ? 'resumed' : 'paused'}`,
      active 
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Force manual scan for monitored site
router.post('/:id/trigger', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data: site, error: fetchError } = await supabase
      .from('monitored_sites')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !site) throw new Error('Site not found');

    await scanQueue.add(`manual-trigger-${site.id}-${Date.now()}`, {
      url: site.url,
      userId: site.user_id,
      monitoredSiteId: site.id
    });

    return res.status(200).json({ message: 'Scan triggered successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
