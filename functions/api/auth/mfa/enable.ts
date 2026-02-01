import { PagesFunction } from '@cloudflare/workers-types';
import { verifyMfaToken, verifyToken } from '../../../../api/utils/auth';
import { supabase } from '../../../../api/lib/supabase';
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

      const { token, secret } = await context.request.json() as any;

      if (!token || !secret) {
        return new Response(JSON.stringify({ success: false, error: 'Token and secret are required' }), { status: 400 });
      }

      const isValid = await verifyMfaToken(token, secret);
      if (!isValid) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid MFA token' }), { status: 400 });
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          mfa_secret: secret,
          mfa_enabled: true
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({
        success: true,
        message: 'MFA enabled successfully'
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
      console.error('Error enabling MFA:', error);
      return new Response(JSON.stringify({ success: false, error: 'Failed to enable MFA' }), { status: 500 });
    }
  });
};
