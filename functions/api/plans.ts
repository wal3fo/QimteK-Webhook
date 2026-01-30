import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../utils/jwt';
import { getSupabase } from '../utils/supabase';

// Default Plan Configuration
const DEFAULT_PLAN_CONFIG = {
    user: {
        displayName: 'Free',
        price: 0,
        description: 'Perfect for testing and small projects',
        maxWebhooks: 3,
        webhookExpirationHours: 72,
        retentionHours: 24,
        features: {
            customAliases: false,
            permanentHistory: false,
            advancedInspection: false,
            requestReplay: false,
            exportData: true,
            higherRateLimits: false,
            prioritySupport: false
        }
    },
    Professional: {
        displayName: 'Professional',
        price: 15,
        description: 'For developers and teams',
        maxWebhooks: 10,
        webhookExpirationHours: 0,
        retentionHours: 0,
        features: {
            customAliases: true,
            permanentHistory: true,
            advancedInspection: true,
            requestReplay: true,
            exportData: true,
            higherRateLimits: true,
            prioritySupport: true
        }
    },
    Administrator: {
        displayName: 'Administrator',
        price: 0,
        description: 'Full system access',
        maxWebhooks: 99999,
        webhookExpirationHours: 0,
        retentionHours: 0,
        features: {
            customAliases: true,
            permanentHistory: true,
            advancedInspection: true,
            requestReplay: true,
            exportData: true,
            higherRateLimits: true,
            prioritySupport: true
        }
    }
};

export const onRequestGet = async (context: any) => {
    try {
        const { env } = context;
        const supabase = getSupabase(env);

        // Fetch from DB
        const { data, error } = await supabase
            .from('system_config')
            .select('value')
            .eq('key', 'plan_config')
            .maybeSingle();

        if (error) {
            console.error('Failed to fetch plans:', error);
            // Don't crash, return defaults
        }

        const plans = data?.value || DEFAULT_PLAN_CONFIG;

        return new Response(JSON.stringify({
            success: true,
            data: plans
        }), {
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

export const onRequestPut = async (context: any) => {
    try {
        const { request, env } = context;
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const jwtSecret = env.JWT_SECRET || 'your-secret-key-change-in-production';
        const user = await verifyJwt(token, jwtSecret);

        if (!user || user.role !== 'Administrator') {
            return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403 });
        }

        const body = await request.json();

        if (!body || typeof body !== 'object') {
            return new Response(JSON.stringify({ success: false, error: 'Invalid data' }), { status: 400 });
        }

        const supabase = getSupabase(env);

        // Upsert config
        const { error } = await supabase
            .from('system_config')
            .upsert({
                key: 'plan_config',
                value: body,
                updated_at: new Date().toISOString()
            });

        if (error) {
            throw error;
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Plan configuration updated',
            data: body
        }), {
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
