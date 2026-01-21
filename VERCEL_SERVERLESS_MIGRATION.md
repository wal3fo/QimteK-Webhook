# Complete Vercel Serverless Migration Guide

## ✅ Migration Complete!

Your project has been fully converted to work with Vercel serverless functions. All server startup code has been removed, and the application is now production-ready for Vercel deployment.

## 📁 Updated Project Structure

```
project-root/
├── api/
│   ├── index.ts              # ✅ Vercel serverless handler (entry point)
│   ├── app.ts                # ✅ Express app (exported as handler)
│   ├── server.ts             # ⚠️  Local dev only (NOT used in Vercel)
│   ├── db-adapter.ts         # ✅ Database adapter (Supabase in prod)
│   ├── db-supabase.ts        # ✅ Supabase implementation
│   ├── db-json.ts            # ⚠️  Local dev only (NOT used in Vercel)
│   ├── routes/
│   │   ├── webhooks.ts       # ✅ Webhook management routes
│   │   ├── webhook-receiver.ts # ✅ Webhook receiver route
│   │   └── auth.ts           # ✅ Auth routes
│   └── utils/
│       └── cleanup.ts        # ✅ Cleanup utility
├── vercel.json               # ✅ Vercel configuration
├── package.json              # ✅ Dependencies
└── env.example               # ✅ Environment variables template
```

## 🔧 Key Changes Made

### 1. ✅ Removed Server Startup Code

**Before:**
```typescript
// ❌ OLD: Manual server startup
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});
```

**After:**
```typescript
// ✅ NEW: Vercel serverless handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
```

### 2. ✅ Express App as Handler

**`api/app.ts`** now exports Express app as a handler (no `app.listen()`):
```typescript
// ✅ Exported as handler for Vercel
export default app
```

### 3. ✅ Removed PORT Configuration

- ❌ Removed `PORT` from production code
- ✅ `api/server.ts` still uses PORT for local development only
- ✅ Vercel automatically handles port assignment

### 4. ✅ Removed Local Filesystem Writes

- ❌ Removed `DB_PATH` usage in production
- ✅ JSON database throws error if used in production
- ✅ SQLite only used in local development
- ✅ Supabase used automatically in production

### 5. ✅ Environment Variables Cleaned

**Production (Vercel) - Required:**
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
NODE_ENV=production
```

**Production (Vercel) - Optional:**
```env
BASE_URL=https://your-app.vercel.app
CLIENT_URL=https://your-app.vercel.app
VITE_API_URL=/api
VITE_SOCKET_URL=https://your-app.vercel.app
```

**Removed from Production:**
- ❌ `PORT` (not needed - Vercel handles this)
- ❌ `DB_PATH` (not needed - uses Supabase)
- ❌ `localhost` URLs (use production URLs)

### 6. ✅ Health Check Endpoint

Added enhanced health check at `/api/health`:
```typescript
app.get('/api/health', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    vercel: !!process.env.VERCEL,
  })
})
```

### 7. ✅ Socket.io Handling

Socket.io gracefully handles serverless environment:
```typescript
// Only works in local dev, not in Vercel serverless
const io = req.app.get('io');
if (io && !process.env.VERCEL) {
  // Emit socket events only in local development
  io.to(`webhook:${token}`).emit('new-request', requestData);
}
```

## 🚀 Deployment Checklist

### Before Deploying

- [x] ✅ All `app.listen()` removed
- [x] ✅ All `PORT` usage removed from production code
- [x] ✅ Express app exported as handler
- [x] ✅ Database uses Supabase in production
- [x] ✅ Local filesystem writes removed
- [x] ✅ Environment variables cleaned
- [x] ✅ Health check endpoint added
- [x] ✅ Socket.io handles serverless gracefully

### Vercel Configuration

1. **Set Environment Variables** in Vercel Dashboard:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   NODE_ENV=production
   BASE_URL=https://your-app.vercel.app
   ```

2. **Deploy**:
   ```bash
   git push
   ```

3. **Verify**:
   ```bash
   curl https://your-app.vercel.app/api/health
   ```

## 📝 How It Works

### Local Development

1. Run `npm run dev`
2. Uses `api/server.ts` to start Express server
3. Uses SQLite or JSON database
4. Socket.io works for real-time updates

### Vercel Production

1. Request arrives → Vercel routes to `/api/index.ts`
2. `api/index.ts` → Initializes database → Calls `api/app.ts`
3. `api/app.ts` → Express routes handle request
4. Uses Supabase PostgreSQL database
5. Socket.io gracefully skips (not available in serverless)

## 🔍 File-by-File Changes

### `api/index.ts` ✅
- Vercel serverless entry point
- Initializes database before handling requests
- Exports default handler function

### `api/app.ts` ✅
- Express app configuration
- No `app.listen()` - exported as handler
- Health check endpoint added
- CORS configured for production

### `api/server.ts` ⚠️
- **Local development only**
- NOT used in Vercel
- Starts HTTP server with Socket.io
- Uses PORT environment variable

### `api/db-adapter.ts` ✅
- Auto-detects environment
- Uses Supabase in production
- Uses SQLite/JSON in local dev
- No DB_PATH in production

### `api/db-json.ts` ✅
- Throws error if used in production
- Only works in local development
- No filesystem writes in Vercel

### `api/routes/webhook-receiver.ts` ✅
- Socket.io checks for Vercel environment
- Gracefully handles missing Socket.io in serverless

## 🧪 Testing

### Test Health Endpoint

```bash
curl https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "environment": "production",
  "vercel": true
}
```

### Test Webhook Generation

```bash
curl -X POST https://your-app.vercel.app/api/webhooks/generate \
  -H "Content-Type: application/json" \
  -d '{"expiresIn": 60}'
```

### Test Webhook Receiver

```bash
curl -X POST https://your-app.vercel.app/api/webhook/YOUR_TOKEN \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## 🐛 Troubleshooting

### Error: "Cannot find module"

**Solution**: Ensure all dependencies are in `package.json` and deployed.

### Error: "Database initialization failed"

**Solution**: Check Supabase environment variables are set in Vercel.

### Error: "EROFS: read-only file system"

**Solution**: This shouldn't happen - JSON database throws error in production. Check you're using Supabase.

### Socket.io Not Working

**Expected**: Socket.io doesn't work in Vercel serverless. Use polling or separate WebSocket service.

## 📚 Additional Resources

- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Supabase Setup Guide](./SUPABASE_SETUP.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

## ✅ Summary

Your project is now **100% serverless-ready** for Vercel:

- ✅ No server startup code
- ✅ No PORT configuration
- ✅ No local filesystem writes
- ✅ Supabase for production database
- ✅ Express exported as handler
- ✅ Health check endpoint
- ✅ Production-safe environment variables

**Just deploy to Vercel and it works!** 🚀
