import { verifyJwt } from '../../../utils/jwt';
import { getSupabase } from '../../../utils/supabase';

// GET /api/webhooks/[token]/requests - Get all requests for a webhook
export const onRequestGet = async (context: any) => {
  try {
    const { params, env, request } = context;
    const { token: webhookToken } = params;
    const url = new URL(request.url);

    // Safe parsing of limit and offset
    const limitParam = url.searchParams.get('limit');
    const offsetParam = url.searchParams.get('offset');
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam), 1), 100) : 100;
    const offset = offsetParam ? Math.max(parseInt(offsetParam), 0) : 0;

    const summary = url.searchParams.get('summary') === 'true';

    // Auth Check (Optional: If you want to enforce ownership)
    const authHeader = request.headers.get('Authorization');
    let userId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const jwtSecret = env.JWT_SECRET || 'your-secret-key-change-in-production';
      const user = await verifyJwt(token, jwtSecret);
      if (user) userId = user.id;
    }

    const supabase = getSupabase(env);

    // Verify webhook exists and is active
    let query = supabase
      .from('webhooks')
      .select('*')
      .eq('token', webhookToken)
      .eq('is_active', true);

    // If we have a user, ensure they own it (optional security hardening)
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: webhook, error: webhookError } = await query.maybeSingle();

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
      .range(offset, offset + limit - 1);

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
      total: count || 0,
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('Error fetching requests:', e);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal Server Error',
      details: e.message,
      stack: e.stack // Debugging aid
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
