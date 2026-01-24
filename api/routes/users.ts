/**
 * User Management Routes (Admin Only)
 */

import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase.js';
import { authenticate, requireAdmin, hashPassword } from '../utils/auth.js';

const router = Router();

/**
 * Create a new user (Admin only)
 * POST /api/users
 */
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role = 'user' } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
      return;
    }

    // Validate password length
    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters',
      });
      return;
    }

    // Validate role
    if (!['user', 'Administrator', 'Professional'].includes(role)) {
      res.status(400).json({
        success: false,
        error: 'Invalid role. Must be "user", "Professional" or "Administrator"',
      });
      return;
    }

    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'User with this email already exists',
      });
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = uuidv4();

    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: normalizedEmail,
        password_hash: passwordHash,
        role,
        is_verified: true,
        created_at: new Date().toISOString()
      });

    if (insertError) throw insertError;

    res.status(201).json({
      success: true,
      user: {
        id: userId,
        email: normalizedEmail,
        role: role,
        created_at: new Date().toISOString() // Approximate for response
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
    });
  }
});

/**
 * List all users
 * GET /api/users
 */
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // Get all users (exclude password hash)
    const { data: usersList, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, created_at, mfa_enabled')
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    // Get webhook count for each user
    // We can use a join or separate queries. For simplicity and since we have the list, 
    // we can use a group by query on webhooks table instead of N+1 queries.

    // Get all active webhook counts grouped by user_id
    // Supabase doesn't support "group by" easily with select count in one go via JS client without RPC or views.
    // So we might stick to Promise.all for now if the user base is small, OR fetch all webhooks and aggregate in memory.
    // Given it's "Admin Only" and likely not millions of users, Promise.all is okay-ish, but let's try to be better.
    // Fetching all active webhooks (just user_id) might be lighter.

    const { data: webhooks } = await supabase
      .from('webhooks')
      .select('user_id')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());

    const webhookCounts: Record<string, number> = {};
    if (webhooks) {
      webhooks.forEach(wh => {
        webhookCounts[wh.user_id] = (webhookCounts[wh.user_id] || 0) + 1;
      });
    }

    const users = (usersList || []).map((user: any) => ({
      ...user,
      webhook_count: webhookCounts[user.id] || 0
    }));

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
    });
  }
});

/**
 * Delete a user
 * DELETE /api/users/:id
 */
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    // Prevent deleting self
    if (id === currentUser.id) {
      res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
      });
      return;
    }

    // Delete user (Cascading delete should handle webhooks if configured in DB, 
    // but we can manually delete webhooks first to be safe or if foreign keys aren't set up for cascade)

    // Check if we need to manually delete webhooks
    // Assuming Supabase foreign keys might not be set to CASCADE.
    await supabase.from('webhooks').delete().eq('user_id', id);

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
    });
  }
});

/**
 * Update user role
 * PATCH /api/users/:id/role
 */
router.patch('/:id/role', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const currentUser = (req as any).user;

    if (id === currentUser.id) {
      res.status(400).json({
        success: false,
        error: 'Cannot change your own role',
      });
      return;
    }

    if (!['Administrator', 'Professional', 'user'].includes(role)) {
      res.status(400).json({
        success: false,
        error: 'Invalid role. Must be "Administrator", "Professional", or "user"',
      });
      return;
    }

    const { error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'User role updated successfully',
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user role',
    });
  }
});

export default router;
