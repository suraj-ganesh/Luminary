import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * @route GET /api/history/:userId
 * @desc Get score history for a specific URL or all sites for a user
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { url } = req.query;

    let query = supabase
      .from('scans')
      .select('id, score, created_at, url')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (url) {
      query = query.eq('url', url);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Group by date for charts if multiple scans per day? 
    // For now, return raw data points
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('History fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/history/site/:monitoredSiteId
 * @desc Get history specifically for a monitored site
 */
router.get('/site/:monitoredSiteId', async (req: Request, res: Response) => {
  try {
    const { monitoredSiteId } = req.params;
    
    // First get the URL for this monitored site
    const { data: site } = await supabase
      .from('monitored_sites')
      .select('url, user_id')
      .eq('id', monitoredSiteId)
      .single();

    if (!site) return res.status(404).json({ error: 'Monitored site not found' });

    const { data, error } = await supabase
      .from('scans')
      .select('score, created_at')
      .eq('user_id', site.user_id)
      .eq('url', site.url)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
