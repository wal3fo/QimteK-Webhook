
import { createSupabaseClient } from '../lib/supabase';
import { authenticate, comparePassword, hashPassword } from '../utils/auth';

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
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Current and new password are required'
      }), { status: 400, headers });
    }

    if (newPassword.length < 6) {
      return new Response(JSON.stringify({
        success: false,
        error: 'New password must be at least 6 characters'
      }), { status: 400, headers });
    }

    const supabase = createSupabaseClient(env);

    // Get user with password hash
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('id', user.id)
      .single();

    if (error || !dbUser) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User not found'
      }), { status: 404, headers });
    }

    // Verify current password
    const isValidPassword = await comparePassword(currentPassword, dbUser.password_hash);
    if (!isValidPassword) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Incorrect current password'
      }), { status: 401, headers });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({
      success: true,
      message: 'Password changed successfully'
    }), { status: 200, headers });

  } catch (error: any) {
    console.error('Error changing password:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to change password'
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
