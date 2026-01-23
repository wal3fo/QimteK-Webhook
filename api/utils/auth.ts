/**
 * Authentication Utilities
 * 
 * Handles password hashing, JWT token generation and verification
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { type Request, type Response, type NextFunction } from 'express';
import { generateSecret, verify, generateURI } from 'otplib';
import QRCode from 'qrcode';

import { ensureDb } from '../db.js';

// JWT secret - use environment variable or fallback (should be set in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface UserPayload {
  id: string;
  email: string;
  role: 'Administrator' | 'Professional' | 'user';
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare a password with a hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
}

/**
 * Verify a JWT token and return the payload
 */
export function verifyToken(token: string): UserPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Generate MFA Secret and OTPAuth URL
 */
export function generateMfaSecret(email: string) {
  const secret = generateSecret();
  const otpauth = generateURI({ secret, label: email, issuer: 'QimteK Webhook' });
  return { secret, otpauth };
}

/**
 * Generate QR Code Data URL
 */
export async function generateQrCode(otpauth: string) {
  return QRCode.toDataURL(otpauth);
}

/**
 * Verify MFA Token
 */
export async function verifyMfaToken(token: string, secret: string) {
  // verify from otplib v13+ might return an object { valid: boolean, ... } or boolean
  const result = await verify({ token, secret });
  if (typeof result === 'boolean') return result;
  return (result as any)?.valid === true;
}

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header and checks DB for active user
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = verifyToken(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    // Verify user exists in database and get latest role
    try {
      const database = await ensureDb();
      const user = database.prepare('SELECT * FROM users WHERE id = ?').get(payload.id) as any;

      const userResult = await (user instanceof Promise ? user : Promise.resolve(user));

      if (!userResult) {
        res.status(401).json({
          success: false,
          error: 'User no longer exists',
        });
        return;
      }

      // Attach latest user info to request object
      (req as any).user = {
        id: userResult.id,
        email: userResult.email,
        role: userResult.role
      };

      next();
    } catch (dbError) {
      console.error('Database auth check failed:', dbError);
      // Fallback to token payload if DB check fails (optional, but safer to fail closed)
      // For high security, we should fail.
      res.status(500).json({
        success: false,
        error: 'Authentication system error',
      });
      return;
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Admin-only middleware
 * Must be used after authenticate middleware
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as UserPayload | undefined;

  if (!user || user.role !== 'Administrator') {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
    return;
  }

  next();
}
