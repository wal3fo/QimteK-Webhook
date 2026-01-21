import path from 'path';
import jsonDb from './db-json.js';
import { getSupabaseDb } from './db-supabase.js';

// Database adapter interface
interface DatabaseAdapter {
  prepare(sql: string): {
    run: (...params: any[]) => { changes: number } | Promise<{ changes: number }>;
    get: (...params: any[]) => any | Promise<any>;
    all: (...params: any[]) => any[] | Promise<any[]>;
  };
  exec(sql: string): void | Promise<void>;
  pragma(setting: string): void;
}

let db: DatabaseAdapter | null = null;

export async function initDb() {
  // Check if we're in production (Vercel) and have Supabase credentials
  const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  const hasSupabase = process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Use Supabase in production if credentials are available
  if (isProduction && hasSupabase) {
    try {
      db = getSupabaseDb();
      console.log('Using Supabase PostgreSQL database');
      return;
    } catch (error) {
      console.error('Failed to initialize Supabase, falling back to local storage:', error);
    }
  }

  // Try better-sqlite3 for local development
  try {
    const Database = (await import('better-sqlite3')).default;
    const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'webhook.db');
    const sqliteDb = new Database(dbPath);
    sqliteDb.pragma('foreign_keys = ON');
    db = sqliteDb;
    console.log('Using better-sqlite3 database');
    
    // Create schema for SQLite
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

    (db as any).exec(schema);
    console.log('Database initialized successfully');
    return;
  } catch (error: any) {
    console.log('better-sqlite3 not available, using JSON database fallback');
  }

  // Fallback to JSON database
  db = jsonDb;
  console.log('Using JSON database fallback');
  
  // Create schema for JSON database
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

  (db as any).exec(schema);
  console.log('Database initialized successfully');
}

// Helper function to handle async database operations
export async function dbRun(sql: string, ...params: any[]): Promise<{ changes: number }> {
  if (!db) {
    await initDb();
  }
  const result = (db as any).prepare(sql).run(...params);
  return result instanceof Promise ? await result : result;
}

export async function dbGet(sql: string, ...params: any[]): Promise<any> {
  if (!db) {
    await initDb();
  }
  const result = (db as any).prepare(sql).get(...params);
  return result instanceof Promise ? await result : result;
}

export async function dbAll(sql: string, ...params: any[]): Promise<any[]> {
  if (!db) {
    await initDb();
  }
  const result = (db as any).prepare(sql).all(...params);
  return result instanceof Promise ? await result : result;
}

export default db;
