import { PagesFunction } from '@cloudflare/workers-types';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { verify } from 'otplib';

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
      console.error('Missing environment variables in MFA Enable');
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

    const tokenStr = authHeader.split(' ')[1];
    let user: any;
    try {
      user = jwt.verify(tokenStr, jwtSecret);
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

    const { token, secret } = body;

    if (!token || !secret) {
      return new Response(JSON.stringify({ success: false, error: 'Token and secret are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Verify MFA Token
    let isValid = false;
    try {
      const result = verify({ token, secret });
      // verify might return object or boolean depending on version/config
      isValid = (typeof result === 'boolean') ? result : (result as any)?.valid === true;
    } catch (e) {
      console.error('MFA Verify Error:', e);
      isValid = false;
    }

    if (!isValid) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid MFA token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 5. Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    // 6. Update User
    const { error: updateError } = await supabase
      .from('users')
      .update({
        mfa_secret: secret,
        mfa_enabled: true
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('DB Update failed:', updateError);
      throw updateError;
    }

    // 7. Success Response
    return new Response(JSON.stringify({
      success: true,
      message: 'MFA enabled successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('MFA Enable Exception:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to enable MFA' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
