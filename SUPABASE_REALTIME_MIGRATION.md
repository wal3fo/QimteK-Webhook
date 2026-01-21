# Supabase Realtime Migration Guide

## ✅ Complete Migration from Socket.IO to Supabase Realtime

This guide documents the complete migration from Socket.IO to Supabase Realtime, making the application fully compatible with Vercel serverless functions.

## 🎯 What Changed

### 1. ✅ Removed Socket.IO from Backend

**Before:**
- `api/server.ts` had Socket.IO server setup
- `api/routes/webhook-receiver.ts` emitted socket events
- `api/app.ts` stored Socket.IO instance

**After:**
- ✅ All Socket.IO code removed from backend
- ✅ Webhook receiver stores data in Supabase (real-time updates happen automatically)
- ✅ No manual socket emission needed

### 2. ✅ Replaced Socket.IO with Supabase Realtime in Frontend

**Before:**
- `src/hooks/useSocket.ts` - Socket.IO client
- `src/hooks/useWebhook.ts` - Used Socket.IO for real-time updates

**After:**
- ✅ `src/hooks/useSupabaseRealtime.ts` - Supabase Realtime subscriptions
- ✅ `src/hooks/useWebhook.ts` - Uses Supabase Realtime instead
- ✅ Connection status shows Supabase Realtime subscription status

### 3. ✅ Updated Dependencies

**Removed:**
- `socket.io` (backend)
- `socket.io-client` (frontend)

**Kept:**
- `@supabase/supabase-js` (already installed)

## 📁 Updated File Structure

```
project-root/
├── api/
│   ├── index.ts              ✅ Vercel serverless handler
│   ├── app.ts                ✅ Express app (no Socket.IO)
│   ├── server.ts             ✅ Local dev only (Socket.IO removed)
│   ├── routes/
│   │   └── webhook-receiver.ts ✅ Stores to Supabase (no socket emission)
│   └── ...
├── src/
│   ├── hooks/
│   │   ├── useSupabaseRealtime.ts  ✅ NEW: Supabase Realtime hook
│   │   ├── useWebhook.ts            ✅ UPDATED: Uses Supabase Realtime
│   │   └── useSocket.ts             ❌ REMOVED (replaced by useSupabaseRealtime)
│   └── ...
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql   ✅ Existing schema
│       └── 002_enable_realtime.sql  ✅ NEW: Enables Realtime
└── package.json                     ✅ Socket.IO dependencies removed
```

## 🔧 Setup Instructions

### Step 1: Run Supabase Migration

1. Go to Supabase Dashboard → **SQL Editor**
2. Run the migration:
   ```sql
   -- Enable Realtime for requests table
   ALTER PUBLICATION supabase_realtime ADD TABLE requests;
   ```

Or use the migration file: `supabase/migrations/002_enable_realtime.sql`

### Step 2: Update Environment Variables

**Frontend (.env or Vercel):**
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Backend (Vercel):**
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
NODE_ENV=production
```

### Step 3: Install Dependencies

```bash
npm install
```

Socket.IO packages are removed, so they won't be installed.

### Step 4: Deploy

```bash
git add .
git commit -m "Migrate from Socket.IO to Supabase Realtime"
git push
```

## 🔍 How It Works

### Backend (Webhook Receiver)

1. **Request arrives** → `POST /api/webhook/:token`
2. **Store in Supabase** → Insert into `requests` table
3. **Supabase Realtime** → Automatically broadcasts INSERT event
4. **No manual socket emission needed!**

```typescript
// api/routes/webhook-receiver.ts
// Store request in Supabase
await database.prepare(`
  INSERT INTO requests (...)
  VALUES (...)
`).run(...);

// Supabase Realtime automatically broadcasts this to subscribed clients!
// No socket.io.emit() needed!
```

### Frontend (Real-time Updates)

1. **Subscribe to Realtime** → `useSupabaseRealtime(webhookToken)`
2. **Listen for INSERT events** → Filtered by `webhook_token`
3. **Update UI** → New requests appear automatically

```typescript
// src/hooks/useSupabaseRealtime.ts
const channel = supabase
  .channel(`webhook-requests:${webhookToken}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'requests',
    filter: `webhook_token=eq.${webhookToken}`,
  }, (payload) => {
    // New request received!
    onNewRequest(payload.new);
  })
  .subscribe();
```

## 📊 Connection Status

The connection indicator now shows:

- **"Connected (Supabase Realtime)"** = Realtime subscription is active
- **"Disconnected (Realtime subscription failed)"** = Subscription failed (with active webhook)
- **"Not connected (No active webhook)"** = No webhook generated yet

## ✅ Benefits

1. **✅ Works on Vercel** - No persistent WebSocket server needed
2. **✅ Managed Service** - Supabase handles Realtime infrastructure
3. **✅ Automatic Updates** - No manual socket emission code
4. **✅ Reliable** - Supabase Realtime is production-ready
5. **✅ Scalable** - Handles many concurrent subscriptions

## 🧪 Testing

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

### Verify Realtime Subscription

1. Open browser DevTools → Console
2. Generate a webhook URL
3. Look for: `"Supabase Realtime subscription status: SUBSCRIBED"`
4. Send a test webhook
5. Check console for: `"New webhook request received via Realtime"`

## 🐛 Troubleshooting

### Connection Shows "Disconnected"

1. **Check Environment Variables:**
   ```bash
   # Frontend
   echo $VITE_SUPABASE_URL
   echo $VITE_SUPABASE_ANON_KEY
   ```

2. **Check Supabase Realtime is Enabled:**
   - Go to Supabase Dashboard → Database → Replication
   - Verify `requests` table is enabled

3. **Check Browser Console:**
   - Look for Realtime subscription errors
   - Check for CORS issues

### Requests Not Appearing in Real-time

1. **Verify Realtime Migration:**
   ```sql
   -- Check if requests table is in Realtime publication
   SELECT * FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime' AND tablename = 'requests';
   ```

2. **Check Subscription Status:**
   - Open browser console
   - Look for subscription status logs

3. **Fallback Polling:**
   - The app automatically polls every 5 seconds if Realtime fails
   - Requests will still appear, just with a slight delay

## 📚 Additional Resources

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Supabase Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)

## ✅ Migration Checklist

- [x] ✅ Removed Socket.IO from backend
- [x] ✅ Removed Socket.IO from frontend
- [x] ✅ Created Supabase Realtime hook
- [x] ✅ Updated useWebhook to use Realtime
- [x] ✅ Updated connection status indicator
- [x] ✅ Removed Socket.IO dependencies
- [x] ✅ Created Realtime migration SQL
- [x] ✅ Updated webhook receiver (no socket emission)
- [x] ✅ Tested locally
- [x] ✅ Ready for Vercel deployment

## 🎉 Result

Your application now:
- ✅ Works on Vercel serverless functions
- ✅ Uses Supabase Realtime for real-time updates
- ✅ Shows accurate connection status
- ✅ Never shows "Disconnected" due to platform limitations
- ✅ Production-ready and scalable

**The migration is complete!** 🚀
