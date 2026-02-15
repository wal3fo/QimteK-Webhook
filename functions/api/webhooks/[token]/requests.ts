/**
 * Get requests for a webhook - cursor-based pagination
 * WHY: Stable pagination under high insert rates; efficient for large datasets
 */

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
      const rawLimit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
      const limit = Math.max(1, rawLimit);
      const summary = url.searchParams.get('summary') === 'true';
      const cursor = url.searchParams.get('cursor');

      const { data: webhook, error: webhookError } = await supabase
        .from('webhooks')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (webhookError || !webhook) {
        return new Response(JSON.stringify({ success: false, error: 'Webhook not found, expired, or access denied' }), { status: 404 });
      }

      let query = supabase
        .from('requests')
        .select('*')
        .eq('webhook_token', token)
        .order('timestamp', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit + 1);

      if (cursor) {
        try {
          const decoded = atob(cursor.replace(/-/g, '+').replace(/_/g, '/'));
          const [ts, id] = decoded.split('|');
          if (ts && id) {
            query = query.or(`timestamp.lt.${ts},and(timestamp.eq.${ts},id.lt.${id})`);
          }
        } catch {
          // ignore invalid cursor
        }
      }

      const { data: requests, error: requestsError } = await query;

      if (requestsError) throw requestsError;

      const hasMore = (requests?.length ?? 0) > limit;
      const slice = hasMore ? requests!.slice(0, limit) : (requests ?? []);
      const last = slice[slice.length - 1] as { timestamp: string; id: string } | undefined;
      const nextCursor = hasMore && last
        ? btoa(`${last.timestamp}|${last.id}`).replace(/\+/g, '-').replace(/\//g, '_')
        : null;

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

      const parsedRequests = slice.map((req: any) => {
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
        nextCursor,
        hasMore: !!nextCursor,
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
      console.error('Error fetching requests:', error);
      return new Response(JSON.stringify({ success: false, error: 'Failed to fetch requests' }), { status: 500 });
    }
  });
};
