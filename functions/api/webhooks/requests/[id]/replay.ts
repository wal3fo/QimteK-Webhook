
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../../../../api/lib/supabase';
import { verifyToken } from '../../../../../api/utils/auth';
import { getPlans, type PlanConfig } from '../../../../../api/utils/plan-storage';
import { envContext } from '../../../../../api/lib/context';

interface Env {
  [key: string]: string | undefined;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  return envContext.run(context.env, async () => {
    try {
      const { id } = context.params;

      const authHeader = context.request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ success: false, error: 'No token provided' }), { status: 401 });
      }
      const tokenStr = authHeader.substring(7);
      const user = verifyToken(tokenStr);
      if (!user) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid or expired token' }), { status: 401 });
      }

      const plans = await getPlans();
      const userRole = user.role as keyof PlanConfig;
      const plan = plans[userRole] || plans.user;

      if (!plan.features.requestReplay) {
        return new Response(JSON.stringify({ success: false, error: 'Request Replay is available only on Professional plan' }), { status: 403 });
      }

      const { data: request, error } = await supabase
        .from('requests')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !request) {
        return new Response(JSON.stringify({ success: false, error: 'Request not found' }), { status: 404 });
      }

      const { data: webhook, error: webhookError } = await supabase
        .from('webhooks')
        .select('user_id')
        .eq('token', request.webhook_token)
        .single();

      if (webhookError || !webhook || webhook.user_id !== user.id) {
        return new Response(JSON.stringify({ success: false, error: 'Access denied' }), { status: 403 });
      }

      const newRequestId = uuidv4();
      const { error: insertError } = await supabase
        .from('requests')
        .insert({
          id: newRequestId,
          webhook_token: request.webhook_token,
          method: request.method,
          url: request.url,
          headers: request.headers,
          query: request.query,
          body: request.body,
          ip_address: 'REPLAY',
          timestamp: new Date().toISOString()
        });

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ success: true, newId: newRequestId }), { headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
      console.error('Replay error:', error);
      return new Response(JSON.stringify({ success: false, error: 'Failed to replay request' }), { status: 500 });
    }
  });
};
