
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../../api/lib/supabase';
import { verifyToken } from '../../../api/utils/auth';
import { getPlans, type PlanConfig } from '../../../api/utils/plan-storage';
import { envContext } from '../../../api/lib/context';

interface Env {
  [key: string]: string | undefined;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
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

      const { expiresIn = 60, name, alias } = await context.request.json() as any;

      if (!name || !name.trim()) {
         return new Response(JSON.stringify({ success: false, error: 'Webhook name is required' }), { status: 400 });
      }

      const { count, error: countError } = await supabase
        .from('webhooks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (countError) {
        console.error('Count query failed', countError);
        return new Response(JSON.stringify({ success: false, error: 'Database query failed' }), { status: 500 });
      }

      const currentCount = count || 0;
      const plans = await getPlans();
      const userRole = user.role as keyof PlanConfig;
      const plan = plans[userRole] || plans.user;
      const limit = plan.maxWebhooks;

      if (currentCount >= limit) {
         return new Response(JSON.stringify({ success: false, error: `Webhook limit reached. You can only have ${limit} active webhook(s).` }), { status: 403 });
      }

      let webhookToken = uuidv4().replace(/-/g, '');

      if (alias && alias.trim()) {
        if (!plan.features.customAliases) {
           return new Response(JSON.stringify({ success: false, error: 'Custom aliases are available only on Professional plan' }), { status: 403 });
        }

        const cleanAlias = alias.trim();
        const aliasRegex = /^[a-zA-Z0-9_-]{3,50}$/;
        if (!aliasRegex.test(cleanAlias)) {
           return new Response(JSON.stringify({ success: false, error: 'Invalid alias format. Use 3-50 alphanumeric characters, hyphens, or underscores.' }), { status: 400 });
        }

        const { data: existing, error: checkError } = await supabase
          .from('webhooks')
          .select('token')
          .eq('token', cleanAlias)
          .maybeSingle();

        if (checkError) {
           return new Response(JSON.stringify({ success: false, error: 'Error checking alias' }), { status: 500 });
        }

        if (existing) {
           return new Response(JSON.stringify({ success: false, error: 'Alias already taken' }), { status: 409 });
        }

        webhookToken = cleanAlias;
      }

      const expiresAt = new Date();
      if (plan.webhookExpirationHours > 0) {
        expiresAt.setHours(expiresAt.getHours() + plan.webhookExpirationHours);
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 100);
      }

      const parsedUrl = new URL(context.request.url);
      const baseUrl = context.env.BASE_URL || `${parsedUrl.protocol}//${parsedUrl.host}`;
      const webhookUrl = `${baseUrl}/api/webhook/${webhookToken}`;

      const { error: insertError } = await supabase
        .from('webhooks')
        .insert({
          token: webhookToken,
          user_id: user.id,
          name: name || null,
          expires_at: expiresAt.toISOString(),
          is_active: true
        });

      if (insertError) {
         console.error('Insert error', insertError);
         return new Response(JSON.stringify({ success: false, error: 'Failed to generate webhook' }), { status: 500 });
      }

      return new Response(JSON.stringify({
        success: true,
        token: webhookToken,
        name,
        url: webhookUrl,
        expiresAt: expiresAt.toISOString(),
      }), { status: 201, headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
      console.error('Error generating webhook:', error);
      return new Response(JSON.stringify({ success: false, error: 'Failed to generate webhook' }), { status: 500 });
    }
  });
};
