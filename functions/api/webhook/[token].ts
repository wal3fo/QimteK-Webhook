import { createSupabaseClient } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const onRequest = async (context: any) => {
  const { request, env, params } = context;
  const { token } = params;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD',
        'Access-Control-Allow-Headers': '*',
      }
    });
  }

  try {
    const supabase = createSupabaseClient(env);

    // Validate webhook
    const { data: webhook, error: fetchError } = await supabase
      .from('webhooks')
      .select('id, is_active, secret, user_id') // Added secret and user_id
      .eq('token', token)
      .maybeSingle();

    if (fetchError || !webhook) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Webhook not found'
      }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    if (!webhook.is_active) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Webhook is inactive'
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    // Rate Limiting (using Supabase for now as KV is not bound)
    // Limit: 60 requests per minute per webhook
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count: recentRequests, error: rateError } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('webhook_token', token)
      .gt('timestamp', oneMinuteAgo);

    if (!rateError && recentRequests !== null && recentRequests >= 60) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Rate limit exceeded (60 requests/minute)'
      }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    }

    const requestId = uuidv4();
    const url = request.url;
    const method = request.method;
    const headers: Record<string, string> = {};
    request.headers.forEach((value: string, key: string) => {
      headers[key] = value;
    });

    // Extract query params
    const urlObj = new URL(url);
    const query: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    // Body handling
    let body = null;
    let rawBody = '';
    const contentType = headers['content-type'] || '';

    try {
      // We clone because we might read it multiple times
      rawBody = await request.text();

      // HMAC Verification
      if (webhook.secret) {
        const signature = headers['x-hub-signature-256'] || headers['x-signature'];
        if (!signature) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Missing signature header'
          }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(webhook.secret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['verify']
        );

        // Convert hex signature to ArrayBuffer
        // Expected format: "sha256=..." or just hex
        const hexSig = signature.startsWith('sha256=') ? signature.slice(7) : signature;
        const sigBuffer = new Uint8Array(hexSig.match(/[\da-f]{2}/gi)!.map((h: string) => parseInt(h, 16)));

        const isValid = await crypto.subtle.verify(
          'HMAC',
          key,
          sigBuffer,
          encoder.encode(rawBody)
        );

        if (!isValid) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Invalid signature'
          }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
      }

      if (rawBody && rawBody.length > 0) {
        if (contentType.includes('application/json')) {
          try {
            body = JSON.parse(rawBody);
          } catch {
            body = rawBody;
          }
        } else {
          body = rawBody;
        }
      }
    } catch (e) {
      console.error('Error reading/processing body:', e);
      body = null;
    }

    const ipAddress = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown';

    const { error: insertError } = await supabase
      .from('requests')
      .insert({
        id: requestId,
        webhook_token: token,
        method,
        url,
        headers,
        query,
        body,
        ip_address: ipAddress,
        timestamp: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error inserting request:', insertError);
      throw insertError;
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Request captured',
      id: requestId
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error: any) {
    console.error('Webhook receiver error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
