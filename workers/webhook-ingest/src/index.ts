/**
 * Async webhook ingestion Worker
 *
 * WHY: Returns 200 immediately after validation; DB insert happens in queue consumer.
 *     Prevents slow DB from blocking webhook senders.
 */

export interface Env {
  WEBHOOK_QUEUE: Queue;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface WebhookPayload {
  requestId: string;
  token: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  rawBody: string;
  ipAddress: string;
  timestamp: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/webhook\/([^/]+)\/?$/);
    if (!match) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid path' }), { status: 404 });
    }
    const token = match[1];

    // Validate webhook exists and is active (fast lookup)
    const whRes = await fetch(`${env.SUPABASE_URL}/rest/v1/webhooks?token=eq.${token}&select=token,is_active`, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    const webhooks = await whRes.json();
    if (!webhooks?.length || !webhooks[0].is_active) {
      return new Response(JSON.stringify({ success: false, error: 'Webhook not found or inactive' }), {
        status: webhooks?.length ? 403 : 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const requestId = crypto.randomUUID();
    let rawBody = '';
    try {
      rawBody = await request.text();
    } catch {
      rawBody = '';
    }
    let body: unknown = null;
    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = rawBody;
      }
    }

    const headers: Record<string, string> = {};
    request.headers.forEach((v, k) => { headers[k] = v; });

    const query: Record<string, string> = {};
    url.searchParams.forEach((v, k) => { query[k] = v; });

    const payload: WebhookPayload = {
      requestId,
      token,
      method: request.method,
      url: request.url,
      headers,
      query,
      body,
      rawBody,
      ipAddress: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown',
      timestamp: new Date().toISOString(),
    };

    await env.WEBHOOK_QUEUE.send(payload);

    return new Response(JSON.stringify({ success: true, id: requestId, message: 'Webhook received' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  },

  async queue(batch: MessageBatch<WebhookPayload>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        const p = msg.body;
        const res = await fetch(`${env.SUPABASE_URL}/rest/v1/requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            id: p.requestId,
            webhook_token: p.token,
            method: p.method,
            url: p.url,
            headers: p.headers,
            query: p.query,
            body: p.body,
            ip_address: p.ipAddress,
            timestamp: p.timestamp,
          }),
        });
        if (!res.ok) throw new Error(`Supabase: ${res.status}`);
        msg.ack();
      } catch (err) {
        console.error('Queue consumer error:', err);
        msg.retry();
      }
    }
  },
};
