import bcrypt from 'bcryptjs';
import { verifyJwt } from '../../utils/jwt';
import { getSupabase } from '../../utils/supabase';

// Helper for Auth Check
async function requireAdmin(request: Request, env: any) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { authorized: false, status: 401, error: 'Unauthorized' };
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = env.JWT_SECRET || 'your-secret-key-change-in-production';
    const requester = await verifyJwt(token, jwtSecret);

    if (!requester || requester.role !== 'Administrator') {
        return { authorized: false, status: 403, error: 'Forbidden' };
    }

    return { authorized: true, user: requester };
}

// DELETE /api/users/:id
export const onRequestDelete = async (context: any) => {
    try {
        const { request, env, params } = context;
        const id = params.id;

        const auth = await requireAdmin(request, env);
        if (!auth.authorized) {
            return new Response(JSON.stringify({ success: false, error: auth.error }), {
                status: auth.status as number,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (id === auth.user.id) {
            return new Response(JSON.stringify({ success: false, error: 'Cannot delete your own account' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const supabase = getSupabase(env);

        // 1. Get user's webhooks to clean up requests
        const { data: webhooks } = await supabase
            .from('webhooks')
            .select('token')
            .eq('user_id', id);
            
        if (webhooks && webhooks.length > 0) {
            const tokens = webhooks.map((w: any) => w.token);
            // 2. Delete requests for these webhooks
            await supabase.from('requests').delete().in('webhook_token', tokens);
        }

        // 3. Delete webhooks
        await supabase.from('webhooks').delete().eq('user_id', id);

        // 4. Delete user
        const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        return new Response(JSON.stringify({
            success: true,
            message: 'User deleted successfully'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        console.error('Delete User Error:', e);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to delete user',
            details: e.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

// PATCH /api/users/:id
export const onRequestPatch = async (context: any) => {
    try {
        const { request, env, params } = context;
        const id = params.id;
        
        const auth = await requireAdmin(request, env);
        if (!auth.authorized) {
            return new Response(JSON.stringify({ success: false, error: auth.error }), {
                status: auth.status as number,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const body = await request.json();
        const { role, email, password } = body;

        // Check if trying to update self role
        if (role && id === auth.user.id) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Cannot change your own role'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const updates: any = {};

        // Validate and add role
        if (role) {
            if (!['Administrator', 'Professional', 'user'].includes(role)) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Invalid role. Must be "Administrator", "Professional", or "user"'
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            updates.role = role;
        }

        // Validate and add email
        if (email) {
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
            updates.email = email.toLowerCase();
        }

        // Validate and add password
        if (password) {
            if (password.length < 6) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Password must be at least 6 characters'
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            updates.password_hash = await bcrypt.hash(password, 10);
        }

        if (Object.keys(updates).length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No updates provided'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const supabase = getSupabase(env);
        const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id);

        if (error) throw error;

        return new Response(JSON.stringify({
            success: true,
            message: 'User updated successfully'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        console.error('Update User Error:', e);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to update user',
            details: e.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
