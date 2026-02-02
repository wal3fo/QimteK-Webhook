
import { PagesFunction } from '@cloudflare/workers-types';
import { supabase } from '../../../api/lib/supabase';
import { comparePassword, generateToken, verifyMfaToken } from '../../../api/utils/auth';
import { envContext } from '../../../api/lib/context';

interface Env {
  [key: string]: string | undefined;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  return envContext.run(context.env, async () => {
    try {
      const { email, password, mfa_token } = await context.request.json() as any;

      if (!email || !password) {
        return new Response(JSON.stringify({ success: false, error: 'Email and password are required' }), { status: 400 });
      }

      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (fetchError || !user) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid email or password' }), { status: 401 });
      }

      const isValidPassword = await comparePassword(password, user.password_hash);

      if (!isValidPassword) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid email or password' }), { status: 401 });
      }

      if (user.mfa_enabled) {
        if (!mfa_token) {
          return new Response(JSON.stringify({
            success: false,
            error: 'MFA code required',
            mfa_required: true
          }), { status: 403 });
        }

        const isValidMfa = await verifyMfaToken(mfa_token, user.mfa_secret);
        if (!isValidMfa) {
           return new Response(JSON.stringify({ success: false, error: 'Invalid MFA code' }), { status: 401 });
        }
      }

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role as 'Administrator' | 'Professional' | 'user',
      });

      return new Response(JSON.stringify({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          mfa_enabled: !!user.mfa_enabled,
          plan_expires_at: user.plan_expires_at
        },
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
      console.error('Error logging in:', error);
      return new Response(JSON.stringify({ success: false, error: 'Failed to login', details: error.message }), { status: 500 });
    }
  });
};
