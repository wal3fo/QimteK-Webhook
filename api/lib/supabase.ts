import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from './context.js';
import dotenv from 'dotenv';

// Ensure env vars are loaded (only for local dev where fs is available)
// In Cloudflare, this is not needed and might crash if process is missing
try {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
    dotenv.config();
  }
} catch (e) {
  // Ignore dotenv errors
}

let supabaseInstance: SupabaseClient | null = null;

// Lazy initialization via Proxy to handle Cloudflare Pages environment
// where process.env is only populated during the request handler
export const supabase = new Proxy({} as SupabaseClient, {
  get: (target, prop) => {
    // If instance exists, return its property
    if (supabaseInstance) {
      // @ts-ignore
      return supabaseInstance[prop];
    }

    // Initialize on first access using safe env access
    const supabaseUrl = getEnv('SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_KEY');

    // If keys are missing, use placeholders to prevent crash during module load/init.
    // The actual calls will fail if keys are invalid.
    const url = supabaseUrl || 'https://placeholder.supabase.co';
    const key = supabaseKey || 'placeholder';

    if (!supabaseUrl || !supabaseKey) {
      // Only log in production/runtime if we are actually missing keys
      // preventing noise during build
    }

    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    // @ts-ignore
    const value = supabaseInstance[prop];
    if (typeof value === 'function') {
      return value.bind(supabaseInstance);
    }
    return value;
  }
});
