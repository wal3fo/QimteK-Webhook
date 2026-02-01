
import { supabase } from '../../../../api/lib/supabase';
import { envContext } from '../../../../api/lib/context';

interface Env {
  [key: string]: string | undefined;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return envContext.run(context.env, async () => {
    try {
      const { id } = context.params;

      const { data: request, error } = await supabase
        .from('requests')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !request) {
        return new Response(JSON.stringify({ success: false, error: 'Request not found or access denied' }), { status: 404 });
      }

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
        },
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
      console.error('Error fetching request:', error);
      return new Response(JSON.stringify({ success: false, error: 'Failed to fetch request' }), { status: 500 });
    }
  });
};
