import { getSupabase } from '../../../utils/supabase';

// GET /api/webhooks/[token]/requests - Get all requests for a webhook
export const onRequestGet = async (context: any) => {
  try {
    const { params, env, request } = context;
    const { token: webhookToken } = params;
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '100';
    const offset = url.searchParams.get('offset') || '0';
    const summary = url.searchParams.get('summary') || 'false';

    const supabase = getSupabase(env);

    // Verify webhook exists and is active
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('token', webhookToken)
      .eq('is_active', true)
      .maybeSingle();

    if (webhookError || !webhook) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Webhook not found, expired, or access denied'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get requests, sorted newest first
    const { data: requests, error: requestsError } = await supabase
      .from('requests')
      .select('*')
      .eq('webhook_token', webhookToken)
      .order('timestamp', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (requestsError) throw requestsError;

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('webhook_token', webhookToken);

    if (countError) throw countError;

    // Parse JSON fields helper
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
      const isSummary = summary === 'true';
      const bodySize = req.body ? (typeof req.body === 'string' ? req.body.length : JSON.stringify(req.body).length) : 0;

      return {
        id: req.id,
        webhook_token: req.webhook_token,
        method: req.method,
        url: req.url,
        headers: isSummary ? null : parseJsonField(req.headers),
        body: isSummary ? null : parseJsonField(req.body),
        query: isSummary ? null : parseJsonField(req.query),
        timestamp: req.timestamp,
        ip_address: req.ip_address,
        size: bodySize
      };
    });

    return new Response(JSON.stringify({
      success: true,
      requests: parsedRequests,
      total: count || 0,
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('Error fetching requests:', e);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal Server Error',
      details: e.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
