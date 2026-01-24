
/**
 * User Management Routes (Admin Only)
 */

import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ensureDb } from '../db.js';
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

    const database = await ensureDb();
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = database.prepare(`
      SELECT * FROM users WHERE email = ?
    `).get(normalizedEmail);

    const userResult = await (existingUser instanceof Promise
      ? existingUser
      : Promise.resolve(existingUser));

    if (userResult) {
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
    const stmt = database.prepare(`
      INSERT INTO users (id, email, password_hash, role, is_verified)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(userId, normalizedEmail, passwordHash, role, 1);
    await (result instanceof Promise ? result : Promise.resolve(result));

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
    const database = await ensureDb();

    // Get all users (exclude password hash)
    const usersResult = database.prepare(`
      SELECT id, email, role, created_at, mfa_enabled
      FROM users
      ORDER BY created_at DESC
    `).all();

    const usersList = await (usersResult instanceof Promise
      ? usersResult
      : Promise.resolve(usersResult));

    // Get webhook count for each user
    const users = await Promise.all(usersList.map(async (user: any) => {
      // Count active webhooks
      const countResult = database.prepare(`
        SELECT COUNT(*) as count 
        FROM webhooks 
        WHERE user_id = ? AND is_active = 1 AND expires_at > datetime('now')
      `).get(user.id);

      const countData = await (countResult instanceof Promise 
        ? countResult 
        : Promise.resolve(countResult));
      
      return {
        ...user,
        webhook_count: countData ? countData.count : 0
      };
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

    const database = await ensureDb();

    // Delete user
    const stmt = database.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    await (result instanceof Promise ? result : Promise.resolve(result));

    // Also delete user's webhooks (optional but good practice)
    // The DB might have CASCADE delete, but let's be safe for JSON DB
    const deleteWebhooks = database.prepare('DELETE FROM webhooks WHERE user_id = ?');
    const webhookResult = deleteWebhooks.run(id);
    await (webhookResult instanceof Promise ? webhookResult : Promise.resolve(webhookResult));

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

    const database = await ensureDb();

    const stmt = database.prepare('UPDATE users SET role = ? WHERE id = ?');
    const result = stmt.run(role, id);
    await (result instanceof Promise ? result : Promise.resolve(result));

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
