
import { authenticate, hashPassword } from '../utils/auth';
import { createSupabaseClient } from '../lib/supabase';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  [key: string]: any;
}

export const onRequestDelete = async (context: any) => {
  const { request, env, params } = context;
  const { id } = params;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const authResult = await authenticate(request, env);
  if (authResult instanceof Response) return authResult;
  const currentUser = authResult;

  if (currentUser.role !== 'Administrator') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Access denied'
    }), { status: 403, headers });
  }

  if (id === currentUser.id) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Cannot delete your own account'
    }), { status: 400, headers });
  }

  try {
    const supabase = createSupabaseClient(env);

    // 1. Get user's webhooks to clean up requests
    const { data: webhooks } = await supabase
      .from('webhooks')
      .select('token')
      .eq('user_id', id);

    if (webhooks && webhooks.length > 0) {
      const tokens = webhooks.map((w: any) => w.token);
      await supabase.from('requests').delete().in('webhook_token', tokens);
    }

    // 2. Delete webhooks
    await supabase.from('webhooks').delete().eq('user_id', id);

    // 3. Delete user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({
      success: true,
      message: 'User deleted successfully'
    }), { headers });

  } catch (error: any) {
    console.error('Error deleting user:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to delete user'
    }), { status: 500, headers });
  }
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const { id } = params as { id: string };

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const authResult = await authenticate(request, env);
  if (authResult instanceof Response) return authResult;
  const currentUser = authResult;

  if (currentUser.role !== 'Administrator') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Access denied'
    }), { status: 403, headers });
  }

  try {
    const { role, email, password } = await request.json() as any;

    if (role && id === currentUser.id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Cannot change your own role'
      }), { status: 400, headers });
    }

    const updates: any = {};

    if (role) {
      if (!['Administrator', 'Professional', 'user'].includes(role)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid role'
        }), { status: 400, headers });
      }
      updates.role = role;
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid email format'
        }), { status: 400, headers });
      }
      updates.email = email.toLowerCase();
    }

    if (password) {
      if (password.length < 6) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Password must be at least 6 characters'
        }), { status: 400, headers });
      }
      updates.password_hash = await hashPassword(password);
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No updates provided'
      }), { status: 400, headers });
    }

    const supabase = createSupabaseClient(env);
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      message: 'User updated successfully'
    }), { headers });

  } catch (error: any) {
    console.error('Error updating user:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to update user'
    }), { status: 500, headers });
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
