/**
 * Universal Database Adapter
 * 
 * This adapter provides a unified interface for database operations that works with:
 * - Supabase PostgreSQL (production/Vercel) - REQUIRED
 * - SQLite (local development only)
 * - JSON file storage (local development fallback only)
 * 
 * IMPORTANT: In production/Vercel, Supabase is REQUIRED. JSON database will NOT work.
 * 
 * All database operations go through this adapter, making it easy to switch
 * between storage backends without changing application code.
 */

import path from 'path';
import jsonDb from './db-json.js';
import { getSupabaseDb } from './db-supabase.js';

export interface DatabaseAdapter {
  prepare(sql: string): {
    run: (...params: any[]) => { changes: number } | Promise<{ changes: number }>;
    get: (...params: any[]) => any | Promise<any>;
    all: (...params: any[]) => any[] | Promise<any[]>;
  };
  exec(sql: string): any;
  pragma(setting: string): any;
}

let db: DatabaseAdapter | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the database adapter
 * Automatically selects the best available storage backend
 */
export async function initDb(): Promise<void> {
  // Prevent multiple initializations
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    // Check if we're in production (Vercel)
    const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    const hasSupabase = process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

    // Priority 1: Use Supabase in production - REQUIRED, no fallback
    if (isProduction) {
      if (!hasSupabase) {
        throw new Error(
          'Supabase credentials are REQUIRED in production. ' +
          'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) environment variables.'
        );
      }
      try {
        db = getSupabaseDb();
        console.log('✅ Using Supabase PostgreSQL database (production)');
        return;
      } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        throw new Error(
          `Supabase initialization failed in production: ${error instanceof Error ? error.message : String(error)}. ` +
          'JSON database cannot be used in production/Vercel.'
        );
      }
    }

    // Priority 2: Try better-sqlite3 for local development (NOT in Vercel)
    // Skip SQLite in production/Vercel - use Supabase only
    if (!isProduction) {
      try {
        const Database = (await import('better-sqlite3')).default;
        // Only use DB_PATH in local dev, never in production
        const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'webhook.db');
        const sqliteDb = new Database(dbPath);
        sqliteDb.pragma('foreign_keys = ON');
        // Cast to DatabaseAdapter since SQLite Database implements the interface
        db = sqliteDb as unknown as DatabaseAdapter;
        console.log('✅ Using better-sqlite3 database (local development)');
        
        // Create schema for SQLite
        await createSchema(db);
        return;
      } catch (error: any) {
        console.log('⚠️  better-sqlite3 not available, using JSON database fallback');
      }
    }

    // Priority 3: Fallback to JSON database (local development only)
    // This will throw an error if called in production
    try {
      db = jsonDb;
      console.log('✅ Using JSON database fallback (local development)');
      await createSchema(db);
    } catch (error) {
      // If JSON database fails (e.g., in production), throw error
      throw new Error(
        `Database initialization failed: ${error instanceof Error ? error.message : String(error)}. ` +
        'In production, Supabase is required. In local development, ensure Supabase credentials are set or SQLite/JSON fallback is available.'
      );
    }
  })();

  return initPromise;
}

/**
 * Create database schema (tables and indexes)
 */
async function createSchema(database: DatabaseAdapter): Promise<void> {
  const schema = `
    CREATE TABLE IF NOT EXISTS webhooks (
      token TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      is_active BOOLEAN DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_webhooks_expires_at ON webhooks(expires_at);
    CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);

    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      webhook_token TEXT NOT NULL,
      method TEXT NOT NULL,
      url TEXT NOT NULL,
      headers JSON NOT NULL,
      body JSON,
      query JSON,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      FOREIGN KEY (webhook_token) REFERENCES webhooks(token) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_requests_webhook_token ON requests(webhook_token);
    CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_requests_method ON requests(method);
  `;

  const result = database.exec(schema);
  if (result instanceof Promise) {
    await result;
  }
  console.log('✅ Database schema initialized');
}

/**
 * Ensure database is initialized before use
 * This is critical for serverless functions where initialization might not happen before first request
 */
export async function ensureDb(): Promise<DatabaseAdapter> {
  if (!db) {
    await initDb();
  }
  if (!db) {
    throw new Error('Database initialization failed. Check your configuration and environment variables.');
  }
  return db;
}

/**
 * Helper function to safely execute database operations
 * Handles both sync (SQLite) and async (Supabase) operations
 */
export async function dbRun(sql: string, ...params: any[]): Promise<{ changes: number }> {
  const database = await ensureDb();
  const result = database.prepare(sql).run(...params);
  return result instanceof Promise ? await result : result;
}

export async function dbGet(sql: string, ...params: any[]): Promise<any> {
  const database = await ensureDb();
  const result = database.prepare(sql).get(...params);
  return result instanceof Promise ? await result : result;
}

export async function dbAll(sql: string, ...params: any[]): Promise<any[]> {
  const database = await ensureDb();
  const result = database.prepare(sql).all(...params);
  return result instanceof Promise ? await result : result;
}

export default db;
