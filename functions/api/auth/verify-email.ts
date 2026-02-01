import { PagesFunction } from '@cloudflare/workers-types';
import { supabase } from '../../../api/lib/supabase';
import { envContext } from '../../../api/lib/context';

interface Env {
  [key: string]: string | undefined;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return envContext.run(context.env, async () => {
    try {
      const url = new URL(context.request.url);
      const token = url.searchParams.get('token');

      if (!token) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid verification token' }), { status: 400 });
      }

      // Find user with this token
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('verification_token', token)
        .maybeSingle();

      if (fetchError || !user) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid or expired verification token' }), { status: 400 });
      }

      // Check if token expired
      if (user.verification_token_expires_at && new Date(user.verification_token_expires_at) < new Date()) {
        return new Response(JSON.stringify({ success: false, error: 'Verification token has expired' }), { status: 400 });
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
      const clientUrl = context.env.CLIENT_URL || 'http://localhost:5173';
      return Response.redirect(`${clientUrl}/login?verified=true`, 302);

    } catch (error: any) {
      console.error('Error verifying email:', error);
      return new Response(JSON.stringify({ success: false, error: 'Failed to verify email' }), { status: 500 });
    }
  });
};
