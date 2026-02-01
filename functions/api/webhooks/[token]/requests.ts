import { authenticate } from '../../utils/auth';
import { createSupabaseClient } from '../../lib/supabase';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  [key: string]: any;
}

export const onRequestGet = async (context: any) => {
  const { request, env, params } = context;
  const { token } = params;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const summary = url.searchParams.get('summary') === 'true';

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const supabase = createSupabaseClient(env);

    // Verify webhook exists
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('id')
      .eq('token', token)
      .maybeSingle();

    if (webhookError || !webhook) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Webhook not found, expired, or access denied'
      }), { status: 404, headers });
    }

    // Get requests
    const { data: requests, error: requestsError } = await supabase
      .from('requests')
      .select('*')
      .eq('webhook_token', token)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (requestsError) throw requestsError;

    // Get total count
    const { count, error: countError } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('webhook_token', token);

    if (countError) throw countError;

    // Parse JSON fields
    const parseJsonField = (field: string | object | null): any => {
      if (!field) return null;
      if (typeof field === 'object') return field;
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return field;
        }
      }
      return field;
    };

    const parsedRequests = (requests || []).map((req: any) => {
      const bodySize = req.body ? (typeof req.body === 'string' ? req.body.length : JSON.stringify(req.body).length) : 0;

      return {
        id: req.id,
        webhook_token: req.webhook_token,
        method: req.method,
        url: req.url,
        headers: summary ? null : parseJsonField(req.headers),
        body: summary ? null : parseJsonField(req.body),
        query: summary ? null : parseJsonField(req.query),
        timestamp: req.timestamp,
        ip_address: req.ip_address,
        size: bodySize
      };
    });

    return new Response(JSON.stringify({
      success: true,
      requests: parsedRequests,
      total: count || 0
    }), { headers });

  } catch (error: any) {
    console.error('Error fetching requests:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch requests'
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
        error: 'Webhook not found'
      }), { status: 404, headers });
    }

    if (webhook.user_id !== user.id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Access denied'
      }), { status: 403, headers });
    }

    // Delete requests
    const { error: deleteError } = await supabase
      .from('requests')
      .delete()
      .eq('webhook_token', token);

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({
      success: true,
      message: 'Requests cleared successfully'
    }), { headers });

  } catch (error: any) {
    console.error('Error clearing requests:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to clear requests'
    }), { status: 500, headers });
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
