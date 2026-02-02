import { PagesFunction } from '@cloudflare/workers-types';
import jwt from 'jsonwebtoken';
import { generateSecret, generateURI } from 'otplib';

interface Env {
  JWT_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    // 1. Safe Environment Access
    const jwtSecret = env.JWT_SECRET || 'your-secret-key-change-in-production';

    // 2. Validate Authentication (JWT)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const tokenStr = authHeader.split(' ')[1];
    let user: any;
    try {
      user = jwt.verify(tokenStr, jwtSecret);
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Generate MFA Secret
    const secret = generateSecret();
    const otpauth = generateURI({
      secret,
      label: user.email,
      issuer: 'QimteK Webhook'
    });

    // 4. Generate QR Code (Lazy Load)
    let qrCodeUrl = '';
    try {
      // Dynamic import to prevent top-level side effects in Edge runtime
      const QRCodeModule = await import('qrcode');
      // Handle both default export and named export patterns
      const QRCode = QRCodeModule.default || QRCodeModule;

      if (typeof QRCode.toDataURL === 'function') {
        qrCodeUrl = await QRCode.toDataURL(otpauth);
      } else if (typeof (QRCode as any).default?.toDataURL === 'function') {
        qrCodeUrl = await (QRCode as any).default.toDataURL(otpauth);
      } else {
        // Fallback or throw if structure is unexpected
        throw new Error('QRCode.toDataURL not found');
      }
    } catch (e) {
      console.error('QR Code Generation Error:', e);
      return new Response(JSON.stringify({ success: false, error: 'Failed to generate QR code' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 5. Success Response
    return new Response(JSON.stringify({
      success: true,
      secret,
      qrCodeUrl
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('MFA Setup Exception:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to setup MFA' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
