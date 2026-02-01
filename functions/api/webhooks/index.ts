import { authenticate } from '../utils/auth';
import { createSupabaseClient } from '../lib/supabase';

export const onRequestGet = async (context: any) => {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const authResult = await authenticate(request, env);
  if (authResult instanceof Response) return authResult;
  const user = authResult;

  try {
    const supabase = createSupabaseClient(env);
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('token, name, created_at, expires_at, is_active')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const requestUrl = new URL(request.url);
    const baseUrl = env.BASE_URL || requestUrl.origin;

    const webhooksWithStats = await Promise.all((webhooks || []).map(async (wh) => {
      const { count } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('webhook_token', wh.token);

      const { data: lastRequest } = await supabase
        .from('requests')
        .select('timestamp')
        .eq('webhook_token', wh.token)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        ...wh,
        url: `${baseUrl}/api/webhook/${wh.token}`,
        requestCount: count || 0,
        lastActive: lastRequest?.timestamp || null
      };
    }));

    return new Response(JSON.stringify({
      success: true,
      webhooks: webhooksWithStats
    }), { status: 200, headers });

  } catch (error: any) {
    console.error('Error fetching webhooks:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch webhooks'
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
