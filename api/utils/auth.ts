/**
 * Authentication Utilities
 * 
 * Handles password hashing, JWT token generation and verification
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { type Request, type Response, type NextFunction } from 'express';

// JWT secret - use environment variable or fallback (should be set in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface UserPayload {
  id: string;
  email: string;
  role: 'admin' | 'user';
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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
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
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
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
    
    // Attach user info to request object
    (req as any).user = payload;
    next();
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
  
  if (!user || user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
    return;
  }
  
  next();
}
