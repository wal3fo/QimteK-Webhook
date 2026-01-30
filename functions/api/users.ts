import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { verifyJwt } from '../utils/jwt';
import { getSupabase } from '../utils/supabase';

// GET /api/users - List all users (Admin only)
export const onRequestGet = async (context: any) => {
    try {
        const { request, env } = context;

        // 1. Auth Check (Admin only)
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const token = authHeader.split(' ')[1];
        const jwtSecret = env.JWT_SECRET || 'your-secret-key-change-in-production';
        const requester = await verifyJwt(token, jwtSecret);

        if (!requester || requester.role !== 'Administrator') {
            return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. Fetch Users
        const supabase = getSupabase(env);

        // Try with mfa_enabled first
        let query = supabase
            .from('users')
            .select('id, email, role, created_at, mfa_enabled')
            .order('created_at', { ascending: false });

        let { data: usersList, error: usersError } = await query;

        // Fallback: If mfa_enabled column is missing
        if (usersError && (usersError.code === '42703' || usersError.message.includes('column'))) {
            const retryQuery = supabase
                .from('users')
                .select('id, email, role, created_at')
                .order('created_at', { ascending: false });

            const retryResult = await retryQuery;
            usersList = retryResult.data as any[];
            usersError = retryResult.error;
        }

        if (usersError) throw usersError;

        // 3. Get webhook counts
        let webhookCounts: Record<string, number> = {};
        try {
            const { data: webhooks } = await supabase
                .from('webhooks')
                .select('user_id')
                .eq('is_active', true)
                .gt('expires_at', new Date().toISOString());

            if (webhooks) {
                webhooks.forEach((wh: any) => {
                    webhookCounts[wh.user_id] = (webhookCounts[wh.user_id] || 0) + 1;
                });
            }
        } catch (e) {
            console.warn('Failed to fetch webhook counts:', e);
        }

        const users = (usersList || []).map((user: any) => ({
            ...user,
            webhook_count: webhookCounts[user.id] || 0
        }));

        return new Response(JSON.stringify({
            success: true,
            users
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        console.error('List Users Error:', e);
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

export const onRequestPost = async (context: any) => {
    try {
        const { request, env } = context;

        // 1. Auth Check (Admin only)
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const token = authHeader.split(' ')[1];
        const jwtSecret = env.JWT_SECRET || 'your-secret-key-change-in-production';
        const requester = await verifyJwt(token, jwtSecret);

        if (!requester || requester.role !== 'Administrator') {
            return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. Parse Body
        const body = await request.json();
        const { email, password, role = 'user' } = body;

        if (!email || !password) {
            return new Response(JSON.stringify({ success: false, error: 'Email and password required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (password.length < 6) {
            return new Response(JSON.stringify({ success: false, error: 'Password must be at least 6 characters' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 3. Check Existing User
        const supabase = getSupabase(env);
        const normalizedEmail = email.toLowerCase();

        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (existing) {
            return new Response(JSON.stringify({ success: false, error: 'User already exists' }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 4. Create User
        const passwordHash = await bcrypt.hash(password, 10);
        const userId = crypto.randomUUID(); // Native UUID

        const { error: insertError } = await supabase
            .from('users')
            .insert({
                id: userId,
                email: normalizedEmail,
                password_hash: passwordHash,
                role,
                is_verified: true,
                created_at: new Date().toISOString()
            });

        if (insertError) {
            console.error('Insert error:', insertError);
            throw new Error('Failed to create user in database');
        }

        return new Response(JSON.stringify({
            success: true,
            user: {
                id: userId,
                email: normalizedEmail,
                role,
                created_at: new Date().toISOString()
            }
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        console.error('Create User Error:', e);
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
