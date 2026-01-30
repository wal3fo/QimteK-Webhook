import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../utils/jwt';
import { getSupabase } from '../../utils/supabase';

// Plan Configuration (Sync with plans.ts)
const DEFAULT_PLAN_CONFIG = {
    user: {
        maxWebhooks: 3,
        webhookExpirationHours: 72,
        features: { customAliases: false }
    },
    Professional: {
        maxWebhooks: 10,
        webhookExpirationHours: 0,
        features: { customAliases: true }
    },
    Administrator: {
        maxWebhooks: 99999,
        webhookExpirationHours: 0,
        features: { customAliases: true }
    }
};

async function getPlans(supabase: any) {
    const { data } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'plan_config')
        .maybeSingle();

    return data?.value || DEFAULT_PLAN_CONFIG;
}

export const onRequestPost = async (context: any) => {
    try {
        const { request, env } = context;

        // 1. Auth Check
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        const token = authHeader.split(' ')[1];
        const jwtSecret = env.JWT_SECRET || 'your-secret-key-change-in-production';
        const user = await verifyJwt(token, jwtSecret);

        if (!user) {
            return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }

        // 2. Parse Body
        let body;
        try {
            body = await request.json();
        } catch {
            return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const { name, alias } = body;
        if (!name || !name.trim()) {
            return new Response(JSON.stringify({ success: false, error: 'Webhook name is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // 3. Check Limits
        const supabase = getSupabase(env);
        const { count, error: countError } = await supabase
            .from('webhooks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_active', true);

        if (countError) throw countError;

        const plans = await getPlans(supabase);
        const userRole = user.role || 'user';
        const plan = plans[userRole] || plans.user;
        const limit = plan.maxWebhooks;
        const currentCount = count || 0;

        if (currentCount >= limit) {
            return new Response(JSON.stringify({ success: false, error: `Webhook limit reached. Max: ${limit}` }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }

        // 4. Generate Token / Alias
        let webhookToken = crypto.randomUUID().replace(/-/g, '');

        if (alias && alias.trim()) {
            if (!plan.features.customAliases) {
                return new Response(JSON.stringify({ success: false, error: 'Custom aliases require Professional plan' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
            }

            const cleanAlias = alias.trim();
            if (!/^[a-zA-Z0-9_-]{3,50}$/.test(cleanAlias)) {
                return new Response(JSON.stringify({ success: false, error: 'Invalid alias format' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }

            // Check uniqueness
            const { data: existing } = await supabase.from('webhooks').select('token').eq('token', cleanAlias).maybeSingle();
            if (existing) {
                return new Response(JSON.stringify({ success: false, error: 'Alias already taken' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
            }
            webhookToken = cleanAlias;
        }

        // 5. Calculate Expiration
        const expiresAt = new Date();
        if (plan.webhookExpirationHours > 0) {
            expiresAt.setHours(expiresAt.getHours() + plan.webhookExpirationHours);
        } else {
            expiresAt.setFullYear(expiresAt.getFullYear() + 100);
        }

        // 6. Create Webhook
        const { error: insertError } = await supabase
            .from('webhooks')
            .insert({
                token: webhookToken,
                user_id: user.id,
                name: name,
                expires_at: expiresAt.toISOString(),
                is_active: true
            });

        if (insertError) throw insertError;

        const url = new URL(request.url);
        const baseUrl = env.BASE_URL || `${url.protocol}//${url.host}`;
        const webhookUrl = `${baseUrl}/api/webhook/${webhookToken}`;

        return new Response(JSON.stringify({
            success: true,
            token: webhookToken,
            name,
            url: webhookUrl,
            expiresAt: expiresAt.toISOString()
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        console.error('Generate Webhook Error:', e);
        return new Response(JSON.stringify({
            success: false,
            error: 'Internal Server Error',
            details: e.message,
            stack: e.stack
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
