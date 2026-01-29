import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Ensure env vars are loaded
dotenv.config();

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

    // Initialize on first access
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY)?.trim();

    // If keys are missing, use placeholders to prevent crash during module load/init.
    // The actual calls will fail if keys are invalid.
    const url = supabaseUrl || 'https://placeholder.supabase.co';
    const key = supabaseKey || 'placeholder';

    if (!supabaseUrl || !supabaseKey) {
      // Only log in production/runtime if we are actually missing keys
      // preventing noise during build
      if (process.env.NODE_ENV !== 'test') {
        // console.warn(`[Supabase] Initializing with placeholder URL because env vars are missing. URL: ${url}`);
      }
    }

    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    // @ts-ignore
    return supabaseInstance[prop];
  }
});
