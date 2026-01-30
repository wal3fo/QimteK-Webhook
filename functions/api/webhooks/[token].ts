import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../utils/jwt';

// Helper to initialize Supabase
function getSupabase(env: any) {
    return createClient(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        }
    );
}

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
