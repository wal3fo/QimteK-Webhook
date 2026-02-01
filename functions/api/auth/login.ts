import { createSupabaseClient } from '../lib/supabase';
import { comparePassword, generateToken, verifyMfaToken } from '../utils/auth';

export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const { email, password, mfa_token } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email and password are required'
      }), { status: 400, headers });
    }

    const supabase = createSupabaseClient(env);
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid email or password'
      }), { status: 401, headers });
    }

    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid email or password'
      }), { status: 401, headers });
    }

    if (user.mfa_enabled) {
      if (!mfa_token) {
        return new Response(JSON.stringify({
          success: false,
          error: 'MFA code required',
          mfa_required: true
        }), { status: 403, headers });
      }

      const isValidMfa = await verifyMfaToken(mfa_token, user.mfa_secret);
      if (!isValidMfa) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid MFA code'
        }), { status: 401, headers });
      }
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    }, env.JWT_SECRET || 'your-secret-key-change-in-production');

    return new Response(JSON.stringify({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        mfa_enabled: !!user.mfa_enabled,
        plan_expires_at: user.plan_expires_at
      }
    }), { headers });

  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to login',
      details: error.message
    }), { status: 500, headers });
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
