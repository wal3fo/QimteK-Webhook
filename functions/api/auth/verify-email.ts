
import { createSupabaseClient } from '../lib/supabase';

export const onRequestGet = async (context: any) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (!token) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid verification token'
    }), { status: 400, headers });
  }

  const supabase = createSupabaseClient(env);

  try {
    // Find user with this token
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('verification_token', token)
      .maybeSingle();

    if (fetchError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid or expired verification token'
      }), { status: 400, headers });
    }

    // Check if token expired
    if (user.verification_token_expires_at && new Date(user.verification_token_expires_at) < new Date()) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Verification token has expired'
      }), { status: 400, headers });
    }

    // Update user status
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_verified: true,
        verification_token: null,
        verification_token_expires_at: null
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    // Redirect to login with success message
    const clientUrl = env.CLIENT_URL || 'http://localhost:5173';
    return Response.redirect(`${clientUrl}/login?verified=true`, 302);

  } catch (error: any) {
    console.error('Error verifying email:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to verify email'
    }), { status: 500, headers });
  }
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
