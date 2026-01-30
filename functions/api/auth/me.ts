import { verifyJwt } from '../../utils/jwt';
import { getSupabase } from '../../utils/supabase';

export const onRequestGet = async (context: any) => {
  try {
    const { request, env } = context;

    // Auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = env.JWT_SECRET || 'your-secret-key-change-in-production';
    const jwtUser = await verifyJwt(token, jwtSecret);

    if (!jwtUser) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const supabase = getSupabase(env);

    // Fetch full user details from DB
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', jwtUser.id)
      .single();

    if (error || !dbUser) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return user info
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        mfa_enabled: !!dbUser.mfa_enabled,
        created_at: dbUser.created_at,
        plan_expires_at: dbUser.plan_expires_at
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal Server Error',
      details: e.message,
      stack: e.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
