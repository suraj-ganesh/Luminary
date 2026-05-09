import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Register a new webhook
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { userId, orgId, url, events } = req.body;

    if (!userId || !url) {
      return res.status(400).json({ error: 'User ID and Webhook URL are required' });
    }

    const { data, error } = await supabase
      .from('webhooks')
      .insert([
        { 
          user_id: userId, 
          org_id: orgId || null, 
          url, 
          events: events || ['scan.completed'],
          active: true
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: 'Webhook registered successfully',
      webhook: data
    });

  } catch (error: any) {
    console.error('Webhook registration error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// List webhooks
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true);

    if (error) throw error;
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete webhook
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('webhooks')
      .update({ active: false })
      .eq('id', id);

    if (error) throw error;
    return res.status(200).json({ message: 'Webhook deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
