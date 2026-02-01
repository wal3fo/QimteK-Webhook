import { PagesFunction } from '@cloudflare/workers-types';
import { comparePassword, verifyToken } from '../../../../api/utils/auth';
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

      const { password } = await context.request.json() as any;

      if (password) {
        const { data: dbUser, error } = await supabase
          .from('users')
          .select('password_hash')
          .eq('id', user.id)
          .single();

        if (error || !dbUser) {
          return new Response(JSON.stringify({ success: false, error: 'User not found' }), { status: 404 });
        }

        const isValid = await comparePassword(password, dbUser.password_hash);
        if (!isValid) {
          return new Response(JSON.stringify({ success: false, error: 'Invalid password' }), { status: 401 });
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

      return new Response(JSON.stringify({
        success: true,
        message: 'MFA disabled successfully'
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
      console.error('Error disabling MFA:', error);
      return new Response(JSON.stringify({ success: false, error: 'Failed to disable MFA' }), { status: 500 });
    }
  });
};
