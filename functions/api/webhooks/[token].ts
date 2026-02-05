
import { supabase } from '../../../api/lib/supabase';
import { verifyToken } from '../../../api/utils/auth';
import { envContext } from '../../../api/lib/context';

interface Env {
  [key: string]: string | undefined;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return envContext.run(context.env, async () => {
    try {
      const { token } = context.params;

      const { data: webhook, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (error || !webhook) {
        return new Response(JSON.stringify({ success: false, error: 'Webhook not found' }), { status: 404 });
      }

      const { count: requestCount } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('webhook_token', token);

      const { data: lastRequest } = await supabase
        .from('requests')
        .select('timestamp')
        .eq('webhook_token', token)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      return new Response(JSON.stringify({
        success: true,
        webhook: {
          token: webhook.token,
          name: webhook.name,
          created_at: webhook.created_at,
          expiresAt: webhook.expires_at,
          is_active: webhook.is_active,
          requestCount: requestCount || 0,
          lastActive: lastRequest?.timestamp || null,
        }
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
      console.error('Error fetching webhook details:', error);
      return new Response(JSON.stringify({ success: false, error: 'Failed to fetch webhook details' }), { status: 500 });
    }
  });
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
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

      const { token } = context.params;
      const { is_active } = await context.request.json() as any;

      if (typeof is_active !== 'boolean') {
        return new Response(JSON.stringify({ success: false, error: 'Invalid is_active value' }), { status: 400 });
      }

      const { error } = await supabase
        .from('webhooks')
        .update({ is_active })
        .eq('token', token)
        .eq('user_id', user.id);

      if (error) {
         console.error('Update error', error);
         return new Response(JSON.stringify({ success: false, error: 'Failed to update webhook' }), { status: 500 });
      }

      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error: any) {
      console.error('Error updating webhook:', error);
      return new Response(JSON.stringify({ success: false, error: 'Failed to update webhook' }), { status: 500 });
    }
  });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  return envContext.run(context.env, async () => {
    try {
      const { token } = context.params;
      let userId: string | null = null;

      const authHeader = context.request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const tokenStr = authHeader.substring(7);
        const user = verifyToken(tokenStr);
        if (user) userId = user.id;
      }

      const { data: webhook, error } = await supabase
        .from('webhooks')
        .select('*, users!inner(email)')
        .eq('token', token)
        .single();

      if (error || !webhook) {
        return new Response(JSON.stringify({ success: false, error: 'Webhook not found or access denied' }), { status: 404 });
      }

      const isOwner = userId && webhook.user_id === userId;

      if (!isOwner) {
        return new Response(JSON.stringify({ success: false, error: 'Access denied. Only the owner can delete this webhook.' }), { status: 403 });
      }

      const { error: deleteError } = await supabase
        .from('webhooks')
        .delete()
        .eq('token', token);

      if (deleteError) {
         return new Response(JSON.stringify({ success: false, error: 'Failed to delete webhook' }), { status: 500 });
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Webhook deleted successfully',
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
      console.error('Error deleting webhook:', error);
      return new Response(JSON.stringify({ success: false, error: 'Failed to delete webhook' }), { status: 500 });
    }
  });
};
