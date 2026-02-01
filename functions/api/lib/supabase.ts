import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient(env: any) {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials');
    }

    return createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}
