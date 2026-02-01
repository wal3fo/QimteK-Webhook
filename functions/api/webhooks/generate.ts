import { authenticate } from '../utils/auth';
import { createSupabaseClient } from '../lib/supabase';
import { getPlans, type PlanConfig } from '../utils/plan-storage';
import { v4 as uuidv4 } from 'uuid';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  BASE_URL?: string;
  [key: string]: any;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const authResult = await authenticate(request, env);
  if (authResult instanceof Response) return authResult;
  const user = authResult;

  try {
    const { expiresIn = 60, name, alias } = await request.json() as any;

    if (!name || !name.trim()) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Webhook name is required'
      }), { status: 400, headers });
    }

    const supabase = createSupabaseClient(env);

    const { count, error: countError } = await supabase
      .from('webhooks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (countError) {
      throw new Error('Database query failed to return count');
    }

    const currentCount = count || 0;
    const plans = await getPlans(env);
    const userRole = user.role as keyof PlanConfig;
    const plan = plans[userRole] || plans.user;
    const limit = plan.maxWebhooks;

    if (currentCount >= limit) {
      return new Response(JSON.stringify({
        success: false,
        error: `Webhook limit reached. You can only have ${limit} active webhook(s).`
      }), { status: 403, headers });
    }

    let token = uuidv4().replace(/-/g, '');

    if (alias && alias.trim()) {
      if (!plan.features.customAliases) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Custom aliases are available only on Professional plan'
        }), { status: 403, headers });
      }

      const cleanAlias = alias.trim();
      const aliasRegex = /^[a-zA-Z0-9_-]{3,50}$/;
      if (!aliasRegex.test(cleanAlias)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid alias format. Use 3-50 alphanumeric characters, hyphens, or underscores.'
        }), { status: 400, headers });
      }

      const { data: existing, error: checkError } = await supabase
        .from('webhooks')
        .select('token')
        .eq('token', cleanAlias)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Alias already taken'
        }), { status: 409, headers });
      }

      token = cleanAlias;
    }

    const expiresAt = new Date();
    if (plan.webhookExpirationHours > 0) {
      expiresAt.setHours(expiresAt.getHours() + plan.webhookExpirationHours);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 100);
    }

    // Determine Base URL
    const requestUrl = new URL(request.url);
    const baseUrl = env.BASE_URL || requestUrl.origin;
    const webhookUrl = `${baseUrl}/api/webhook/${token}`;

    const { error: insertError } = await supabase
      .from('webhooks')
      .insert({
        token,
        user_id: user.id,
        name: name || null,
        expires_at: expiresAt.toISOString(),
        is_active: true
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({
      success: true,
      token,
      name,
      url: webhookUrl,
      expiresAt: expiresAt.toISOString(),
    }), { status: 201, headers });

  } catch (error: any) {
    console.error('Error generating webhook:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to generate webhook'
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
