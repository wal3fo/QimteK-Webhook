# Complete Code Examples: Database Migration Guide

This document provides ready-to-use code examples for migrating from local file/SQLite storage to cloud storage (Supabase) that works seamlessly in both local development and Vercel production.

## 📚 Table of Contents

1. [Database Adapter](#database-adapter)
2. [Route Handler Examples](#route-handler-examples)
3. [Webhook Receiver Example](#webhook-receiver-example)
4. [Environment Configuration](#environment-configuration)
5. [Complete Working Example](#complete-working-example)

## 🔌 Database Adapter

### File: `api/db-adapter.ts`

```typescript
/**
 * Universal Database Adapter
 * 
 * This adapter provides a unified interface for database operations that works with:
 * - Supabase PostgreSQL (production/Vercel)
 * - SQLite (local development)
 * - JSON file storage (fallback)
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
  exec(sql: string): void | Promise<void>;
  pragma(setting: string): void;
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
    // Check if we're in production (Vercel) and have Supabase credentials
    const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    const hasSupabase = process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Priority 1: Use Supabase in production if credentials are available
    if (isProduction && hasSupabase) {
      try {
        db = getSupabaseDb();
        console.log('✅ Using Supabase PostgreSQL database (production)');
        return;
      } catch (error) {
        console.error('❌ Failed to initialize Supabase, falling back to local storage:', error);
      }
    }

    // Priority 2: Try better-sqlite3 for local development
    try {
      const Database = (await import('better-sqlite3')).default;
      const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'webhook.db');
      const sqliteDb = new Database(dbPath);
      sqliteDb.pragma('foreign_keys = ON');
      db = sqliteDb;
      console.log('✅ Using better-sqlite3 database (local development)');
      await createSchema(db);
      return;
    } catch (error: any) {
      console.log('⚠️  better-sqlite3 not available, using JSON database fallback');
    }

    // Priority 3: Fallback to JSON database
    db = jsonDb;
    console.log('✅ Using JSON database fallback (local development)');
    await createSchema(db);
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
 * CRITICAL: Always use this before accessing the database
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
 * Helper functions for database operations
 * These handle both sync (SQLite) and async (Supabase) operations
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
```

## 🛣️ Route Handler Examples

### Example 1: Generate Webhook

```typescript
// api/routes/webhooks.ts
import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ensureDb } from '../db.js'; // Import ensureDb

const router = Router();

/**
 * Generate a new webhook URL
 * POST /api/webhooks/generate
 */
router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    // ✅ ALWAYS use ensureDb() to guarantee database is initialized
    const db = await ensureDb();
    
    const { expiresIn = 60 } = req.body;
    const token = uuidv4().replace(/-/g, '');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresIn);
    
    // Insert webhook - works with SQLite, Supabase, or JSON
    const stmt = db.prepare(`
      INSERT INTO webhooks (token, expires_at, is_active)
      VALUES (?, ?, 1)
    `);
    
    // Handle both sync (SQLite) and async (Supabase) operations
    const result = stmt.run(token, expiresAt.toISOString());
    const finalResult = await (result instanceof Promise ? result : result);
    
    res.status(201).json({
      success: true,
      token,
      url: `${process.env.BASE_URL || req.protocol + '://' + req.get('host')}/api/webhook/${token}`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Error generating webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate webhook',
    });
  }
});

export default router;
```

### Example 2: Get Webhook Requests

```typescript
/**
 * Get requests for a webhook
 * GET /api/webhooks/:token/requests
 */
router.get('/:token/requests', async (req: Request, res: Response): Promise<void> => {
  try {
    // ✅ ALWAYS use ensureDb() first
    const db = await ensureDb();
    const { token } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    // Verify webhook exists
    const webhookStmt = db.prepare(`
      SELECT * FROM webhooks 
      WHERE token = ? AND is_active = 1 AND expires_at > datetime('now')
    `);
    const webhookResult = webhookStmt.get(token);
    const webhook = await (webhookResult instanceof Promise ? webhookResult : Promise.resolve(webhookResult));
    
    if (!webhook) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found or expired',
      });
      return;
    }
    
    // Get requests
    const requestsStmt = db.prepare(`
      SELECT * FROM requests 
      WHERE webhook_token = ? 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `);
    const requestsResult = requestsStmt.all(token, limit, offset);
    const requests = await (requestsResult instanceof Promise ? requestsResult : Promise.resolve(requestsResult));
    
    // Parse JSON fields safely (handles both string and object formats)
    const parseJsonField = (field: any): any => {
      if (!field) return null;
      if (typeof field === 'object') return field;
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return field;
        }
      }
      return field;
    };
    
    const parsedRequests = requests.map((req: any) => ({
      id: req.id,
      webhook_token: req.webhook_token,
      method: req.method,
      url: req.url,
      headers: parseJsonField(req.headers),
      body: parseJsonField(req.body),
      query: parseJsonField(req.query),
      timestamp: req.timestamp,
      ip_address: req.ip_address,
    }));
    
    res.json({
      success: true,
      requests: parsedRequests,
      total: parsedRequests.length,
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch requests',
    });
  }
});
```

### Example 3: Delete Webhook

```typescript
/**
 * Delete a webhook
 * DELETE /api/webhooks/:token
 */
router.delete('/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await ensureDb();
    const { token } = req.params;
    
    // Mark webhook as inactive
    const stmt = db.prepare(`
      UPDATE webhooks 
      SET is_active = 0 
      WHERE token = ?
    `);
    
    const result = stmt.run(token);
    const finalResult = await (result instanceof Promise ? result : result);
    
    if (finalResult.changes === 0) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete webhook',
    });
  }
});
```

## 📥 Webhook Receiver Example

### File: `api/routes/webhook-receiver.ts`

```typescript
import { Router, type Request, type Response } from 'express';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ensureDb } from '../db.js';

const router = Router();

// Parse raw body for webhook requests
router.use(express.raw({ type: '*/*', limit: '10mb' }));

/**
 * Capture incoming webhook request
 * ALL /api/webhook/:token
 * 
 * This route captures ANY HTTP method (GET, POST, PUT, DELETE, etc.)
 * and stores the request data in the database.
 */
router.all('/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    // ✅ ALWAYS ensure database is initialized
    const db = await ensureDb();
    const { token } = req.params;
    
    // Verify webhook exists and is active
    const webhookStmt = db.prepare(`
      SELECT * FROM webhooks 
      WHERE token = ? AND is_active = 1 AND expires_at > datetime('now')
    `);
    const webhookResult = webhookStmt.get(token);
    const webhook = await (webhookResult instanceof Promise ? webhookResult : Promise.resolve(webhookResult));
    
    if (!webhook) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found or expired',
      });
      return;
    }
    
    // Extract request data
    const requestId = uuidv4();
    const method = req.method;
    const url = req.originalUrl;
    const headers = req.headers;
    const query = req.query;
    
    // Parse body - handle Buffer, string, or already parsed
    let body = null;
    const contentType = req.headers['content-type'] || '';
    let rawBody: string | null = null;
    
    // Convert body to string if it's a Buffer
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8');
    } else if (typeof req.body === 'string') {
      rawBody = req.body;
    }
    
    // Parse body based on content type
    if (rawBody && rawBody.length > 0) {
      if (contentType.includes('application/json')) {
        try {
          body = JSON.parse(rawBody);
        } catch {
          body = rawBody; // Fallback to raw string if JSON parse fails
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        try {
          const params = new URLSearchParams(rawBody);
          body = Object.fromEntries(params);
        } catch {
          body = rawBody;
        }
      } else {
        body = rawBody;
      }
    }
    
    // Get IP address (handles proxies)
    const ipAddress = 
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown';
    
    // Store request in database
    const timestamp = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT INTO requests (
        id, webhook_token, method, url, headers, body, query, ip_address, timestamp
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const runResult = insertStmt.run(
      requestId,
      token,
      method,
      url,
      JSON.stringify(headers),
      body ? JSON.stringify(body) : null,
      Object.keys(query).length > 0 ? JSON.stringify(query) : null,
      ipAddress,
      timestamp
    );
    
    // Handle async result
    await (runResult instanceof Promise ? runResult : Promise.resolve(runResult));
    
    // Emit socket event for real-time updates (if using Socket.io)
    const io = req.app.get('io');
    if (io) {
      io.to(`webhook:${token}`).emit('new-request', {
        id: requestId,
        webhook_token: token,
        method,
        url,
        headers,
        body,
        query,
        timestamp,
        ip_address: ipAddress,
      });
    }
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Webhook received',
      requestId,
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
    });
  }
});

export default router;
```

## ⚙️ Environment Configuration

### File: `.env` (Local Development)

```env
# Local Development - uses SQLite/JSON
NODE_ENV=development

# Optional: Uncomment to use Supabase locally
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=your-anon-key

# Optional: Custom database path for SQLite
# DB_PATH=./webhook.db

# Optional: Base URL for webhook URLs
# BASE_URL=http://localhost:3003
```

### Vercel Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV = production
BASE_URL = https://your-app.vercel.app
```

## 🎯 Complete Working Example

### File: `api/routes/webhooks.ts` (Complete)

```typescript
/**
 * Webhook routes for generating and managing webhooks
 * 
 * This file demonstrates the complete pattern for using the database adapter
 * in a production-ready Express route handler.
 */
import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ensureDb } from '../db.js';

const router = Router();

/**
 * Helper function to safely parse JSON fields
 * Handles both string and object formats from different database backends
 */
function parseJsonField(field: any): any {
  if (!field) return null;
  if (typeof field === 'object') return field;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return field;
    }
  }
  return field;
}

/**
 * Generate a new webhook URL
 * POST /api/webhooks/generate
 * 
 * Body: { expiresIn?: number } (default: 60 minutes)
 */
router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await ensureDb();
    const { expiresIn = 60 } = req.body;
    const token = uuidv4().replace(/-/g, '');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresIn);
    
    const stmt = db.prepare(`
      INSERT INTO webhooks (token, expires_at, is_active)
      VALUES (?, ?, 1)
    `);
    
    const result = stmt.run(token, expiresAt.toISOString());
    await (result instanceof Promise ? result : result);
    
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    
    res.status(201).json({
      success: true,
      token,
      url: `${baseUrl}/api/webhook/${token}`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Error generating webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate webhook',
    });
  }
});

/**
 * Get webhook information
 * GET /api/webhooks/:token
 */
router.get('/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await ensureDb();
    const { token } = req.params;
    
    const stmt = db.prepare(`
      SELECT * FROM webhooks 
      WHERE token = ? AND is_active = 1
    `);
    const result = stmt.get(token);
    const webhook = await (result instanceof Promise ? result : result);
    
    if (!webhook) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
      return;
    }
    
    res.json({
      success: true,
      webhook: {
        token: webhook.token,
        created_at: webhook.created_at,
        expires_at: webhook.expires_at,
        is_active: webhook.is_active,
      },
    });
  } catch (error) {
    console.error('Error fetching webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook',
    });
  }
});

/**
 * Get requests for a webhook
 * GET /api/webhooks/:token/requests
 * 
 * Query params: limit (default: 100), offset (default: 0)
 */
router.get('/:token/requests', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await ensureDb();
    const { token } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    
    // Verify webhook exists
    const webhookStmt = db.prepare(`
      SELECT * FROM webhooks 
      WHERE token = ? AND is_active = 1 AND expires_at > datetime('now')
    `);
    const webhookResult = webhookStmt.get(token);
    const webhook = await (webhookResult instanceof Promise ? webhookResult : Promise.resolve(webhookResult));
    
    if (!webhook) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found or expired',
      });
      return;
    }
    
    // Get requests
    const requestsStmt = db.prepare(`
      SELECT * FROM requests 
      WHERE webhook_token = ? 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `);
    const requestsResult = requestsStmt.all(token, limit, offset);
    const requests = await (requestsResult instanceof Promise ? requestsResult : Promise.resolve(requestsResult));
    
    // Parse JSON fields
    const parsedRequests = requests.map((req: any) => ({
      id: req.id,
      webhook_token: req.webhook_token,
      method: req.method,
      url: req.url,
      headers: parseJsonField(req.headers),
      body: parseJsonField(req.body),
      query: parseJsonField(req.query),
      timestamp: req.timestamp,
      ip_address: req.ip_address,
    }));
    
    res.json({
      success: true,
      requests: parsedRequests,
      total: parsedRequests.length,
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch requests',
    });
  }
});

/**
 * Get a single request by ID
 * GET /api/webhooks/requests/:id
 */
router.get('/requests/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await ensureDb();
    const { id } = req.params;
    
    const stmt = db.prepare(`
      SELECT * FROM requests 
      WHERE id = ?
    `);
    const result = stmt.get(id);
    const request = await (result instanceof Promise ? result : result);
    
    if (!request) {
      res.status(404).json({
        success: false,
        error: 'Request not found',
      });
      return;
    }
    
    res.json({
      success: true,
      request: {
        id: request.id,
        webhook_token: request.webhook_token,
        method: request.method,
        url: request.url,
        headers: parseJsonField(request.headers),
        body: parseJsonField(request.body),
        query: parseJsonField(request.query),
        timestamp: request.timestamp,
        ip_address: request.ip_address,
      },
    });
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch request',
    });
  }
});

/**
 * Delete a webhook
 * DELETE /api/webhooks/:token
 */
router.delete('/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await ensureDb();
    const { token } = req.params;
    
    const stmt = db.prepare(`
      UPDATE webhooks 
      SET is_active = 0 
      WHERE token = ?
    `);
    
    const result = stmt.run(token);
    const finalResult = await (result instanceof Promise ? result : result);
    
    if (finalResult.changes === 0) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete webhook',
    });
  }
});

export default router;
```

## 🔑 Key Patterns

### Pattern 1: Always Use `ensureDb()`

```typescript
// ❌ WRONG - db might be null
const stmt = db.prepare('SELECT * FROM webhooks');

// ✅ CORRECT - guarantees db is initialized
const db = await ensureDb();
const stmt = db.prepare('SELECT * FROM webhooks');
```

### Pattern 2: Handle Async Results

```typescript
// ✅ CORRECT - handles both sync and async
const result = stmt.run(...params);
const finalResult = await (result instanceof Promise ? result : result);
```

### Pattern 3: Parse JSON Fields Safely

```typescript
// ✅ CORRECT - handles string and object formats
function parseJsonField(field: any): any {
  if (!field) return null;
  if (typeof field === 'object') return field;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return field;
    }
  }
  return field;
}
```

## ✅ Checklist

Before deploying:

- [ ] All routes use `await ensureDb()` before database operations
- [ ] All database results are handled for both sync and async
- [ ] JSON fields are parsed safely using `parseJsonField()`
- [ ] Environment variables are set in Vercel
- [ ] Supabase migration SQL has been executed
- [ ] Tested locally with SQLite/JSON
- [ ] Tested locally with Supabase (optional)

## 🎉 Success!

Your code now works seamlessly with:
- ✅ Supabase PostgreSQL on Vercel
- ✅ SQLite locally (if available)
- ✅ JSON file storage (fallback)
- ✅ Automatic environment detection
- ✅ Zero code changes needed when switching environments
