/**
 * JSON-based database implementation (no native compilation required)
 * This is a fallback when better-sqlite3 cannot be compiled
 */
import fs from 'fs';
import path from 'path';

interface Webhook {
  token: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

interface Request {
  id: string;
  webhook_token: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: any;
  query: any;
  timestamp: string;
  ip_address: string | null;
}

interface Database {
  webhooks: Webhook[];
  requests: Request[];
}

// Only use JSON database in local development, never in production/Vercel
// In production, Supabase is used instead
function getDbPath(): string {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    throw new Error('JSON database cannot be used in production/Vercel. Use Supabase instead.');
  }
  return process.env.DB_PATH || path.join(process.cwd(), 'webhook-data.json');
}

// Initialize database file if it doesn't exist
function ensureDbFile(): void {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    const initialData: Database = {
      webhooks: [],
      requests: [],
    };
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

// Read database
function readDb(): Database {
  ensureDbFile();
  try {
    const dbPath = getDbPath();
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { webhooks: [], requests: [] };
  }
}

// Write database
function writeDb(data: Database): void {
  try {
    const dbPath = getDbPath();
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing database:', error);
    throw error;
  }
}

// Database interface matching better-sqlite3 API
class JsonDatabase {
  prepare(sql: string) {
    return {
      run: (...params: any[]) => {
        const db = readDb();
        let changes = 0;

        // Handle INSERT INTO webhooks
        if (sql.includes('INSERT INTO webhooks')) {
          const token = params[0];
          const expiresAt = params[1];
          const isActive = params[2] !== undefined ? params[2] : true;
          
          const webhook: Webhook = {
            token,
            created_at: new Date().toISOString(),
            expires_at: expiresAt,
            is_active: isActive,
          };
          
          db.webhooks.push(webhook);
          changes = 1;
        }
        // Handle INSERT INTO requests
        else if (sql.includes('INSERT INTO requests')) {
          const request: Request = {
            id: params[0],
            webhook_token: params[1],
            method: params[2],
            url: params[3],
            headers: typeof params[4] === 'string' ? JSON.parse(params[4]) : params[4],
            body: params[5] ? (typeof params[5] === 'string' ? JSON.parse(params[5]) : params[5]) : null,
            query: params[6] ? (typeof params[6] === 'string' ? JSON.parse(params[6]) : params[6]) : null,
            timestamp: params[7] || new Date().toISOString(),
            ip_address: params[8] || null,
          };
          
          db.requests.push(request);
          changes = 1;
        }
        // Handle DELETE FROM webhooks
        else if (sql.includes('DELETE FROM webhooks')) {
          const beforeCount = db.webhooks.length;
          
          if (sql.includes('WHERE token = ?')) {
            const token = params[0];
            db.webhooks = db.webhooks.filter(w => w.token !== token);
            // Also delete associated requests
            db.requests = db.requests.filter(r => r.webhook_token !== token);
          } else if (sql.includes('expires_at < datetime')) {
            const now = new Date().toISOString();
            db.webhooks = db.webhooks.filter(w => {
              const expired = w.expires_at < now || !w.is_active;
              if (expired) {
                // Delete associated requests
                db.requests = db.requests.filter(r => r.webhook_token !== w.token);
              }
              return !expired;
            });
          }
          
          changes = beforeCount - db.webhooks.length;
        }

        writeDb(db);
        return { changes };
      },
      get: (...params: any[]) => {
        const db = readDb();
        
        // Handle SELECT COUNT(*) FROM requests WHERE webhook_token = ?
        if (sql.includes('SELECT COUNT(*)') && sql.includes('requests') && sql.includes('webhook_token = ?')) {
          const token = params[0];
          const count = db.requests.filter(r => r.webhook_token === token).length;
          return { count };
        }
        
        // Handle SELECT FROM webhooks WHERE token = ?
        if (sql.includes('SELECT') && sql.includes('webhooks') && sql.includes('token = ?')) {
          const token = params[0];
          const webhook = db.webhooks.find(w => 
            w.token === token && 
            w.is_active && 
            new Date(w.expires_at) > new Date()
          );
          return webhook || undefined;
        }
        
        // Handle SELECT FROM requests WHERE id = ?
        if (sql.includes('SELECT') && sql.includes('requests') && sql.includes('id = ?')) {
          const id = params[0];
          const request = db.requests.find(r => r.id === id);
          if (!request) return undefined;
          
          // Convert to format expected by the code (stringify JSON fields)
          return {
            id: request.id,
            webhook_token: request.webhook_token,
            method: request.method,
            url: request.url,
            headers: typeof request.headers === 'string' ? request.headers : JSON.stringify(request.headers),
            body: request.body ? (typeof request.body === 'string' ? request.body : JSON.stringify(request.body)) : null,
            query: request.query ? (typeof request.query === 'string' ? request.query : JSON.stringify(request.query)) : null,
            timestamp: request.timestamp,
            ip_address: request.ip_address,
          };
        }
        
        return undefined;
      },
      all: (...params: any[]) => {
        const db = readDb();
        
        // Handle SELECT FROM requests WHERE webhook_token = ?
        if (sql.includes('SELECT') && sql.includes('requests') && sql.includes('webhook_token = ?')) {
          const token = params[0];
          const limit = params[1] || 100;
          const offset = params[2] || 0;
          
          let requests = db.requests
            .filter(r => r.webhook_token === token)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(offset, offset + limit);
          
          // Convert to format expected by the code
          return requests.map(req => ({
            id: req.id,
            webhook_token: req.webhook_token,
            method: req.method,
            url: req.url,
            headers: typeof req.headers === 'string' ? req.headers : JSON.stringify(req.headers),
            body: req.body ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : null,
            query: req.query ? (typeof req.query === 'string' ? req.query : JSON.stringify(req.query)) : null,
            timestamp: req.timestamp,
            ip_address: req.ip_address,
          }));
        }
        
        return [];
      },
    };
  }

  exec(sql: string): void {
    // Handle CREATE TABLE - just ensure db file exists
    if (sql.includes('CREATE TABLE')) {
      ensureDbFile();
    }
  }

  pragma(setting: string): void {
    // SQLite pragma - no-op for JSON database
  }
}

const db = new JsonDatabase();

export function initDb(): void {
  ensureDbFile();
  console.log('JSON database initialized successfully');
}

export default db;
