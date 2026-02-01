import { authenticate } from '../utils/auth';
import { createSupabaseClient } from '../lib/supabase';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  [key: string]: any;
}

export const onRequestGet = async (context: any) => {
  const { request, env, params } = context;
  const { token } = params;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // Since it's a GET, we could allow public access if that's the intention,
  // but the Express route didn't have `authenticate` middleware on `router.get('/:token')`.
  // However, usually details are private or protected.
  // The Express code: router.get('/:token', async ...) -> NO authenticate middleware.
  // Comment says: "Public access allowed via token".
  // So we will NOT authenticate.

  try {
    const supabase = createSupabaseClient(env);

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (error || !webhook) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Webhook not found'
      }), { status: 404, headers });
    }

    const { count: requestCount } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('webhook_token', token);

    const { data: lastRequest } = await supabase
      .from('requests')
      .select('timestamp')
      .eq('webhook_token', token)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    return new Response(JSON.stringify({
      success: true,
      webhook: {
        token: webhook.token,
        name: webhook.name,
        created_at: webhook.created_at,
        expires_at: webhook.expires_at,
        is_active: webhook.is_active,
        requestCount: requestCount || 0,
        lastActive: lastRequest?.timestamp || null,
      }
    }), { headers });

  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch webhook details'
    }), { status: 500, headers });
  }
};

export const onRequestPatch = async (context: any) => {
  const { request, env, params } = context;
  const { token } = params;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const authResult = await authenticate(request, env);
  if (authResult instanceof Response) return authResult;
  const user = authResult;

  try {
    const { is_active } = await request.json();

    if (typeof is_active !== 'boolean') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid is_active value'
      }), { status: 400, headers });
    }

    const supabase = createSupabaseClient(env);
    const { error } = await supabase
      .from('webhooks')
      .update({ is_active })
      .eq('token', token)
      .eq('user_id', user.id);

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true
    }), { headers });

  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to update webhook'
    }), { status: 500, headers });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const { token } = params as { token: string };

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // Manual auth check since `authenticate` helper might return Response directly
  // But we can use the helper if we handle the response
  const authResult = await authenticate(request, env);
  if (authResult instanceof Response) return authResult;
  const user = authResult;

  try {
    const supabase = createSupabaseClient(env);

    // Check ownership
    const { data: webhook, error: fetchError } = await supabase
      .from('webhooks')
      .select('user_id')
      .eq('token', token)
      .single();

    if (fetchError || !webhook) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Webhook not found or access denied'
      }), { status: 404, headers });
    }

    if (webhook.user_id !== user.id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Access denied. Only the owner can delete this webhook.'
      }), { status: 403, headers });
    }

    // Delete
    const { error: deleteError } = await supabase
      .from('webhooks')
      .delete()
      .eq('token', token);

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook deleted successfully'
    }), { headers });

  } catch (error: any) {
    console.error('Error deleting webhook:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to delete webhook'
    }), { status: 500, headers });
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
