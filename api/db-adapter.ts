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
    const cwd = process.cwd();

    console.log('🔍 Database initialization starting...', {
      cwd,
      DB_PATH: process.env.DB_PATH,
    });

    // Priority 1: Try better-sqlite3 (works everywhere, preferred for local dev)
    try {
      const Database = (await import('better-sqlite3')).default;
      const dbPath = process.env.DB_PATH || path.join(cwd, 'webhook.db');
      console.log(`📦 Trying SQLite at: ${dbPath}`);
      const sqliteDb = new Database(dbPath);
      sqliteDb.pragma('foreign_keys = ON');
      db = sqliteDb as unknown as DatabaseAdapter;
      console.log('✅ Using better-sqlite3 database');
      await createSchema(db);
      // Initialize admin account after schema creation
      const { initAdminAccount } = await import('./utils/init-admin.js');
      await initAdminAccount();
      return;
    } catch (error: any) {
      console.log('⚠️  better-sqlite3 failed, trying JSON database fallback:', error.message);
    }

    // Priority 2: Fallback to JSON database (works everywhere)
    try {
      console.log('📦 Initializing JSON database...');
      // Import and initialize JSON database
      const { initDb: initJsonDb } = await import('./db-json.js');
      await initJsonDb();
      db = jsonDb;
      console.log('✅ Using JSON database');
      await createSchema(db);
      console.log('✅ Database schema created successfully');
      // Initialize admin account after schema creation
      const { initAdminAccount } = await import('./utils/init-admin.js');
      await initAdminAccount();
      return;
    } catch (error) {
      console.error('❌ JSON database initialization failed:', error);
      const errorDetails = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        cwd,
        dbPath: process.env.DB_PATH || 'webhook-data.json',
      };
      console.error('Error details:', errorDetails);
      // Fall through to throw error
    }

    // If all databases failed, throw error
    const dbPath = process.env.DB_PATH || 'webhook-data.json';

    const errorMsg = `Failed to initialize any database. ` +
      `SQLite (better-sqlite3) is not available, ` +
      `and JSON database initialization failed. ` +
      `Database path: ${dbPath} (cwd: ${cwd}). ` +
      `Please check file system permissions.`;

    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  })();

  return initPromise;
}

/**
 * Create database schema (tables and indexes)
 */
async function createSchema(database: DatabaseAdapter): Promise<void> {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

    CREATE TABLE IF NOT EXISTS webhooks (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
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

  // Migration: Add name column to webhooks if it doesn't exist
  try {
    const migration = database.prepare('ALTER TABLE webhooks ADD COLUMN name TEXT');
    const migrationResult = migration.run();
    if (migrationResult instanceof Promise) {
      await migrationResult;
    }
  } catch (error) {
    // Ignore error if column already exists
  }

  // Migration: Add mfa_secret and mfa_enabled to users
  try {
    const migration = database.prepare('ALTER TABLE users ADD COLUMN mfa_secret TEXT');
    const migrationResult = migration.run();
    if (migrationResult instanceof Promise) {
      await migrationResult;
    }
  } catch (error) {
    // Ignore error
  }

  try {
    const migration = database.prepare('ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT 0');
    const migrationResult = migration.run();
    if (migrationResult instanceof Promise) {
      await migrationResult;
    }
  } catch (error) {
    // Ignore error
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
