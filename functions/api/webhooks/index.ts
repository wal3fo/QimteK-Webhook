
import { supabase } from '../../../api/lib/supabase';
import { verifyToken } from '../../../api/utils/auth';
import { envContext } from '../../../api/lib/context';

interface Env {
  [key: string]: string | undefined;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return envContext.run(context.env, async () => {
    try {
      const authHeader = context.request.headers.get('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ success: false, error: 'No token provided' }), { status: 401 });
      }

      const tokenStr = authHeader.substring(7);
      const user = verifyToken(tokenStr);

      if (!user) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid or expired token' }), { status: 401 });
      }

      const { data: webhooks, error } = await supabase
        .from('webhooks')
        .select('token, name, created_at, expires_at, is_active')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const parsedUrl = new URL(context.request.url);
      const baseUrl = context.env.BASE_URL || `${parsedUrl.protocol}//${parsedUrl.host}`;

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
          .maybeSingle(); // Changed from single() to maybeSingle() to avoid error if no requests

        return {
          token: wh.token,
          name: wh.name,
          url: `${baseUrl}/api/webhook/${wh.token}`,
          createdAt: wh.created_at,
          expiresAt: wh.expires_at,
          isActive: wh.is_active,
          requestCount: count || 0,
          lastActive: lastRequest?.timestamp || null,
        };
      }));

      return new Response(JSON.stringify({
        success: true,
        webhooks: webhooksWithStats,
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
      console.error('Error fetching webhooks:', error);
      return new Response(JSON.stringify({ success: false, error: 'Failed to fetch webhooks' }), { status: 500 });
    }
  });
};
