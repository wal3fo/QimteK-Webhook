import { createClient } from '@supabase/supabase-js';

export function getSupabase(env: any) {
  if (!env) {
    throw new Error('Environment object is missing');
  }

  // Debugging: Log available keys (safely)
  // console.log('Env keys:', Object.keys(env));

  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_KEY || env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_KEY;

  if (!supabaseUrl) {
    console.error('SUPABASE_URL is missing in env');
    throw new Error('Configuration Error: SUPABASE_URL is missing. Please check Cloudflare Pages settings.');
  }

  if (!supabaseKey) {
    console.error('SUPABASE_KEY is missing in env');
    throw new Error('Configuration Error: SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY) is missing. Please check Cloudflare Pages settings.');
  }

  try {
    return createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );
  } catch (err: any) {
    throw new Error(`Failed to create Supabase client: ${err.message}`);
  }
}
