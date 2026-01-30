import { signJwt } from '../../utils/jwt';
import { getSupabase } from '../../utils/supabase';
import bcrypt from 'bcryptjs';

export const onRequestPost = async (context: any) => {
    try {
        const { request, env } = context;
        const body = await request.json();
        const { email, password } = body;

        // Validate input
        if (!email || !password) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Email and password are required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid email format'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate password length
        if (password.length < 6) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Password must be at least 6 characters'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const supabase = getSupabase(env);
        const normalizedEmail = email.toLowerCase();

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('email')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (existingUser) {
            return new Response(JSON.stringify({
                success: false,
                error: 'User already exists'
            }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const userId = crypto.randomUUID();
        const { data: user, error } = await supabase
            .from('users')
            .insert({
                id: userId,
                email: normalizedEmail,
                password_hash: passwordHash,
                role: 'user', // Default role
                is_verified: true,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating user:', error);
            return new Response(JSON.stringify({
                success: false,
                error: 'Failed to create user'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Generate token
        const jwtSecret = env.JWT_SECRET || 'your-secret-key-change-in-production';
        const expiresIn = 604800; // 7 days

        const token = await signJwt({
            id: userId,
            email: normalizedEmail,
            role: 'user'
        }, jwtSecret, expiresIn);

        return new Response(JSON.stringify({
            success: true,
            token,
            user: {
                id: userId,
                email: normalizedEmail,
                role: 'user'
            }
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        console.error('Register error:', e);
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
