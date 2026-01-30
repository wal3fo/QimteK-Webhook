import { verifyJwt } from '../../utils/jwt';
import { getSupabase } from '../../utils/supabase';

// GET /api/webhooks/[token] - Get webhook info
export const onRequestGet = async (context: any) => {
    try {
        const { params, env } = context;
        const { token: webhookToken } = params;

        const supabase = getSupabase(env);

        // Public access allowed via token (as per Express implementation)
        const { data: webhook, error } = await supabase
            .from('webhooks')
            .select('*')
            .eq('token', webhookToken)
            .eq('is_active', true)
            .maybeSingle();

        if (error || !webhook) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Webhook not found, expired, or access denied'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            webhook: {
                token: webhook.token,
                created_at: webhook.created_at,
                expires_at: webhook.expires_at,
                is_active: webhook.is_active,
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
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

// PATCH /api/webhooks/[token] - Update status
export const onRequestPatch = async (context: any) => {
    try {
        const { request, env, params } = context;
        const { token: webhookToken } = params;

        // Auth
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

        const body = await request.json();
        const { is_active } = body;

        if (typeof is_active !== 'boolean') {
            return new Response(JSON.stringify({ success: false, error: 'Invalid is_active value' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const supabase = getSupabase(env);
        const { error } = await supabase
            .from('webhooks')
            .update({ is_active })
            .eq('token', webhookToken)
            .eq('user_id', user.id);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Internal Server Error',
            details: e.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

// DELETE /api/webhooks/[token] - Delete webhook
export const onRequestDelete = async (context: any) => {
    try {
        const { request, env, params } = context;
        const { token: webhookToken } = params;

        // Auth
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

        const supabase = getSupabase(env);
        const { error } = await supabase
            .from('webhooks')
            .delete()
            .eq('token', webhookToken)
            .eq('user_id', user.id);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Internal Server Error',
            details: e.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
