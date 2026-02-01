import { PagesFunction } from '@cloudflare/workers-types';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JWT_SECRET: string;
}

const getSupabase = (env: Env) => {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY);
};

const verifyAdmin = (request: Request, env: Env) => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    if (decoded.role !== 'Administrator') {
      return null;
    }
    return decoded;
  } catch (e) {
    return null;
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const id = params.id as string;

  try {
    const currentUser = verifyAdmin(request, env);
    if (!currentUser) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
    }

    if (id === currentUser.id) {
      return new Response(JSON.stringify({ success: false, error: 'Cannot delete your own account' }), { status: 400 });
    }

    const supabase = getSupabase(env);

    // 1. Get user's webhooks
    const { data: webhooks } = await supabase
      .from('webhooks')
      .select('token')
      .eq('user_id', id);

    if (webhooks && webhooks.length > 0) {
      const tokens = webhooks.map(w => w.token);
      // 2. Delete requests
      await supabase.from('requests').delete().in('webhook_token', tokens);
    }

    // 3. Delete webhooks
    await supabase.from('webhooks').delete().eq('user_id', id);

    // 4. Delete user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true, message: 'User deleted successfully' }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: 'Failed to delete user', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const id = params.id as string;

  try {
    const currentUser = verifyAdmin(request, env);
    if (!currentUser) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
    }

    const body: any = await request.json();
    const { role, email, password } = body;

    if (role && id === currentUser.id) {
      return new Response(JSON.stringify({ success: false, error: 'Cannot change your own role' }), { status: 400 });
    }

    const updates: any = {};

    if (role) {
      if (!['Administrator', 'Professional', 'user'].includes(role)) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid role' }), { status: 400 });
      }
      updates.role = role;
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid email format' }), { status: 400 });
      }
      updates.email = email.toLowerCase();
    }

    if (password) {
      if (password.length < 6) {
        return new Response(JSON.stringify({ success: false, error: 'Password must be at least 6 characters' }), { status: 400 });
      }
      updates.password_hash = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No updates provided' }), { status: 400 });
    }

    const supabase = getSupabase(env);
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, message: 'User updated successfully' }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: 'Failed to update user', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
