/**
 * JSON-based database implementation (no native compilation required)
 * This is a fallback when better-sqlite3 cannot be compiled
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

interface Webhook {
  token: string;
  user_id: string;
  name?: string;
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

interface User {
  id: string;
  email: string;
  password_hash: string;
  role: 'Administrator' | 'Professional' | 'user';
  mfa_secret?: string;
  mfa_enabled?: boolean;
  is_verified?: boolean;
  verification_token?: string;
  verification_token_expires_at?: string;
  created_at: string;
}

interface Database {
  users: User[];
  webhooks: Webhook[];
  requests: Request[];
}

// JSON database works in all environments
function getDbPath(): string {
  const cwd = process.cwd();

  // Use DB_PATH if explicitly set
  if (process.env.DB_PATH) {
    console.log(`✅ Using explicit DB_PATH: ${process.env.DB_PATH}`);
    return process.env.DB_PATH;
  }

  // Try to load from .env if not set (fallback)
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      if (envConfig.DB_PATH) {
        console.log(`✅ Using DB_PATH from .env: ${envConfig.DB_PATH}`);
        return envConfig.DB_PATH;
      }
    }
  } catch (e) {
    // Ignore error
  }

  // For local development, use current working directory
  const localPath = path.join(cwd, 'webhook-data.json');
  console.log(`✅ Using database path: ${localPath} (cwd: ${cwd})`);
  return localPath;
}

// Initialize database file if it doesn't exist
function ensureDbFile(): void {
  const dbPath = getDbPath();
  console.log(`📁 Ensuring database file exists at: ${dbPath}`);
  try {
    // Ensure the directory exists (especially for /tmp)
    const dir = path.dirname(dbPath);
    console.log(`📁 Database directory: ${dir}`);

    if (!fs.existsSync(dir)) {
      console.log(`📁 Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Directory created: ${dir}`);
    } else {
      console.log(`✅ Directory exists: ${dir}`);
    }

    // Check if directory is writable
    try {
      fs.accessSync(dir, fs.constants.W_OK);
      console.log(`✅ Directory is writable: ${dir}`);
    } catch (accessError) {
      console.error(`❌ Directory is NOT writable: ${dir}`, accessError);
      throw new Error(`Directory ${dir} is not writable`);
    }

    if (!fs.existsSync(dbPath)) {
      console.log(`📝 Creating new database file: ${dbPath}`);
      const initialData: Database = {
        users: [],
        webhooks: [],
        requests: [],
      };
      fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2), 'utf8');
      console.log(`✅ Created database file at: ${dbPath}`);
    } else {
      console.log(`✅ Database file already exists: ${dbPath}`);
      // Migrate existing webhooks to have user_id (set to null for old webhooks)
      try {
        const data = fs.readFileSync(dbPath, 'utf8');
        const db = JSON.parse(data);
        if (db.webhooks && db.webhooks.length > 0) {
          let migrated = false;
          db.webhooks = db.webhooks.map((wh: any) => {
            if (!wh.user_id) {
              migrated = true;
              return { ...wh, user_id: null }; // Old webhooks without user_id
            }
            return wh;
          });
          if (migrated) {
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
            console.log('✅ Migrated existing webhooks to include user_id');
          }
        }
      } catch (err) {
        // Ignore migration errors
      }
    }
  } catch (error) {
    console.error(`❌ Failed to ensure database file at ${dbPath}:`, error);
    const errorDetails = {
      path: dbPath,
      dir: path.dirname(dbPath),
      cwd: process.cwd(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
    console.error('Error details:', errorDetails);
    throw new Error(`Cannot create database file at ${dbPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Read database
function readDb(): Database {
  try {
    ensureDbFile();
    const dbPath = getDbPath();
    const data = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(data);

    // Backward compatibility: ensure users array exists
    if (!db.users) {
      db.users = [];
      writeDb(db);
    } else {
      // Migrate 'admin' role to 'Administrator'
      let migrated = false;
      db.users = db.users.map((u: any) => {
        if (u.role === 'admin') {
          migrated = true;
          return { ...u, role: 'Administrator' };
        }
        return u;
      });
      if (migrated) {
        writeDb(db);
        console.log('✅ Migrated "admin" roles to "Administrator"');
      }
    }

    return db;
  } catch (error) {
    console.error('Error reading database:', error);
    // Return empty database if read fails
    return { users: [], webhooks: [], requests: [] };
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
  prepare(rawSql: string) {
    const sql = rawSql.replace(/\s+/g, ' ').trim();
    return {
      run: (...params: any[]) => {
        const db = readDb();
        let changes = 0;

        // Handle INSERT INTO users
        if (sql.includes('INSERT INTO users')) {
          const id = params[0];
          const email = params[1];
          const passwordHash = params[2];
          const role = params[3] || 'user';
          const isVerified = params[4] !== undefined ? (params[4] === 1 || params[4] === true) : false; // Default to false if not provided
          const verificationToken = params[5];
          const verificationTokenExpiresAt = params[6];

          // Check for duplicate email (case-insensitive)
          if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            throw new Error(`UNIQUE constraint failed: users.email`);
          }

          const user: User = {
            id,
            email,
            password_hash: passwordHash,
            role: role as 'Administrator' | 'Professional' | 'user',
            is_verified: isVerified,
            verification_token: verificationToken,
            verification_token_expires_at: verificationTokenExpiresAt,
            created_at: new Date().toISOString(),
          };

          db.users.push(user);
          changes = 1;
        }

        // Handle UPDATE users SET is_verified = 1, verification_token = NULL, verification_token_expires_at = NULL WHERE id = ?
        if (sql.includes('UPDATE users SET is_verified = 1')) {
          const id = params[0];
          const userIndex = db.users.findIndex(u => u.id === id);
          if (userIndex !== -1) {
            db.users[userIndex].is_verified = true;
            db.users[userIndex].verification_token = undefined;
            db.users[userIndex].verification_token_expires_at = undefined;
            changes = 1;
          }
        }

        // Handle UPDATE users SET role
        if (sql.includes('UPDATE users SET role = ?')) {
          const role = params[0];
          const id = params[1];
          const userIndex = db.users.findIndex(u => u.id === id);

          if (userIndex !== -1) {
            db.users[userIndex].role = role;
            changes = 1;
          }
        }

        // Handle UPDATE users SET mfa_secret = ?, mfa_enabled = 1 WHERE id = ?
        if (sql.includes('UPDATE users SET mfa_secret = ?, mfa_enabled = 1 WHERE id = ?')) {
          const secret = params[0];
          const id = params[1];
          const userIndex = db.users.findIndex(u => u.id === id);

          if (userIndex !== -1) {
            db.users[userIndex].mfa_secret = secret;
            db.users[userIndex].mfa_enabled = true;
            changes = 1;
          }
        }

        // Handle UPDATE users SET mfa_secret = NULL, mfa_enabled = 0 WHERE id = ?
        if (sql.includes('UPDATE users SET mfa_secret = NULL, mfa_enabled = 0 WHERE id = ?')) {
          const id = params[0];
          const userIndex = db.users.findIndex(u => u.id === id);

          if (userIndex !== -1) {
            delete db.users[userIndex].mfa_secret;
            db.users[userIndex].mfa_enabled = false;
            changes = 1;
          }
        }

        // Handle DELETE FROM users
        if (sql.includes('DELETE FROM users WHERE id = ?')) {
          const id = params[0];
          const initialLength = db.users.length;
          db.users = db.users.filter(u => u.id !== id);
          changes = initialLength - db.users.length;
        }

        // Handle DELETE FROM webhooks WHERE user_id = ?
        if (sql.includes('DELETE FROM webhooks WHERE user_id = ?')) {
          const userId = params[0];
          const initialLength = db.webhooks.length;
          // Find webhooks to be deleted to also delete their requests
          const deletedWebhooks = db.webhooks.filter(w => w.user_id === userId);
          const deletedTokens = deletedWebhooks.map(w => w.token);

          db.webhooks = db.webhooks.filter(w => w.user_id !== userId);
          db.requests = db.requests.filter(r => !deletedTokens.includes(r.webhook_token));

          changes = initialLength - db.webhooks.length;
        }

        // Handle INSERT INTO webhooks
        if (sql.includes('INSERT INTO webhooks')) {
          const token = params[0];
          const userId = params[1];
          let name: string | undefined;
          let expiresAt: string;
          let isActive = true;

          // Check if we have name parameter (new format has 4 params: token, user_id, name, expires_at)
          if (params.length >= 4) {
            name = params[2];
            expiresAt = params[3];
            isActive = params[4] !== undefined ? params[4] : true;
          } else {
            // Old format: token, user_id, expires_at
            expiresAt = params[2];
            isActive = params[3] !== undefined ? params[3] : true;
          }

          const webhook: Webhook = {
            token,
            user_id: userId,
            name,
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
            ip_address: params[7] || null,
            timestamp: params[8] || new Date().toISOString(),
          };

          db.requests.push(request);
          changes = 1;

          // Enforce request limit: keep only last 100 requests per webhook
          // This is done here to keep the JSON database simple
          const MAX_REQUESTS = 100;
          const webhookRequests = db.requests
            .filter(r => r.webhook_token === params[1])
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          if (webhookRequests.length > MAX_REQUESTS) {
            const toKeep = webhookRequests.slice(0, MAX_REQUESTS).map(r => r.id);
            db.requests = db.requests.filter(r =>
              r.webhook_token !== params[1] || toKeep.includes(r.id)
            );
          }
        }
        // Handle DELETE FROM requests (for request limit enforcement)
        // Note: Request limit is now handled in INSERT, so this is mainly for cleanup
        else if (sql.includes('DELETE FROM requests')) {
          const beforeCount = db.requests.length;

          if (sql.includes('webhook_token = ?') && sql.includes('id NOT IN')) {
            // This query is handled during INSERT, but we'll process it here too for safety
            const token = params[0];
            const limit = params[2] || 100;

            // Get the IDs of requests to keep (last N requests for this webhook)
            const webhookRequests = db.requests
              .filter(r => r.webhook_token === token)
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, limit)
              .map(r => r.id);

            // Delete requests not in the keep list
            db.requests = db.requests.filter(r =>
              r.webhook_token !== token || webhookRequests.includes(r.id)
            );

            changes = beforeCount - db.requests.length;
          }
        }
        // Handle DELETE FROM webhooks
        else if (sql.includes('DELETE FROM webhooks')) {
          const beforeCount = db.webhooks.length;

          if (sql.includes('WHERE token = ?') && sql.includes('user_id = ?')) {
            const token = params[0];
            const userId = params[1];
            db.webhooks = db.webhooks.filter(w => !(w.token === token && w.user_id === userId));
            // Also delete associated requests
            db.requests = db.requests.filter(r => r.webhook_token !== token);
          } else if (sql.includes('WHERE token = ?')) {
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

        // Handle SELECT FROM users WHERE email = ? (Case insensitive)
        if (sql.includes('SELECT') && sql.includes('users') && (sql.includes('email = ?') || sql.includes('lower(email) = ?') || sql.includes('LOWER(email) = ?'))) {
          const email = params[0];
          const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
          return user || undefined;
        }

        // Handle SELECT FROM users WHERE id = ?
        if (sql.includes('SELECT') && sql.includes('users') && sql.includes('id = ?')) {
          const id = params[0];
          const user = db.users.find(u => u.id === id);
          if (!user) return undefined;

          // Return full user object (including mfa_enabled and password_hash)
          // The API layer is responsible for filtering sensitive fields before sending to client
          return { ...user };
        }

        // Handle SELECT FROM users WHERE verification_token = ?
        if (sql.includes('SELECT') && sql.includes('users') && sql.includes('verification_token = ?')) {
          const token = params[0];
          const user = db.users.find(u => u.verification_token === token);
          return user || undefined;
        }

        // Handle SELECT COUNT(*) FROM requests WHERE webhook_token = ?
        if (sql.includes('SELECT COUNT(*)') && sql.includes('requests') && sql.includes('webhook_token = ?')) {
          const token = params[0];
          const count = db.requests.filter(r => r.webhook_token === token).length;
          return { count };
        }

        // Handle SELECT COUNT(*) FROM webhooks WHERE user_id = ? AND is_active = 1
        if (sql.includes('SELECT COUNT(*)') && sql.includes('webhooks') && sql.includes('user_id = ?')) {
          const userId = params[0];
          const count = db.webhooks.filter(w =>
            w.user_id === userId &&
            w.is_active &&
            new Date(w.expires_at) > new Date()
          ).length;
          return { count };
        }

        // Handle SELECT FROM webhooks WHERE token = ? AND user_id = ?
        if (sql.includes('SELECT') && sql.includes('webhooks') && sql.includes('token = ?') && sql.includes('user_id = ?')) {
          const token = params[0];
          const userId = params[1];
          const webhook = db.webhooks.find(w =>
            w.token === token &&
            w.user_id === userId &&
            w.is_active &&
            new Date(w.expires_at) > new Date()
          );
          return webhook || undefined;
        }

        // Handle SELECT FROM webhooks WHERE token = ? (for webhook receiver - no auth required)
        if (sql.includes('SELECT') && sql.includes('webhooks') && sql.includes('token = ?') && !sql.includes('user_id = ?')) {
          const token = params[0];
          const webhook = db.webhooks.find(w =>
            w.token === token &&
            w.is_active &&
            new Date(w.expires_at) > new Date()
          );
          // Return webhook without user_id for backward compatibility
          if (webhook) {
            return {
              token: webhook.token,
              expires_at: webhook.expires_at,
              is_active: webhook.is_active ? 1 : 0,
            };
          }
          return undefined;
        }


        // Handle SELECT r.* FROM requests r INNER JOIN webhooks w ON r.webhook_token = w.token WHERE r.id = ? AND w.user_id = ?
        if (sql.includes('SELECT r.*') && sql.includes('INNER JOIN') && sql.includes('requests r') && sql.includes('webhooks w') && sql.includes('id = ?') && sql.includes('user_id = ?')) {
          const id = params[0];
          const userId = params[1];
          const request = db.requests.find(r => r.id === id);
          if (!request) return undefined;

          // Verify webhook belongs to user
          const webhook = db.webhooks.find(w => w.token === request.webhook_token && w.user_id === userId);
          if (!webhook) return undefined;

          // Convert to format expected by the code (stringify JSON fields)
          return {
            id: request.id,
            webhook_token: request.webhook_token,
            method: request.method,
            url: request.url,
            headers: typeof request.headers === 'string' ? request.headers : JSON.stringify(request.headers),
            body: request.body ? (typeof request.body === 'string' ? request.body : JSON.stringify(request.body)) : null,
            query: request.query ? (typeof request.query === 'string' ? request.query : JSON.stringify(request.query)) : null,
            timestamp: request.timestamp || new Date().toISOString(),
            ip_address: request.ip_address,
          };
        }

        // Handle SELECT FROM requests WHERE id = ? (backward compatibility)
        if (sql.includes('SELECT') && sql.includes('requests') && sql.includes('id = ?') && !sql.includes('INNER JOIN')) {
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

        // Handle SELECT * FROM users WHERE lower(email) = ? (for duplicate detection)
        if (sql.includes('SELECT') && sql.includes('users') && (sql.includes('lower(email) = ?') || sql.includes('LOWER(email) = ?'))) {
          const email = params[0];
          return db.users.filter(u => u.email.toLowerCase() === email.toLowerCase());
        }

        // Handle SELECT id, email, role, created_at, mfa_enabled FROM users
        if (sql.includes('SELECT id, email, role, created_at') && sql.includes('FROM users')) {
          return db.users
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map(u => ({
              id: u.id,
              email: u.email,
              role: u.role,
              created_at: u.created_at,
              mfa_enabled: u.mfa_enabled ? 1 : 0
            }));
        }

        // Handle SELECT token, created_at, expires_at, is_active FROM webhooks WHERE user_id = ?
        if (sql.includes('SELECT') && sql.includes('webhooks') && sql.includes('user_id = ?') && sql.includes('ORDER BY created_at DESC')) {
          const userId = params[0];
          const webhooks = db.webhooks
            .filter(w => w.user_id === userId && w.is_active && new Date(w.expires_at) > new Date())
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map(w => ({
              token: w.token,
              name: w.name,
              created_at: w.created_at,
              expires_at: w.expires_at,
              is_active: w.is_active ? 1 : 0,
            }));
          return webhooks;
        }

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
            timestamp: req.timestamp || new Date().toISOString(),
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
