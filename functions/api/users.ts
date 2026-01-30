import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { verifyJwt } from '../utils/jwt';

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
