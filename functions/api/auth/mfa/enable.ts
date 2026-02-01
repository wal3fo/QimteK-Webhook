
import { createSupabaseClient } from '../../lib/supabase';
import { authenticate, verifyMfaToken } from '../../utils/auth';

export const onRequestPost = async (context: any) => {
  const { request, env } = context;
  const authResult = await authenticate(request, env);
  if (authResult instanceof Response) return authResult;
  const user = authResult;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const { token, secret } = await request.json();

    if (!token || !secret) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Token and secret are required'
      }), { status: 400, headers });
    }

    const isValid = await verifyMfaToken(token, secret);
    if (!isValid) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid MFA token'
      }), { status: 400, headers });
    }

    const supabase = createSupabaseClient(env);
    const { error: updateError } = await supabase
      .from('users')
      .update({
        mfa_secret: secret,
        mfa_enabled: true
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({
      success: true,
      message: 'MFA enabled successfully'
    }), { status: 200, headers });

  } catch (error: any) {
    console.error('Error enabling MFA:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to enable MFA'
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
