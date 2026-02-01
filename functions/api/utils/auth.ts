import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { createSupabaseClient } from '../lib/supabase';

export interface UserPayload {
  id: string;
  email: string;
  role: 'Administrator' | 'Professional' | 'user';
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: UserPayload, secret: string, expiresIn: string = '7d'): string {
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
}

export function verifyToken(token: string, secret: string): UserPayload | null {
  try {
    const decoded = jwt.verify(token, secret) as UserPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

export function generateMfaSecret(email: string) {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(email, 'QimteK Webhook', secret);
  return { secret, otpauth };
}

export async function generateQrCode(otpauth: string) {
  return QRCode.toDataURL(otpauth);
}

export async function verifyMfaToken(token: string, secret: string) {
  try {
    return authenticator.verify({ token, secret });
  } catch (err) {
    return false;
  }
}

export async function authenticate(request: Request, env: any): Promise<UserPayload | Response> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({
      success: false,
      error: 'No token provided'
    }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const token = authHeader.split(' ')[1];
  const secret = env.JWT_SECRET || 'your-secret-key-change-in-production';
  
  const decoded = verifyToken(token, secret);

  if (!decoded) {
     return new Response(JSON.stringify({
      success: false,
      error: 'Invalid token'
    }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const supabase = createSupabaseClient(env);
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, role, is_verified')
    .eq('id', decoded.id)
    .single();

  if (error || !user) {
      return new Response(JSON.stringify({
      success: false,
      error: 'User not found'
    }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

   if (!user.is_verified) {
      return new Response(JSON.stringify({
      success: false,
      error: 'User is not verified'
    }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  return {
      id: user.id,
      email: user.email,
      role: user.role
  } as UserPayload;
}
