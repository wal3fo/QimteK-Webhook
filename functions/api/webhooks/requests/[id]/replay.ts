import { authenticate } from '../../../utils/auth';
import { createSupabaseClient } from '../../../lib/supabase';
import { getPlans, type PlanConfig } from '../../../utils/plan-storage';
import { v4 as uuidv4 } from 'uuid';

export const onRequestPost = async (context: any) => {
  const { request, env, params } = context;
  const { id } = params;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const authResult = await authenticate(request, env);
  if (authResult instanceof Response) return authResult;
  const user = authResult;

  try {
    const plans = await getPlans(env);
    const userRole = user.role as keyof PlanConfig;
    const plan = plans[userRole] || plans.user;

    if (!plan.features.requestReplay) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Request Replay is available only on Professional plan'
      }), { status: 403, headers });
    }

    const supabase = createSupabaseClient(env);
    const { data: originalRequest, error } = await supabase
      .from('requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !originalRequest) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Request not found'
      }), { status: 404, headers });
    }

    // Verify ownership
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('user_id')
      .eq('token', originalRequest.webhook_token)
      .single();

    if (webhookError || !webhook || webhook.user_id !== user.id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Access denied'
      }), { status: 403, headers });
    }

    const newRequestId = uuidv4();
    const { error: insertError } = await supabase
      .from('requests')
      .insert({
        id: newRequestId,
        webhook_token: originalRequest.webhook_token,
        method: originalRequest.method,
        url: originalRequest.url,
        headers: originalRequest.headers,
        query: originalRequest.query,
        body: originalRequest.body,
        ip_address: 'REPLAY',
        timestamp: new Date().toISOString()
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({
      success: true,
      newId: newRequestId
    }), { status: 200, headers });

  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to replay request'
    }), { status: 500, headers });
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
