/**
 * Authentication Routes
 * 
 * Handles user registration, login, and authentication
 */

import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase.js';
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

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'User already exists',
      });
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        role: 'user', // Default role
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create user',
      });
      return;
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: 'user',
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        mfa_enabled: false
      },
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register',
    });
  }
});

/**
 * Verify email
 * GET /api/auth/verify-email
 */
router.get('/verify-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid verification token',
      });
      return;
    }

    // Find user with this token
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('verification_token', token)
      .single();

    if (fetchError || !user) {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token',
      });
      return;
    }

    // Check if token expired
    if (user.verification_token_expires_at && new Date(user.verification_token_expires_at) < new Date()) {
      res.status(400).json({
        success: false,
        error: 'Verification token has expired',
      });
      return;
    }

    // Update user status
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_verified: true,
        verification_token: null,
        verification_token_expires_at: null
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    // Redirect to login with success message
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/login?verified=true`);
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify email',
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

    // Find user by email
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (fetchError || !user) {
      console.log('User not found or error:', email);
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

    const { data: dbUser, error } = await supabase
      .from('users')
      .select('*') // Select all columns to avoid errors if specific columns are missing
      .eq('id', user.id)
      .single();

    if (error || !dbUser) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Determine virtual role
    let role = dbUser.role;

    res.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: role,
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

    const { error: updateError } = await supabase
      .from('users')
      .update({
        mfa_secret: secret,
        mfa_enabled: true
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

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

    if (password) {
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', user.id)
        .single();

      if (error || !dbUser) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const isValid = await comparePassword(password, dbUser.password_hash);
      if (!isValid) {
        res.status(401).json({ success: false, error: 'Invalid password' });
        return;
      }
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        mfa_secret: null,
        mfa_enabled: false
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

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

    // Get user with password hash
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('id', user.id)
      .single();

    if (error || !dbUser) {
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
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', user.id);

    if (updateError) throw updateError;

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
