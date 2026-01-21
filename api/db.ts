import path from 'path';
import jsonDb from './db-json.js';

// Try to use better-sqlite3, fallback to JSON database if not available
let db: any = null;

// Try to load better-sqlite3, fallback to JSON if it fails
try {
  // Use dynamic import with immediate await in initDb
  // For now, we'll default to JSON and let initDb handle better-sqlite3 if available
  db = jsonDb;
  console.log('Using JSON database (better-sqlite3 will be tried in initDb)');
} catch (error) {
  db = jsonDb;
}

export async function initDb() {
  // Try better-sqlite3 first
  try {
    const Database = (await import('better-sqlite3')).default;
    const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'webhook.db');
    const sqliteDb = new Database(dbPath);
    sqliteDb.pragma('foreign_keys = ON');
    db = sqliteDb;
    console.log('Using better-sqlite3 database');
  } catch (error: any) {
    // Already using JSON database
    console.log('Using JSON database fallback');
  }
  
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

  db.exec(schema);
  console.log('Database initialized successfully');
}

export default db;
