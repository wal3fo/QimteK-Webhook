
import { createSupabaseClient } from '../lib/supabase';
import { hashPassword, generateToken } from '../utils/auth';
import { v4 as uuidv4 } from 'uuid';

export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email and password are required'
      }), { status: 400, headers });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid email format'
      }), { status: 400, headers });
    }

    // Validate password length
    if (password.length < 6) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Password must be at least 6 characters'
      }), { status: 400, headers });
    }

    const supabase = createSupabaseClient(env);
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
      }), { status: 409, headers });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = uuidv4();
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
      throw error;
    }

    // Generate token
    const token = await generateToken({
      id: user.id,
      email: user.email,
      role: 'user',
    }, env.JWT_SECRET || 'secret');

    return new Response(JSON.stringify({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        mfa_enabled: false
      }
    }), { status: 201, headers });

  } catch (error: any) {
    console.error('Error registering user:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to register'
    }), { status: 500, headers });
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
