import { PagesFunction } from '@cloudflare/workers-types';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '../../api/utils/auth';
import { envContext } from '../../api/lib/context';

interface Env {
  [key: string]: string | undefined;
}

const getSupabase = (env: Env) => {
  return createClient(env.SUPABASE_URL || '', env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY || '');
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return envContext.run(context.env, async () => {
    const { request, env } = context;

    try {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
      }

      const token = authHeader.split(' ')[1];
      const user = verifyToken(token);

      if (!user || user.role !== 'Administrator') {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const supabase = getSupabase(env);

      // Get all users
      let query = supabase
        .from('users')
        .select('id, email, role, created_at, mfa_enabled, plan_expires_at')
        .order('created_at', { ascending: false });

      let { data: usersList, error: usersError } = await query;

      // Fallback logic for missing columns
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
        const { data: webhooks, error: webhookError } = await supabase
          .from('webhooks')
          .select('user_id')
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString());

        if (!webhookError && webhooks) {
          webhooks.forEach(wh => {
            webhookCounts[wh.user_id] = (webhookCounts[wh.user_id] || 0) + 1;
          });
        }
      } catch (e) {
        // Ignore
      }

      const users = (usersList || []).map((user: any) => ({
        ...user,
        webhook_count: webhookCounts[user.id] || 0
      }));

      return new Response(JSON.stringify({ success: true, users }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: any) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch users',
        details: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  return envContext.run(context.env, async () => {
    const { request, env } = context;

    try {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
      }

      const token = authHeader.split(' ')[1];
      const user = verifyToken(token);

      if (!user || user.role !== 'Administrator') {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const body: any = await request.json();
      const { email, password, role = 'user' } = body;

      // Validate input
      if (!email || !password) {
        return new Response(JSON.stringify({ success: false, error: 'Email and password are required' }), { status: 400 });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid email format' }), { status: 400 });
      }

      if (password.length < 6) {
        return new Response(JSON.stringify({ success: false, error: 'Password must be at least 6 characters' }), { status: 400 });
      }

      if (!['user', 'Administrator', 'Professional'].includes(role)) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid role' }), { status: 400 });
      }

      const normalizedEmail = email.toLowerCase();
      const supabase = getSupabase(env);

      // Check existing
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalizedEmail)
        .single();

      if (existingUser) {
        return new Response(JSON.stringify({ success: false, error: 'User with this email already exists' }), { status: 409 });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
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
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: any) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create user',
        details: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });
};
