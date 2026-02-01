import { authenticate } from '../utils/auth';
import { createSupabaseClient } from '../lib/supabase';

export const onRequestGet = async (context: any) => {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const authResult = await authenticate(request, env);
  if (authResult instanceof Response) return authResult;

  const user = authResult;

  // Fetch fresh user data
  const supabase = createSupabaseClient(env);
  const { data: dbUser, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !dbUser) {
    return new Response(JSON.stringify({
      success: false,
      error: 'User not found'
    }), { status: 404, headers });
  }

  return new Response(JSON.stringify({
    success: true,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      mfa_enabled: !!dbUser.mfa_enabled,
      plan_expires_at: dbUser.plan_expires_at,
      created_at: dbUser.created_at
    }
  }), { headers });
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
