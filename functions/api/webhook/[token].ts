import { getSupabase } from '../../utils/supabase';

// Capture webhook request (ALL methods)
export const onRequest = async (context: any) => {
  try {
    const { request, env, params } = context;
    const { token } = params;

    // 1. Validate Webhook
    const supabase = getSupabase(env);
    
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (webhookError || !webhook) {
      return new Response(JSON.stringify({ success: false, error: 'Webhook not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!webhook.is_active) {
      return new Response(JSON.stringify({ success: false, error: 'Webhook is inactive' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Extract Data
    const method = request.method;
    const urlObj = new URL(request.url);
    const urlPath = urlObj.pathname; // Original path? No, this is the worker URL.
    // The original URL usually comes in headers if behind proxy, or we just store the current URL.
    // In Express: const url = req.originalUrl;
    // Here: request.url is the full URL including protocol and host.
    // We probably want to store the full URL or just the path.
    // Let's store the full URL for now.
    
    const query = Object.fromEntries(urlObj.searchParams);
    const headers = Object.fromEntries(request.headers);

    // IP Address
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';

    // 3. Parse Body
    let body: any = null;
    const contentType = request.headers.get('content-type') || '';
    
    try {
      if (contentType.includes('application/json')) {
        body = await request.json();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        body = Object.fromEntries(formData);
      } else {
        // Text or raw
        body = await request.text();
      }
    } catch (e) {
      // If parsing fails, try to get text
      try {
         body = await request.text();
      } catch {
         body = null;
      }
    }

    // 4. Insert Request
    const requestId = crypto.randomUUID();

    const { error: insertError } = await supabase
      .from('requests')
      .insert({
        id: requestId,
        webhook_token: token,
        method,
        url: request.url,
        headers,
        query,
        body,
        ip_address: ip,
        timestamp: new Date().toISOString()
      });

    if (insertError) {
      console.error('Insert Error:', insertError);
      throw insertError;
    }

    // 5. Success Response
    return new Response(JSON.stringify({
      success: true,
      message: 'Request captured',
      id: requestId
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' // Allow CORS for ingestion? Usually yes or check origin
      }
    });

  } catch (e: any) {
    console.error('Webhook Receiver Error:', e);
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
