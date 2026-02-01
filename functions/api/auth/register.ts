
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../../api/lib/supabase';
import { hashPassword, generateToken } from '../../../api/utils/auth';
import { envContext } from '../../../api/lib/context';

interface Env {
  [key: string]: string | undefined;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  return envContext.run(context.env, async () => {
    try {
      const { email, password } = await context.request.json() as any;

      if (!email || !password) {
        return new Response(JSON.stringify({ success: false, error: 'Email and password are required' }), { status: 400 });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
         return new Response(JSON.stringify({ success: false, error: 'Invalid email format' }), { status: 400 });
      }

      if (password.length < 6) {
         return new Response(JSON.stringify({ success: false, error: 'Password must be at least 6 characters' }), { status: 400 });
      }

      const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        return new Response(JSON.stringify({ success: false, error: 'User already exists' }), { status: 409 });
      }

      const passwordHash = await hashPassword(password);
      const userId = uuidv4();

      const { data: user, error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          password_hash: passwordHash,
          role: 'user',
          is_verified: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        return new Response(JSON.stringify({ success: false, error: 'Failed to create user' }), { status: 500 });
      }

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: 'user',
      });

      return new Response(JSON.stringify({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          mfa_enabled: false
        },
      }), { status: 201, headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
      console.error('Error registering user:', error);
      return new Response(JSON.stringify({ success: false, error: 'Failed to register' }), { status: 500 });
    }
  });
};
