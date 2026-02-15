import { supabase } from './supabase.js';

let isInitialized = false;

export async function initializeDatabase(): Promise<void> {
  if (isInitialized) {
    return;
  }

  console.log('🔌 Initializing Database Connection...');

  const hasKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  if (!process.env.SUPABASE_URL || !hasKey) {
    console.error('❌ Supabase credentials missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in .env');
    throw new Error('Supabase credentials required');
  }

  try {
    // Verifies Supabase connectivity with a simple SELECT on an existing table
    const { error } = await supabase.from('users').select('id').limit(1).maybeSingle();

    if (error) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }

    console.log('✅ Supabase connected');
    isInitialized = true;
  } catch (error: any) {
    // Supabase failure must crash the app
    throw error;
  }
}
