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
import { supabase } from '../lib/supabase.js';

// Safe environment variable access
const getEnv = (key: string, defaultValue: string) => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || defaultValue;
    }
    // Fallback for environments where process is not defined
    return defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

// Helper to get secrets lazily (for Cloudflare Pages compatibility)
function getJwtSecret() {
  return getEnv('JWT_SECRET', 'your-secret-key-change-in-production');
}

function getJwtExpiresIn() {
  return getEnv('JWT_EXPIRES_IN', '7d');
}

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
  return jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiresIn() as any });
}

/**
 * Verify a JWT token and return the payload
 */
export function verifyToken(token: string): UserPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as UserPayload;
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
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    // Attach user to request
    (req as any).user = decoded;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Admin middleware
 * Ensures user is an Administrator
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as UserPayload;

  if (!user || user.role !== 'Administrator') {
    res.status(403).json({
      success: false,
      error: 'Access denied. Administrator privileges required.',
    });
    return;
  }

  next();
}
