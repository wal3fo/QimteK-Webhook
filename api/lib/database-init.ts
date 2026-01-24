import { supabase } from './supabase.js';

let isInitialized = false;

export async function initializeDatabase(): Promise<void> {
  if (isInitialized) {
    return;
  }

  console.log('🔌 Initializing Database Connection...');

  if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_KEY)) {
    throw new Error('❌ Supabase configuration missing. Please check SUPABASE_URL and SUPABASE_ANON_KEY/SUPABASE_KEY in your environment variables.');
  }

  try {
    // 1. Validate connectivity with a lightweight query
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });

    if (error) {
      // If the error is about the table not existing, that's a different issue than connectivity
      // But for "initialize", we expect the schema to exist or we might want to check for it.
      // The prompt says: "Optionally checks for the existence of required tables... without creating them"
      throw new Error(`Supabase connection failed: ${error.message}`);
    }

    console.log('✅ Database connected successfully (Supabase)');
    isInitialized = true;
  } catch (error: any) {
    console.error('❌ Database initialization failed:', error.message);
    // Rethrow to prevent app startup
    throw error;
  }
}
