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
    const { orgId, email, role, requesterId } = req.body;

    if (!orgId || !email || !requesterId) {
      return res.status(400).json({ error: 'Org ID, Email, and requesterId are required' });
    }

    // 1. Basic check: Is the requester an admin?
    const { data: requester, error: reqError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', requesterId)
      .single();

    if (reqError || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can invite members' });
    }

    // 2. Find the user by email in auth.users (Supabase admin API)
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    const targetUser = users.find(u => u.email === email);

    if (targetUser) {
      // User exists, add directly to organization_members
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
        member: data,
        type: 'direct'
      });
    } else {
      // User doesn't exist, create an invite token
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');

      const { data: inviteData, error: inviteError } = await supabase
        .from('organization_invites')
        .insert([
          {
            org_id: orgId,
            email: email,
            role: role || 'viewer',
            token: token,
            invited_by: requesterId
          }
        ])
        .select()
        .single();

      if (inviteError) {
        if (inviteError.code === '23505') {
           return res.status(400).json({ error: 'An invite for this email already exists' });
        }
        throw inviteError;
      }

      // In a real app, send email here. For now, we return the token to simulate.
      return res.status(201).json({
        message: 'Invitation created successfully',
        invite: inviteData,
        inviteUrl: `http://localhost:3000/invite/${token}`, // frontend URL
        type: 'invite'
      });
    }

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

// Rename Organization
router.patch('/:orgId', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { name, requesterId } = req.body;

    if (!name) {
       return res.status(400).json({ error: 'New organization name is required' });
    }

    const { data: requester, error: reqError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', requesterId)
      .single();

    if (reqError || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can rename organizations' });
    }

    const { data, error } = await supabase
      .from('organizations')
      .update({ name })
      .eq('id', orgId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ message: 'Organization renamed successfully', organization: data });
  } catch (error: any) {
    console.error('Rename org error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete Organization
router.delete('/:orgId', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { requesterId } = req.body;

    const { data: requester, error: reqError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', requesterId)
      .single();

    if (reqError || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete organizations' });
    }

    // Manually delete related records to prevent foreign key constraint violations
    await supabase.from('scans').delete().eq('org_id', orgId);
    await supabase.from('monitored_sites').delete().eq('org_id', orgId);
    await supabase.from('webhooks').delete().eq('org_id', orgId);
    await supabase.from('integrations').delete().eq('org_id', orgId);
    await supabase.from('organization_invites').delete().eq('org_id', orgId);
    await supabase.from('organization_members').delete().eq('org_id', orgId);

    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', orgId);

    if (error) throw error;

    return res.status(200).json({ message: 'Organization deleted successfully' });
  } catch (error: any) {
    console.error('Delete org error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Leave Organization
router.delete('/:orgId/leave', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { userId } = req.body;

    // Check if user is the ONLY admin. If so, they cannot leave without transferring or deleting.
    const { data: members, error: memError } = await supabase
      .from('organization_members')
      .select('user_id, role')
      .eq('org_id', orgId);

    if (memError) throw memError;

    const userMembership = members.find(m => m.user_id === userId);
    if (!userMembership) {
      return res.status(404).json({ error: 'You are not a member of this organization' });
    }

    const admins = members.filter(m => m.role === 'admin');
    if (userMembership.role === 'admin' && admins.length === 1) {
       return res.status(400).json({ error: 'You are the only admin. Please promote someone else to admin before leaving, or delete the organization.' });
    }

    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('org_id', orgId)
      .eq('user_id', userId);

    if (error) throw error;

    return res.status(200).json({ message: 'Left organization successfully' });
  } catch (error: any) {
    console.error('Leave org error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// List pending invites for an organization
router.get('/:orgId/invites', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;

    const { data, error } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('org_id', orgId);

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('List invites error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete a pending invite (Revoke)
router.delete('/:orgId/invites/:inviteId', async (req: Request, res: Response) => {
  try {
    const { orgId, inviteId } = req.params;
    const { requesterId } = req.body;

    const { data: requester, error: reqError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', requesterId)
      .single();

    if (reqError || requester.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can revoke invites' });
    }

    const { error } = await supabase
      .from('organization_invites')
      .delete()
      .eq('id', inviteId)
      .eq('org_id', orgId);

    if (error) throw error;

    return res.status(200).json({ message: 'Invite revoked successfully' });
  } catch (error: any) {
    console.error('Revoke invite error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Accept an invite
router.post('/invites/accept', async (req: Request, res: Response) => {
  try {
    const { token, userId } = req.body;

    if (!token || !userId) {
       return res.status(400).json({ error: 'Token and User ID are required' });
    }

    // Find the invite
    const { data: invite, error: inviteError } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('token', token)
      .single();

    if (inviteError || !invite) {
       return res.status(404).json({ error: 'Invalid or expired invitation token' });
    }

    if (new Date() > new Date(invite.expires_at)) {
       return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Add user to the organization
    const { data, error } = await supabase
      .from('organization_members')
      .insert([
        { 
          org_id: invite.org_id, 
          user_id: userId, 
          role: invite.role 
        }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'You are already a member of this organization' });
      }
      throw error;
    }

    // Delete the invite token
    await supabase
      .from('organization_invites')
      .delete()
      .eq('id', invite.id);

    return res.status(200).json({
      message: 'Invitation accepted successfully',
      member: data
    });

  } catch (error: any) {
    console.error('Accept invite error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
