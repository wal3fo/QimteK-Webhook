import bcrypt from 'bcryptjs';
import { verifyJwt } from '../../utils/jwt';
import { getSupabase } from '../../utils/supabase';

export const onRequestPost = async (context: any) => {
    try {
        const { request, env } = context;

        // 1. Auth Check
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Unauthorized'
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const token = authHeader.split(' ')[1];
        const jwtSecret = env.JWT_SECRET || 'your-secret-key-change-in-production';
        const user = await verifyJwt(token, jwtSecret);

        if (!user) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid or expired token'
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. Parse Body
        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Current and new password are required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (newPassword.length < 6) {
            return new Response(JSON.stringify({
                success: false,
                error: 'New password must be at least 6 characters'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const supabase = getSupabase(env);

        // 3. Get user with password hash
        const { data: dbUser, error } = await supabase
            .from('users')
            .select('id, password_hash')
            .eq('id', user.id)
            .single();

        if (error || !dbUser) {
            return new Response(JSON.stringify({
                success: false,
                error: 'User not found'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 4. Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, dbUser.password_hash);
        if (!isValidPassword) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Incorrect current password'
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 5. Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // 6. Update password
        const { error: updateError } = await supabase
            .from('users')
            .update({ password_hash: newPasswordHash })
            .eq('id', user.id);

        if (updateError) throw updateError;

        return new Response(JSON.stringify({
            success: true,
            message: 'Password changed successfully'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        console.error('Change Password Error:', e);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to change password',
            details: e.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
