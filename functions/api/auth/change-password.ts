import { PagesFunction } from '@cloudflare/workers-types';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  JWT_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    // 1. Safe Environment Access
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_KEY;
    const jwtSecret = env.JWT_SECRET || 'your-secret-key-change-in-production';

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables in Change Password');
      return new Response(JSON.stringify({
        success: false,
        error: 'Server configuration error',
        debug: { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Validate Authentication (JWT)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.split(' ')[1];
    let user: any;
    try {
      user = jwt.verify(token, jwtSecret);
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Parse Body
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({ success: false, error: 'Current and new password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ success: false, error: 'New password must be at least 6 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    // 5. Verify Current Password
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('id', user.id)
      .single();

    if (userError || !dbUser) {
      return new Response(JSON.stringify({ success: false, error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, dbUser.password_hash);
    if (!isValidPassword) {
      return new Response(JSON.stringify({ success: false, error: 'Incorrect current password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 6. Update Password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', user.id);

    if (updateError) {
      console.error('DB Update failed:', updateError);
      throw updateError;
    }

    // 7. Success Response
    return new Response(JSON.stringify({
      success: true,
      message: 'Password changed successfully',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Change Password Exception:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to change password' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
