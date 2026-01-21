# Quick Reference: Database Migration

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install @supabase/supabase-js
```

### 2. Set Up Supabase
1. Create project at [supabase.com](https://supabase.com)
2. Run migration SQL from `supabase/migrations/001_initial_schema.sql`
3. Get credentials from Settings → API

### 3. Configure Environment Variables

**Local (.env):**
```env
NODE_ENV=development
# Don't set SUPABASE_URL to use local storage
```

**Vercel (Dashboard → Settings → Environment Variables):**
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
```

### 4. Use in Your Code

```typescript
import { ensureDb } from '../db.js';

// In your route handler
router.post('/example', async (req, res) => {
  // ✅ ALWAYS use ensureDb() first
  const db = await ensureDb();
  
  // Use database - works with SQLite, Supabase, or JSON
  const stmt = db.prepare('SELECT * FROM webhooks WHERE token = ?');
  const result = stmt.get(token);
  const finalResult = await (result instanceof Promise ? result : result);
  
  res.json({ success: true, data: finalResult });
});
```

## 🔑 Key Patterns

### Pattern 1: Always Use `ensureDb()`
```typescript
// ❌ WRONG
const stmt = db.prepare('...');

// ✅ CORRECT
const db = await ensureDb();
const stmt = db.prepare('...');
```

### Pattern 2: Handle Async Results
```typescript
// ✅ Works with both sync (SQLite) and async (Supabase)
const result = stmt.run(...params);
const finalResult = await (result instanceof Promise ? result : result);
```

### Pattern 3: Parse JSON Fields
```typescript
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

## 📁 File Structure

```
api/
├── db-adapter.ts      # Universal adapter (NEW)
├── db.ts              # Re-exports (UPDATED)
├── db-supabase.ts     # Supabase implementation
├── db-json.ts         # JSON fallback
└── routes/
    ├── webhooks.ts    # Use ensureDb() here
    └── webhook-receiver.ts  # Use ensureDb() here
```

## 🎯 How It Works

1. **Environment Detection**: Automatically detects Vercel/production
2. **Database Selection**:
   - Production + Supabase credentials → Supabase PostgreSQL
   - Local + better-sqlite3 available → SQLite
   - Otherwise → JSON file storage
3. **Unified Interface**: Same code works everywhere

## ✅ Checklist

- [ ] `@supabase/supabase-js` installed
- [ ] Supabase project created
- [ ] Migration SQL executed
- [ ] Environment variables set in Vercel
- [ ] All routes use `await ensureDb()`
- [ ] All database results handle async
- [ ] JSON fields parsed safely

## 🐛 Common Issues

**Error: "Cannot read properties of null"**
- **Fix**: Always use `await ensureDb()` before accessing database

**Error: "EROFS: read-only file system"**
- **Fix**: Set Supabase environment variables in Vercel

**Error: "relation does not exist"**
- **Fix**: Run migration SQL in Supabase SQL Editor

## 📚 Full Documentation

- **DEPLOYMENT_GUIDE.md** - Complete setup instructions
- **EXAMPLES.md** - Ready-to-use code examples
- **SUPABASE_SETUP.md** - Supabase-specific setup
