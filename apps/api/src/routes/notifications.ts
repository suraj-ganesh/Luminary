import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get unread notifications for a user
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Mark a single notification as read
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read for a user
router.patch('/:userId/read-all', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Update notification preferences
router.patch('/:userId/preferences', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { notify_score_drop, notify_digest } = req.body;

    const { error } = await supabase
      .from('profiles')
      .update({ notify_score_drop, notify_digest })
      .eq('id', userId);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
