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

// JSON database works in all environments
function getDbPath(): string {
  // Use DB_PATH if explicitly set
  if (process.env.DB_PATH) {
    console.log(`✅ Using explicit DB_PATH: ${process.env.DB_PATH}`);
    return process.env.DB_PATH;
  }
  
  // In Netlify serverless functions, use /tmp directory
  // which is the only writable directory in serverless functions
  // Check multiple indicators of Netlify serverless environment
  const cwd = process.cwd();
  const isNetlifyServerless = 
    !!process.env.NETLIFY || 
    !!process.env.NETLIFY_DEV || // Netlify Dev
    cwd.startsWith('/var/task') || // Netlify Functions execution directory (most reliable)
    cwd.includes('netlify') || // Netlify-related paths
    !!process.env.AWS_LAMBDA_FUNCTION_NAME || // Netlify uses AWS Lambda under the hood
    !!process.env._HANDLER || // Lambda handler indicator
    (typeof process.env.LAMBDA_TASK_ROOT !== 'undefined'); // Lambda task root
  
  // Default to /tmp if we're in /var/task (Netlify Functions always run here)
  if (cwd.startsWith('/var/task')) {
    const tmpPath = '/tmp/webhook-data.json';
    console.log(`✅ Netlify Functions detected (cwd: ${cwd}) - Using: ${tmpPath}`);
    return tmpPath;
  }
  
  if (isNetlifyServerless) {
    const tmpPath = '/tmp/webhook-data.json';
    console.log(`✅ Netlify serverless detected - Using: ${tmpPath} (cwd: ${cwd})`);
    return tmpPath;
  }
  
  // For local development, use current working directory
  const localPath = path.join(cwd, 'webhook-data.json');
  console.log(`✅ Local development - Using: ${localPath} (cwd: ${cwd})`);
  return localPath;
}

// Initialize database file if it doesn't exist
function ensureDbFile(): void {
  const dbPath = getDbPath();
  try {
    // Ensure the directory exists (especially for /tmp)
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (!fs.existsSync(dbPath)) {
      const initialData: Database = {
        webhooks: [],
        requests: [],
      };
      fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2), 'utf8');
      console.log(`✅ Created database file at: ${dbPath}`);
    }
  } catch (error) {
    console.error(`❌ Failed to ensure database file at ${dbPath}:`, error);
    throw new Error(`Cannot create database file at ${dbPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Read database
function readDb(): Database {
  try {
    ensureDbFile();
    const dbPath = getDbPath();
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    // Return empty database if read fails
    return { webhooks: [], requests: [] };
  }
}

// Write database
function writeDb(data: Database): void {
  try {
    ensureDbFile(); // Ensure file exists before writing
    const dbPath = getDbPath();
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing database:', error);
    console.error('Database path:', getDbPath());
    throw new Error(`Failed to write database: ${error instanceof Error ? error.message : String(error)}`);
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

export async function initDb(): Promise<void> {
  try {
    ensureDbFile();
    console.log('JSON database initialized successfully');
  } catch (error) {
    console.error('Error initializing JSON database:', error);
    throw error;
  }
}

export default db;
