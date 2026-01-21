# Environment Configuration Guide

Complete guide for configuring environment variables for QimteK Hooks in both local development and Vercel production.

## 📋 Quick Reference

### Local Development
```env
NODE_ENV=development
PORT=3001
BASE_URL=http://localhost:3001
CLIENT_URL=http://localhost:5173
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
```

### Vercel Production
```env
NODE_ENV=production
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
BASE_URL=https://your-app.vercel.app
CLIENT_URL=https://your-app.vercel.app
VITE_API_URL=/api
VITE_SOCKET_URL=https://your-app.vercel.app
```

## 🔧 Environment Variables

### Required for Production (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `NODE_ENV` | Environment mode | `production` |

### Optional for Production

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `BASE_URL` | Base URL for webhook generation | Auto-detected | `https://your-app.vercel.app` |
| `CLIENT_URL` | Client URL for CORS/Socket.io | Auto-detected | `https://your-app.vercel.app` |
| `VITE_API_URL` | Frontend API URL | `/api` | `/api` |
| `VITE_SOCKET_URL` | Frontend Socket.io URL | Auto-detected | `https://your-app.vercel.app` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypass RLS) | - | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Local Development

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NODE_ENV` | Environment mode | `development` | `development` |
| `PORT` | Server port | `3001` | `3001` |
| `BASE_URL` | Base URL for webhook generation | `http://localhost:3001` | `http://localhost:3001` |
| `CLIENT_URL` | Client URL for CORS/Socket.io | `*` (allows all) | `http://localhost:5173` |
| `VITE_API_URL` | Frontend API URL | `http://localhost:3001/api` | `http://localhost:3001/api` |
| `VITE_SOCKET_URL` | Frontend Socket.io URL | `http://localhost:3001` | `http://localhost:3001` |
| `DB_PATH` | SQLite database file path | `./webhook.db` | `./webhook.db` |

## 🚀 Setup Instructions

### Step 1: Create `.env` File

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your values (see sections below)

### Step 2: Local Development Setup

For local development, you only need:

```env
NODE_ENV=development
PORT=3001
BASE_URL=http://localhost:3001
CLIENT_URL=http://localhost:5173
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
```

**Note**: Don't set `SUPABASE_URL` for local development - the app will automatically use SQLite or JSON file storage.

### Step 3: Vercel Production Setup

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. Add the following variables:

   **Required:**
   ```
   SUPABASE_URL = https://xxxxx.supabase.co
   SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   NODE_ENV = production
   ```

   **Recommended:**
   ```
   BASE_URL = https://your-app.vercel.app
   CLIENT_URL = https://your-app.vercel.app
   VITE_API_URL = /api
   VITE_SOCKET_URL = https://your-app.vercel.app
   ```

3. Set environment to **Production** (or **Preview** if you want different values for preview deployments)

4. Click **Save**

### Step 4: Get Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and sign in
2. Select your project (or create a new one)
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (optional)

## 🔍 Variable Details

### `NODE_ENV`
- **Purpose**: Determines environment mode
- **Values**: `development` | `production`
- **Auto-set by Vercel**: Yes (automatically set to `production`)
- **Local**: Set to `development`

### `SUPABASE_URL`
- **Purpose**: Supabase project URL
- **Required**: Yes (for production)
- **Format**: `https://xxxxx.supabase.co`
- **Where to get**: Supabase Dashboard → Settings → API

### `SUPABASE_ANON_KEY`
- **Purpose**: Supabase anonymous/public API key
- **Required**: Yes (for production)
- **Format**: JWT token
- **Where to get**: Supabase Dashboard → Settings → API → anon public key

### `SUPABASE_SERVICE_ROLE_KEY`
- **Purpose**: Service role key (bypasses Row Level Security)
- **Required**: No (only if you need to bypass RLS)
- **Security**: Keep secret! Never expose to frontend
- **Where to get**: Supabase Dashboard → Settings → API → service_role key

### `BASE_URL`
- **Purpose**: Base URL used when generating webhook URLs
- **Local**: `http://localhost:3001`
- **Production**: `https://your-app.vercel.app`
- **Auto-detected**: Yes (from request headers if not set)

### `CLIENT_URL`
- **Purpose**: Allowed origin for CORS and Socket.io connections
- **Local**: `http://localhost:5173` or `*` (allows all)
- **Production**: `https://your-app.vercel.app`
- **Default**: `*` (allows all origins)

### `VITE_API_URL`
- **Purpose**: API URL used by frontend React app
- **Local**: `http://localhost:3001/api`
- **Production**: `/api` (relative path)
- **Note**: Must be prefixed with `VITE_` to be exposed to frontend

### `VITE_SOCKET_URL`
- **Purpose**: Socket.io server URL for real-time updates
- **Local**: `http://localhost:3001`
- **Production**: `https://your-app.vercel.app`
- **Note**: Must be prefixed with `VITE_` to be exposed to frontend

### `PORT`
- **Purpose**: Server port for local development
- **Default**: `3001`
- **Production**: Not used (Vercel handles this)

### `DB_PATH`
- **Purpose**: Path to SQLite database file (local only)
- **Default**: `./webhook.db`
- **Production**: Not used (uses Supabase)

## 🔐 Security Notes

1. **Never commit `.env` to version control**
   - `.env` is in `.gitignore`
   - Use `.env.example` as a template

2. **Vercel Environment Variables**
   - Set in Vercel Dashboard (not in code)
   - Automatically encrypted
   - Different values for Production/Preview/Development

3. **Frontend Variables**
   - Variables prefixed with `VITE_` are exposed to the browser
   - Never put secrets in `VITE_*` variables
   - Only use `VITE_*` for public configuration

4. **Supabase Keys**
   - `SUPABASE_ANON_KEY`: Safe to expose (has RLS protection)
   - `SUPABASE_SERVICE_ROLE_KEY`: Keep secret! Never expose

## ✅ Verification

### Check Local Environment
```bash
# Start the dev server
npm run dev

# Check console output for:
# ✅ Using better-sqlite3 database (local development)
# or
# ✅ Using JSON database fallback (local development)
```

### Check Production Environment
1. Deploy to Vercel
2. Check Vercel logs for:
   ```
   ✅ Using Supabase PostgreSQL database (production)
   ```
3. Test webhook generation and requests

## 🐛 Troubleshooting

### Error: "Supabase credentials not found"
- **Cause**: `SUPABASE_URL` or `SUPABASE_ANON_KEY` not set
- **Fix**: Set both variables in Vercel Dashboard

### Error: "Cannot read properties of null"
- **Cause**: Database not initialized
- **Fix**: Ensure `initDb()` is called (should be automatic)

### Error: "CORS policy blocked"
- **Cause**: `CLIENT_URL` not set correctly
- **Fix**: Set `CLIENT_URL` to your frontend URL

### Frontend can't connect to API
- **Cause**: `VITE_API_URL` not set correctly
- **Fix**: 
  - Local: `http://localhost:3001/api`
  - Production: `/api` (relative path)

### Socket.io connection fails
- **Cause**: `VITE_SOCKET_URL` not set correctly
- **Fix**: Set to your server URL (same as `BASE_URL`)

## 📚 Related Documentation

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Complete deployment guide
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Supabase setup instructions
- [EXAMPLES.md](./EXAMPLES.md) - Code examples
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Quick reference
