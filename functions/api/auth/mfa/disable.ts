
import { createSupabaseClient } from '../../lib/supabase';
import { authenticate, comparePassword } from '../../utils/auth';

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
    const { password } = await request.json();
    const supabase = createSupabaseClient(env);

    if (password) {
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', user.id)
        .single();

      if (error || !dbUser) {
        return new Response(JSON.stringify({
          success: false,
          error: 'User not found'
        }), { status: 404, headers });
      }

      const isValid = await comparePassword(password, dbUser.password_hash);
      if (!isValid) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid password'
        }), { status: 401, headers });
      }
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        mfa_secret: null,
        mfa_enabled: false
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({
      success: true,
      message: 'MFA disabled successfully'
    }), { status: 200, headers });

  } catch (error: any) {
    console.error('Error disabling MFA:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to disable MFA'
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
