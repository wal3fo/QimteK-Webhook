import { PagesFunction } from '@cloudflare/workers-types';
import { comparePassword, hashPassword, verifyToken } from '../../../api/utils/auth';
import { supabase } from '../../../api/lib/supabase';
import { envContext } from '../../../api/lib/context';

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

      const { currentPassword, newPassword } = await context.request.json() as any;

      if (!currentPassword || !newPassword) {
        return new Response(JSON.stringify({ success: false, error: 'Current and new password are required' }), { status: 400 });
      }

      if (newPassword.length < 6) {
        return new Response(JSON.stringify({ success: false, error: 'New password must be at least 6 characters' }), { status: 400 });
      }

      const { data: dbUser, error } = await supabase
        .from('users')
        .select('id, password_hash')
        .eq('id', user.id)
        .single();

      if (error || !dbUser) {
        return new Response(JSON.stringify({ success: false, error: 'User not found' }), { status: 404 });
      }

      const isValidPassword = await comparePassword(currentPassword, dbUser.password_hash);
      if (!isValidPassword) {
        return new Response(JSON.stringify({ success: false, error: 'Incorrect current password' }), { status: 401 });
      }

      const newPasswordHash = await hashPassword(newPassword);

      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: newPasswordHash })
        .eq('id', user.id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({
        success: true,
        message: 'Password changed successfully',
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
      console.error('Error changing password:', error);
      return new Response(JSON.stringify({ success: false, error: 'Failed to change password' }), { status: 500 });
    }
  });
};
