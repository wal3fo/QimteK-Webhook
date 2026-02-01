import { PagesFunction } from '@cloudflare/workers-types';
import { generateMfaSecret, generateQrCode, verifyToken } from '../../../../api/utils/auth';
import { envContext } from '../../../../api/lib/context';

interface Env {
  [key: string]: string | undefined;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  return envContext.run(context.env, async () => {
    try {
      const authHeader = context.request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ success: false, error: 'No token provided' }), { status: 401 });
      }

      const tokenStr = authHeader.substring(7);
      const user = verifyToken(tokenStr);

      if (!user) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid or expired token' }), { status: 401 });
      }

      const { secret, otpauth } = generateMfaSecret(user.email);
      const qrCodeUrl = await generateQrCode(otpauth);

      return new Response(JSON.stringify({
        success: true,
        secret,
        qrCodeUrl
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
      console.error('Error setting up MFA:', error);
      return new Response(JSON.stringify({ success: false, error: 'Failed to setup MFA' }), { status: 500 });
    }
  });
};
