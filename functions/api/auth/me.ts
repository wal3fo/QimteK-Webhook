
import { supabase } from '../../../api/lib/supabase';
import { verifyToken } from '../../../api/utils/auth';
import { envContext } from '../../../api/lib/context';

interface Env {
  [key: string]: string | undefined;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return envContext.run(context.env, async () => {
    try {
      const authHeader = context.request.headers.get('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ success: false, error: 'No token provided' }), { status: 401 });
      }

      const token = authHeader.substring(7);
      const user = verifyToken(token);

      if (!user) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid or expired token' }), { status: 401 });
      }

      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !dbUser) {
        return new Response(JSON.stringify({ success: false, error: 'User not found' }), { status: 404 });
      }

      return new Response(JSON.stringify({
        success: true,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role,
          created_at: dbUser.created_at,
          mfa_enabled: !!dbUser.mfa_enabled,
          plan_expires_at: dbUser.plan_expires_at
        },
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
      console.error('Error fetching user:', error);
      return new Response(JSON.stringify({ success: false, error: 'Failed to fetch user' }), { status: 500 });
    }
  });
};
