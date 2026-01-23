/**
 * Authentication Routes
 * 
 * Handles user registration, login, and authentication
 */

import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ensureDb } from '../db.js';
import { hashPassword, comparePassword, generateToken, authenticate } from '../utils/auth.js';

const router = Router();

/**
 * Register a new user
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    
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
    
    const database = await ensureDb();
    
    // Check if user already exists
    const existingUser = database.prepare(`
      SELECT * FROM users WHERE email = ?
    `).get(email);
    
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
      INSERT INTO users (id, email, password_hash, role)
      VALUES (?, ?, ?, 'user')
    `);
    
    const result = stmt.run(userId, email.toLowerCase(), passwordHash);
    await (result instanceof Promise ? result : Promise.resolve(result));
    
    // Generate token
    const token = generateToken({
      id: userId,
      email: email.toLowerCase(),
      role: 'user',
    });
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: userId,
        email: email.toLowerCase(),
        role: 'user',
      },
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register user',
    });
  }
});

/**
 * Login
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
      return;
    }
    
    const database = await ensureDb();
    
    // Find user by email
    const userResult = database.prepare(`
      SELECT * FROM users WHERE email = ?
    `).get(email.toLowerCase());
    
    const user = await (userResult instanceof Promise 
      ? userResult 
      : Promise.resolve(userResult)) as {
      id: string;
      email: string;
      password_hash: string;
      role: string;
    } | undefined;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
      return;
    }
    
    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
      return;
    }
    
    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role as 'admin' | 'user',
    });
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login',
    });
  }
});

/**
 * Get current user info
 * GET /api/auth/me
 * Requires authentication
 */
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    const database = await ensureDb();
    const userResult = database.prepare(`
      SELECT id, email, role, created_at FROM users WHERE id = ?
    `).get(user.id);
    
    const dbUser = await (userResult instanceof Promise 
      ? userResult 
      : Promise.resolve(userResult)) as {
      id: string;
      email: string;
      role: string;
      created_at: string;
    } | undefined;
    
    if (!dbUser) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }
    
    res.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        created_at: dbUser.created_at,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
    });
  }
});

export default router;
