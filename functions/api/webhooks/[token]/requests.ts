
import { supabase } from '../../../../api/lib/supabase';
import { envContext } from '../../../../api/lib/context';

interface Env {
  [key: string]: string | undefined;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return envContext.run(context.env, async () => {
    try {
      const { token } = context.params;
      const url = new URL(context.request.url);
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const summary = url.searchParams.get('summary') === 'true';

      const { data: webhook, error: webhookError } = await supabase
        .from('webhooks')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (webhookError || !webhook) {
        return new Response(JSON.stringify({ success: false, error: 'Webhook not found, expired, or access denied' }), { status: 404 });
      }

      const { data: requests, error: requestsError } = await supabase
        .from('requests')
        .select('*')
        .eq('webhook_token', token)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (requestsError) throw requestsError;

      const { count, error: countError } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('webhook_token', token);

      if (countError) throw countError;

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

      const parsedRequests = (requests || []).map(req => {
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
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
      console.error('Error fetching requests:', error);
      return new Response(JSON.stringify({ success: false, error: 'Failed to fetch requests' }), { status: 500 });
    }
  });
};
