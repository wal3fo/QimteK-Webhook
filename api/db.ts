/**
 * Database module - Re-exports from the universal adapter
 * 
 * This file maintains backward compatibility while using the new
 * universal database adapter that supports Supabase, SQLite, and JSON.
 */

// Re-export everything from the adapter
export { initDb, ensureDb, dbRun, dbGet, dbAll, type DatabaseAdapter } from './db-adapter.js';
export { default } from './db-adapter.js';
