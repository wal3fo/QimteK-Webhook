import { PagesFunction } from '@cloudflare/workers-types';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_KEY?: string;
  JWT_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    // 1. Safe Environment Access
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY;
    const jwtSecret = env.JWT_SECRET;

    if (!supabaseUrl || !supabaseKey || !jwtSecret) {
      console.error('Missing environment variables in MFA Disable');
      return new Response(JSON.stringify({ success: false, error: 'Server configuration error' }), {
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
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Parse Body (Safely)
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      // Allow empty body
    }

    // 4. Initialize Supabase (Directly to avoid shared state issues)
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    // 5. Verify Password (only if provided in body)
    if (body.password) {
      const { data: dbUser, error: userError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', user.id)
        .single();

      if (!userError && dbUser) {
        const isValid = await bcrypt.compare(body.password, dbUser.password_hash);
        if (!isValid) {
          return new Response(JSON.stringify({ success: false, error: 'Invalid password' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // 6. Execute MFA Disable
    // Use user.id from token (secure) instead of body.userId
    const { error: updateError } = await supabase
      .from('users')
      .update({
        mfa_enabled: false,
        mfa_secret: null
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    // 7. Success Response
    return new Response(JSON.stringify({ success: true, message: 'MFA disabled successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('MFA Disable Exception:', error);
    return new Response(JSON.stringify({ success: false, error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
