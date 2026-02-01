import { authenticate, hashPassword } from '../utils/auth';
import { createSupabaseClient } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  [key: string]: any;
}

export const onRequestGet = async (context: any) => {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const authResult = await authenticate(request, env);
  if (authResult instanceof Response) return authResult;
  const user = authResult;

  if (user.role !== 'Administrator') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Access denied'
    }), { status: 403, headers });
  }

  try {
    const supabase = createSupabaseClient(env);

    // Get users
    let query = supabase
      .from('users')
      .select('id, email, role, created_at, mfa_enabled, plan_expires_at')
      .order('created_at', { ascending: false });

    let { data: usersList, error: usersError } = await query;

    if (usersError && (usersError.code === '42703' || usersError.message.includes('column'))) {
      const retryQuery = supabase
        .from('users')
        .select('id, email, role, created_at')
        .order('created_at', { ascending: false });

      const retryResult = await retryQuery;
      usersList = retryResult.data as any[];
      usersError = retryResult.error;
    }

    if (usersError) throw usersError;

    // Get webhook counts
    let webhookCounts: Record<string, number> = {};
    try {
      const { data: webhooks } = await supabase
        .from('webhooks')
        .select('user_id')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());

      if (webhooks) {
        webhooks.forEach((wh: any) => {
          webhookCounts[wh.user_id] = (webhookCounts[wh.user_id] || 0) + 1;
        });
      }
    } catch (e) {
      console.warn('Failed to fetch webhook counts', e);
    }

    const users = (usersList || []).map((u: any) => ({
      ...u,
      webhook_count: webhookCounts[u.id] || 0
    }));

    return new Response(JSON.stringify({
      success: true,
      users
    }), { headers });

  } catch (error: any) {
    console.error('Error fetching users:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch users'
    }), { status: 500, headers });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const authResult = await authenticate(request, env);
  if (authResult instanceof Response) return authResult;
  const adminUser = authResult;

  if (adminUser.role !== 'Administrator') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Access denied'
    }), { status: 403, headers });
  }

  try {
    const { email, password, role = 'user' } = await request.json() as any;

    if (!email || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email and password are required'
      }), { status: 400, headers });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Password must be at least 6 characters'
      }), { status: 400, headers });
    }

    const supabase = createSupabaseClient(env);
    const normalizedEmail = email.toLowerCase();

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUser) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User with this email already exists'
      }), { status: 409, headers });
    }

    const passwordHash = await hashPassword(password);
    const userId = uuidv4();

    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: normalizedEmail,
        password_hash: passwordHash,
        role,
        is_verified: true,
        created_at: new Date().toISOString()
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: userId,
        email: normalizedEmail,
        role,
        created_at: new Date().toISOString()
      }
    }), { status: 201, headers });

  } catch (error: any) {
    console.error('Error creating user:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create user'
    }), { status: 500, headers });
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
