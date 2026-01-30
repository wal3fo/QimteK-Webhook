import { signJwt } from '../../utils/jwt';
import { getSupabase } from '../../utils/supabase';
import * as bcrypt from 'bcryptjs';

// Login
export const onRequestPost = async (context: any) => {
    try {
        const { request, env } = context;
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return new Response(JSON.stringify({ success: false, error: 'Email and password are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const supabase = getSupabase(env);

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (error || !user) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid email or password' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid email or password' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        // Generate token
        const jwtSecret = env.JWT_SECRET || 'your-secret-key-change-in-production';
        // Parse duration string (e.g. "7d") to seconds or just use a default
        const expiresIn = 604800; // 7 days in seconds

        const token = await signJwt({
            id: user.id,
            email: user.email,
            role: user.role
        }, jwtSecret, expiresIn);

        return new Response(JSON.stringify({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                mfa_enabled: !!user.mfa_enabled
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        console.error('Login error:', e);
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
