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
      console.log('MFA Disable: Request received');
      const authHeader = context.request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ success: false, error: 'No token provided' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const tokenStr = authHeader.substring(7);
      const user = verifyToken(tokenStr);

      if (!user) {
        console.log('MFA Disable: Invalid token');
        return new Response(JSON.stringify({ success: false, error: 'Invalid or expired token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      console.log('MFA Disable: Processing for user', user.id);
      const { password } = await context.request.json() as any;

      if (password) {
        const { data: dbUser, error } = await supabase
          .from('users')
          .select('password_hash')
          .eq('id', user.id)
          .single();

        if (error || !dbUser) {
          console.error('MFA Disable: User not found in DB', error);
          return new Response(JSON.stringify({ success: false, error: 'User not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        const isValid = await comparePassword(password, dbUser.password_hash);
        if (!isValid) {
          console.log('MFA Disable: Invalid password');
          return new Response(JSON.stringify({ success: false, error: 'Invalid password' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          mfa_secret: null,
          mfa_enabled: false
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('MFA Disable: DB Update failed', updateError);
        throw updateError;
      }

      console.log('MFA Disable: Success');
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
      console.error('Error disabling MFA:', error);
      return new Response(JSON.stringify({ success: false, error: 'Failed to disable MFA' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  });
};
