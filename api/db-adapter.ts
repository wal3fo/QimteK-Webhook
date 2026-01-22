/**
 * Universal Database Adapter
 * 
 * This adapter provides a unified interface for database operations that works with:
 * - SQLite (preferred for local development)
 * - JSON file storage (fallback when SQLite not available)
 * 
 * Priority: SQLite → JSON
 * 
 * All database operations go through this adapter, making it easy to switch
 * between storage backends without changing application code.
 */

import path from 'path';
import jsonDb from './db-json.js';

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
    // Priority 1: Try better-sqlite3 (works everywhere, preferred for local dev)
    try {
      const Database = (await import('better-sqlite3')).default;
      // In serverless environments, use /tmp directory
      const isServerless = process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
      const dbPath = process.env.DB_PATH || (isServerless 
        ? '/tmp/webhook.db' 
        : path.join(process.cwd(), 'webhook.db'));
      const sqliteDb = new Database(dbPath);
      sqliteDb.pragma('foreign_keys = ON');
      // Cast to DatabaseAdapter since SQLite Database implements the interface
      db = sqliteDb as unknown as DatabaseAdapter;
      console.log('✅ Using better-sqlite3 database');
      
      // Create schema for SQLite
      await createSchema(db);
      return;
    } catch (error: any) {
      console.log('⚠️  better-sqlite3 not available, trying JSON database fallback');
    }

    // Priority 2: Fallback to JSON database (works everywhere)
    try {
      db = jsonDb;
      console.log('✅ Using JSON database');
      await createSchema(db);
      return;
    } catch (error) {
      console.error('⚠️  JSON database failed:', error);
      // Fall through to throw error
    }

    // If all databases failed, throw error
    throw new Error(
      'Failed to initialize any database. ' +
      'Please ensure SQLite (better-sqlite3) is available, or JSON database can be created.'
    );
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
 * Handles both sync (SQLite) and async operations
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
