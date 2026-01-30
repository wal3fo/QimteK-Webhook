import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../utils/jwt';
import { getSupabase } from '../../utils/supabase';

export const onRequestGet = async (context: any) => {
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

        // 2. Fetch Webhooks
        const supabase = getSupabase(env);
        const { data: webhooks, error } = await supabase
            .from('webhooks')
            .select('token, name, created_at, expires_at, is_active')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 3. Enrich with Stats
        const url = new URL(request.url);
        const baseUrl = env.BASE_URL || `${url.protocol}//${url.host}`;

        const webhooksWithStats = await Promise.all((webhooks || []).map(async (wh: any) => {
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
                .maybeSingle();

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
            webhooks: webhooksWithStats
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        console.error('List Webhooks Error:', e);
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
