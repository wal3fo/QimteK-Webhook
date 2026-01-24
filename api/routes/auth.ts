/**
 * Authentication Routes
 * 
 * Handles user registration, login, and authentication
 */

import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ensureDb } from '../db.js';
import { hashPassword, comparePassword, generateToken, authenticate, generateMfaSecret, generateQrCode, verifyMfaToken } from '../utils/auth.js';

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
    const { email, password, mfa_token } = req.body;
    console.log('Login attempt:', { email, passwordProvided: !!password });

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
        mfa_enabled: boolean;
        mfa_secret: string;
      } | undefined;

    if (!user) {
      console.log('User not found:', email);
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
      return;
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    console.log('Password valid:', isValidPassword);

    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
      return;
    }

    // Check MFA
    if (user.mfa_enabled) {
      if (!mfa_token) {
        res.status(403).json({
          success: false,
          error: 'MFA code required',
          mfa_required: true
        });
        return;
      }

      const isValidMfa = await verifyMfaToken(mfa_token, user.mfa_secret);
      if (!isValidMfa) {
        res.status(401).json({
          success: false,
          error: 'Invalid MFA code',
        });
        return;
      }
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role as 'Administrator' | 'Professional' | 'user',
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        mfa_enabled: !!user.mfa_enabled
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
      SELECT id, email, role, created_at, mfa_enabled FROM users WHERE id = ?
    `).get(user.id);

    const dbUser = await (userResult instanceof Promise
      ? userResult
      : Promise.resolve(userResult)) as {
        id: string;
        email: string;
        role: string;
        created_at: string;
        mfa_enabled: boolean;
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
        mfa_enabled: !!dbUser.mfa_enabled
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

/**
 * Setup MFA (Generate Secret and QR)
 * POST /api/auth/mfa/setup
 */
router.post('/mfa/setup', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { secret, otpauth } = generateMfaSecret(user.email);
    const qrCodeUrl = await generateQrCode(otpauth);

    res.json({
      success: true,
      secret,
      qrCodeUrl
    });
  } catch (error) {
    console.error('Error setting up MFA:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup MFA',
    });
  }
});

/**
 * Enable MFA (Verify and Save)
 * POST /api/auth/mfa/enable
 */
router.post('/mfa/enable', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { token, secret } = req.body;

    if (!token || !secret) {
      res.status(400).json({
        success: false,
        error: 'Token and secret are required',
      });
      return;
    }

    const isValid = await verifyMfaToken(token, secret);
    if (!isValid) {
      res.status(400).json({
        success: false,
        error: 'Invalid MFA token',
      });
      return;
    }

    const database = await ensureDb();
    const stmt = database.prepare(`
      UPDATE users SET mfa_secret = ?, mfa_enabled = 1 WHERE id = ?
    `);

    const result = stmt.run(secret, user.id);
    await (result instanceof Promise ? result : Promise.resolve(result));

    res.json({
      success: true,
      message: 'MFA enabled successfully'
    });
  } catch (error) {
    console.error('Error enabling MFA:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enable MFA',
    });
  }
});

/**
 * Disable MFA
 * POST /api/auth/mfa/disable
 */
router.post('/mfa/disable', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { password } = req.body;

    // Optional: Verify password before disabling for extra security
    // For now we trust the authenticated session, but checking password is good practice
    if (password) {
       const database = await ensureDb();
       const userResult = database.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
       const dbUser = await (userResult instanceof Promise ? userResult : Promise.resolve(userResult));
       const isValid = await comparePassword(password, dbUser.password_hash);
       if (!isValid) {
         res.status(401).json({ success: false, error: 'Invalid password' });
         return;
       }
    }

    const database = await ensureDb();
    const stmt = database.prepare(`
      UPDATE users SET mfa_secret = NULL, mfa_enabled = 0 WHERE id = ?
    `);

    const result = stmt.run(user.id);
    await (result instanceof Promise ? result : Promise.resolve(result));

    res.json({
      success: true,
      message: 'MFA disabled successfully'
    });
  } catch (error) {
    console.error('Error disabling MFA:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disable MFA',
    });
  }
});

/**
 * Change Password
 * POST /api/auth/change-password
 */
router.post('/change-password', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Current and new password are required',
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters',
      });
      return;
    }

    const database = await ensureDb();

    // Get user with password hash
    const userResult = database.prepare(`
      SELECT * FROM users WHERE id = ?
    `).get(user.id);

    const dbUser = await (userResult instanceof Promise
      ? userResult
      : Promise.resolve(userResult)) as {
        id: string;
        password_hash: string;
      } | undefined;

    if (!dbUser) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Verify current password
    const isValidPassword = await comparePassword(currentPassword, dbUser.password_hash);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Incorrect current password',
      });
      return;
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    const stmt = database.prepare(`
      UPDATE users SET password_hash = ? WHERE id = ?
    `);

    const result = stmt.run(newPasswordHash, user.id);
    await (result instanceof Promise ? result : Promise.resolve(result));

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
    });
  }
});

export default router;
