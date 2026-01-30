import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

/**
 * Native Cloudflare Pages Function for Login
 * Bypasses Express/Node.js dependencies to ensure compatibility with Workers Runtime.
 */

// Web Crypto compatible JWT Signing
async function signJwt(payload: any, secret: string) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        enc.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    
    // Default expiration: 7 days
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (7 * 24 * 60 * 60);
    
    const finalPayload = {
        ...payload,
        iat: now,
        exp: exp
    };

    const header = { alg: "HS256", typ: "JWT" };
    
    const base64Url = (input: string) => {
        return btoa(input)
            .replace(/=/g, "")
            .replace(/\+/g, "-")
            .replace(/\//g, "_");
    };

    const encodedHeader = base64Url(JSON.stringify(header));
    const encodedPayload = base64Url(JSON.stringify(finalPayload));
    
    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        enc.encode(`${encodedHeader}.${encodedPayload}`)
    );
    
    // Convert signature to string properly
    const signatureArray = Array.from(new Uint8Array(signature));
    const signatureString = signatureArray.map(b => String.fromCharCode(b)).join('');
    const encodedSignature = base64Url(signatureString);
    
    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

export const onRequestPost = async (context: any) => {
    try {
        const { request, env } = context;
        
        // 1. Parse JSON safely
        let body;
        try {
            body = await request.json();
        } catch (e) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Invalid JSON body' 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { email, password } = body;

        // 2. Validate input
        if (!email || !password) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Email and password are required' 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 3. Initialize Supabase with context.env (not process.env)
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
             console.error('Missing SUPABASE_URL or keys in environment variables');
             return new Response(JSON.stringify({ 
                success: false, 
                error: 'Server configuration error' 
            }), { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
             auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });

        // 4. Fetch User
        const { data: user, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (dbError) {
            console.error('Supabase error:', dbError);
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Database error' 
            }), { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!user) {
             return new Response(JSON.stringify({ 
                success: false, 
                error: 'Invalid credentials' 
            }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 5. Verify Password (using bcryptjs)
        const isValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isValid) {
             return new Response(JSON.stringify({ 
                success: false, 
                error: 'Invalid credentials' 
            }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 6. Generate JWT (using Web Crypto)
        const jwtSecret = env.JWT_SECRET || 'your-secret-key-change-in-production';
        const token = await signJwt({
            id: user.id,
            email: user.email,
            role: user.role || 'user'
        }, jwtSecret);

        // 7. Return Success
        return new Response(JSON.stringify({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        // 8. Catch-all Error Handling
        console.error('Login Worker Exception:', e);
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
