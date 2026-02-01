import { createSupabaseClient } from '../../lib/supabase';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  [key: string]: any;
}

export const onRequestGet = async (context: any) => {
  const { env, params } = context;
  const { id } = params;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const supabase = createSupabaseClient(env);

    // Get request - no user check required (token/ID is the key)
    const { data: request, error } = await supabase
      .from('requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !request) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Request not found or access denied'
      }), { status: 404, headers });
    }

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

    return new Response(JSON.stringify({
      success: true,
      request: {
        id: request.id,
        webhook_token: request.webhook_token,
        method: request.method,
        url: request.url,
        headers: parseJsonField(request.headers),
        body: parseJsonField(request.body),
        query: parseJsonField(request.query),
        timestamp: request.timestamp,
        ip_address: request.ip_address,
      }
    }), { headers });

  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch request details'
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
