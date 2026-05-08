import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Create a new organization
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { userId, name } = req.body;

    if (!userId || !name) {
      return res.status(400).json({ error: 'User ID and Organization Name are required' });
    }

    // 1. Create the organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert([{ name, owner_id: userId }])
      .select()
      .single();

    if (orgError) throw orgError;

    // 2. Add the creator as an 'admin' member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert([
        { 
          org_id: org.id, 
          user_id: userId, 
          role: 'admin' 
        }
      ]);

    if (memberError) throw memberError;

    return res.status(201).json({
      message: 'Organization created successfully',
      organization: org
    });

  } catch (error: any) {
    console.error('Organization creation error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// List organizations for a user
router.get('/list/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        role,
        organizations (
          id,
          name,
          owner_id,
          created_at
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;

    // Flatten the response
    const organizations = data.map((item: any) => ({
      ...item.organizations,
      userRole: item.role
    }));

    return res.status(200).json(organizations);
  } catch (error: any) {
    console.error('List organizations error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Invite / Add member to organization
router.post('/invite', async (req: Request, res: Response) => {
  try {
    const { orgId, email, role } = req.body;

    if (!orgId || !email) {
      return res.status(400).json({ error: 'Org ID and Email are required' });
    }

    // 1. Find the user by email in auth.users (Supabase admin API)
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    const targetUser = users.find(u => u.email === email);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found. They must have an account first.' });
    }

    // 2. Add to organization_members
    const { data, error } = await supabase
      .from('organization_members')
      .insert([
        { 
          org_id: orgId, 
          user_id: targetUser.id, 
          role: role || 'viewer' 
        }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'User is already a member of this organization' });
      }
      throw error;
    }

    return res.status(201).json({
      message: 'Member added successfully',
      member: data
    });

  } catch (error: any) {
    console.error('Invite member error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Remove a member from organization
router.delete('/:orgId/members/:userId', async (req: Request, res: Response) => {
  try {
    const { orgId, userId } = req.params;
    const { requesterId } = req.body; // In a real app, this would come from auth middleware

    // Basic check: Is the requester an admin?
    const { data: requester, error: reqError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', requesterId)
      .single();

    if (reqError || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can remove members' });
    }

    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('org_id', orgId)
      .eq('user_id', userId);

    if (error) throw error;

    return res.status(200).json({ message: 'Member removed successfully' });
  } catch (error: any) {
    console.error('Remove member error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get members for an organization
router.get('/:orgId/members', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;

    // Fetch members for the org
    const { data: members, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('org_id', orgId);

    if (error) throw error;

    // Fetch user details from auth admin to map emails
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    // Map emails to members
    const membersWithDetails = members.map((m: any) => {
      const user = users.find(u => u.id === m.user_id);
      return {
        ...m,
        email: user?.email || 'Unknown',
        username: user?.user_metadata?.username || 'Unknown'
      };
    });

    return res.status(200).json(membersWithDetails);
  } catch (error: any) {
    console.error('List members error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Update a member's role
router.patch('/:orgId/members/:userId', async (req: Request, res: Response) => {
  try {
    const { orgId, userId } = req.params;
    const { role, requesterId } = req.body;

    if (!role || !['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role provided' });
    }

    // Basic check: Is the requester an admin?
    const { data: requester, error: reqError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', requesterId)
      .single();

    if (reqError || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update roles' });
    }

    const { data, error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ message: 'Role updated successfully', member: data });
  } catch (error: any) {
    console.error('Update role error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
