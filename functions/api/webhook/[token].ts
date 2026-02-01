
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../../api/lib/supabase';
import { envContext } from '../../../api/lib/context';

interface Env {
  [key: string]: string | undefined;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  return envContext.run(context.env, async () => {
    try {
      const { token } = context.params;

      if (!token || Array.isArray(token)) {
         return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), { status: 400 });
      }

      // Validate webhook exists and is active
      const { data: webhook, error: fetchError } = await supabase
        .from('webhooks')
        .select('*')
        .eq('token', token)
        .single();

      if (fetchError || !webhook) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Webhook not found',
        }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      if (!webhook.is_active) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Webhook is inactive',
        }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }

      // Generate unique request ID
      const requestId = uuidv4();

      // Extract request data
      const method = context.request.method;
      const url = context.request.url;
      
      const headers: Record<string, string> = {};
      context.request.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const parsedUrl = new URL(url);
      const query: Record<string, string> = {};
      parsedUrl.searchParams.forEach((value, key) => {
        query[key] = value;
      });

      // Parse body
      let rawBody: string = '';
      try {
        rawBody = await context.request.text();
      } catch (e) {
        console.error('Error reading body:', e);
        rawBody = '';
      }

      let body = null;
      if (rawBody) {
        try {
          // Try to parse JSON if content-type suggests it or just try
          body = JSON.parse(rawBody);
        } catch {
          // If not JSON, leave body as null (or store rawBody)
          // The original code sets body to null if parsing fails, but rawBody is preserved
        }
      }

      // Store in Supabase
      const { error: insertError } = await supabase
        .from('webhook_requests')
        .insert({
          id: requestId,
          webhook_id: webhook.id,
          method,
          url,
          headers,
          query,
          body,
          raw_body: rawBody,
          ip_address: context.request.headers.get('cf-connecting-ip') || context.request.headers.get('x-forwarded-for') || 'unknown',
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error storing webhook request:', insertError);
        // We still return 200 OK to the sender because the webhook was received, 
        // even if storage failed (though ideally we should ensure storage)
        // But for reliability to the sender, we might want to fail if we can't store?
        // Standard practice: if you can't process/store, return 500 so they retry.
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to store request'
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }

      // Update last_active_at
      await supabase
        .from('webhooks')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', webhook.id);

      return new Response(JSON.stringify({
        success: true,
        id: requestId,
        message: 'Webhook received successfully'
      }), { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' // Webhooks are often cross-origin
        } 
      });

    } catch (error: any) {
      console.error('Error processing webhook:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal Server Error'
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  });
};
