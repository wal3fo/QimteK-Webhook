import { supabase } from './supabase.js';

let isInitialized = false;

export async function initializeDatabase(): Promise<void> {
  if (isInitialized) {
    return;
  }

  console.log('🔌 Initializing Database Connection...');

  if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_KEY)) {
    console.warn('⚠️ Supabase credentials missing. App will run in limited mode (offline/placeholder).');
    // Don't throw, just return. The Supabase proxy will handle the rest.
    // However, if we return here, isInitialized won't be set to true?
    // Let's set it to true so we don't retry unnecessarily.
    isInitialized = true;
    return;
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
