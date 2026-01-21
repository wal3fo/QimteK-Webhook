# Complete Deployment Guide: Local to Vercel with Supabase

This guide provides a complete solution for deploying your Node.js/Express webhook application to Vercel with persistent cloud storage.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup Instructions](#setup-instructions)
4. [Code Examples](#code-examples)
5. [Environment Variables](#environment-variables)
6. [Deployment Steps](#deployment-steps)
7. [Troubleshooting](#troubleshooting)

## 🎯 Overview

This solution provides:

- ✅ **Cloud Database (Supabase PostgreSQL)** for Vercel production
- ✅ **Local Storage (SQLite/JSON)** for development
- ✅ **Automatic Environment Detection**
- ✅ **Unified Database Interface** - same code works everywhere
- ✅ **Zero Code Changes** when switching environments

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Code                      │
│  (Routes, Handlers - No changes needed!)                 │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Universal Database Adapter                  │
│              (api/db-adapter.ts)                         │
└──────────────┬───────────────────────┬───────────────────┘
               │                       │
       ┌───────▼───────┐      ┌────────▼────────┐
       │   Production   │      │   Development   │
       │   (Vercel)     │      │   (Local)       │
       │                │      │                 │
       │  Supabase      │      │  SQLite/JSON    │
       │  PostgreSQL    │      │  File Storage    │
       └────────────────┘      └─────────────────┘
```

## 🚀 Setup Instructions

### Step 1: Install Dependencies

```bash
npm install @supabase/supabase-js
```

### Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project
3. Wait for project to be ready (1-2 minutes)

### Step 3: Get Supabase Credentials

1. In Supabase dashboard → **Settings** → **API**
2. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

### Step 4: Run Database Migration

1. In Supabase dashboard → **SQL Editor**
2. Click **New query**
3. Copy contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and click **Run**

### Step 5: Configure Environment Variables

#### For Local Development (.env)

```env
# Local Development - uses SQLite/JSON
NODE_ENV=development

# Optional: Uncomment to use Supabase locally
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=your-anon-key
```

#### For Vercel Production

1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Add:

```
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV = production
```

## 💻 Code Examples

### Example 1: Webhook Route Handler

```typescript
// api/routes/webhooks.ts
import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ensureDb } from '../db-adapter.js'; // Use the adapter

const router = Router();

/**
 * Generate a new webhook URL
 * POST /api/webhooks/generate
 */
router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    // Always use ensureDb() to guarantee database is initialized
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

/**
 * Get requests for a webhook
 * GET /api/webhooks/:token/requests
 */
router.get('/:token/requests', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await ensureDb();
    const { token } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    // Verify webhook exists
    const webhookResult = db.prepare(`
      SELECT * FROM webhooks 
      WHERE token = ? AND is_active = 1 AND expires_at > datetime('now')
    `).get(token);
    const webhook = await (webhookResult instanceof Promise ? webhookResult : Promise.resolve(webhookResult));
    
    if (!webhook) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found or expired',
      });
      return;
    }
    
    // Get requests
    const requestsResult = db.prepare(`
      SELECT * FROM requests 
      WHERE webhook_token = ? 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `).all(token, limit, offset);
    const requests = await (requestsResult instanceof Promise ? requestsResult : Promise.resolve(requestsResult));
    
    // Parse JSON fields safely
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

export default router;
```

### Example 2: Webhook Receiver

```typescript
// api/routes/webhook-receiver.ts
import { Router, type Request, type Response } from 'express';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ensureDb } from '../db-adapter.js';

const router = Router();
router.use(express.raw({ type: '*/*', limit: '10mb' }));

/**
 * Capture incoming webhook request
 * ALL /api/webhook/:token
 */
router.all('/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await ensureDb(); // Always ensure DB is initialized
    const { token } = req.params;
    
    // Verify webhook exists
    const webhookResult = db.prepare(`
      SELECT * FROM webhooks 
      WHERE token = ? AND is_active = 1 AND expires_at > datetime('now')
    `).get(token);
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
    
    // Parse body
    let body = null;
    const contentType = req.headers['content-type'] || '';
    let rawBody: string | null = null;
    
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8');
    } else if (typeof req.body === 'string') {
      rawBody = req.body;
    }
    
    if (rawBody && rawBody.length > 0) {
      if (contentType.includes('application/json')) {
        try {
          body = JSON.parse(rawBody);
        } catch {
          body = rawBody;
        }
      } else {
        body = rawBody;
      }
    }
    
    // Get IP address
    const ipAddress = 
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown';
    
    // Store request in database
    const timestamp = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO requests (id, webhook_token, method, url, headers, body, query, ip_address, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const runResult = stmt.run(
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
    await (runResult instanceof Promise ? runResult : Promise.resolve(runResult));
    
    // Emit socket event (if using Socket.io)
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

## 🔧 Environment Variables

### Required for Production (Vercel)

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
```

### Optional

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Only if bypassing RLS
BASE_URL=https://your-app.vercel.app  # Your deployment URL
DB_PATH=./webhook.db  # Only for local SQLite
```

### Local Development

```env
NODE_ENV=development
# Don't set SUPABASE_URL to use local storage
```

## 📁 Folder Structure

```
project-root/
├── api/
│   ├── db-adapter.ts          # Universal database adapter
│   ├── db.ts                   # Re-exports from adapter
│   ├── db-supabase.ts          # Supabase implementation
│   ├── db-json.ts              # JSON fallback implementation
│   ├── routes/
│   │   ├── webhooks.ts         # Webhook management routes
│   │   └── webhook-receiver.ts # Webhook receiver route
│   ├── utils/
│   │   └── cleanup.ts          # Cleanup utility
│   ├── app.ts                  # Express app setup
│   ├── server.ts               # Local server (dev)
│   └── index.ts                # Vercel handler
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Database schema
├── .env                        # Local environment variables
├── .env.example                # Example env file
├── package.json
└── vercel.json                 # Vercel configuration
```

## 🚢 Deployment Steps

### 1. Prepare Your Code

```bash
# Install dependencies
npm install

# Test locally
npm run dev
```

### 2. Set Up Supabase

1. Create Supabase project
2. Run migration SQL
3. Get credentials

### 3. Configure Vercel

1. Go to Vercel Dashboard
2. Project → Settings → Environment Variables
3. Add all required variables
4. Set environment to "Production"

### 4. Deploy

```bash
git add .
git commit -m "Add Supabase integration"
git push
```

Vercel will automatically deploy!

## 🔍 How It Works

### Environment Detection

The adapter automatically detects the environment:

```typescript
// In api/db-adapter.ts
const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
const hasSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY;

if (isProduction && hasSupabase) {
  // Use Supabase
} else {
  // Use SQLite/JSON
}
```

### Database Operations

All operations use the same interface:

```typescript
// This works with SQLite, Supabase, or JSON
const db = await ensureDb();
const stmt = db.prepare('SELECT * FROM webhooks WHERE token = ?');
const result = stmt.get(token);
const finalResult = await (result instanceof Promise ? result : result);
```

## 🐛 Troubleshooting

### Error: "Cannot read properties of null"

**Solution**: Always use `await ensureDb()` before accessing database:

```typescript
// ❌ Wrong
const stmt = db.prepare('...');

// ✅ Correct
const db = await ensureDb();
const stmt = db.prepare('...');
```

### Error: "EROFS: read-only file system"

**Solution**: Set Supabase environment variables in Vercel. The adapter will automatically use Supabase instead of local files.

### Error: "relation does not exist"

**Solution**: Run the migration SQL in Supabase SQL Editor.

### Local dev using Supabase instead of local storage

**Solution**: Remove `SUPABASE_URL` from `.env` or set `NODE_ENV=development`.

## 📊 Database Schema

The migration creates two tables:

**webhooks**
- `token` (PRIMARY KEY)
- `created_at`
- `expires_at`
- `is_active`

**requests**
- `id` (PRIMARY KEY)
- `webhook_token` (FOREIGN KEY)
- `method`, `url`, `headers`, `body`, `query`
- `timestamp`, `ip_address`

See `supabase/migrations/001_initial_schema.sql` for full schema.

## ✅ Checklist

Before deploying:

- [ ] Supabase project created
- [ ] Migration SQL executed
- [ ] Environment variables set in Vercel
- [ ] `@supabase/supabase-js` installed
- [ ] All routes use `await ensureDb()`
- [ ] Tested locally
- [ ] Committed and pushed to git

## 🎉 Success!

Once deployed, your application will:
- ✅ Use Supabase PostgreSQL on Vercel
- ✅ Use SQLite/JSON locally
- ✅ Automatically detect environment
- ✅ Work seamlessly without code changes
