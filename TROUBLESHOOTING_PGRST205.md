# Troubleshooting PGRST205 Error

## Error: `{ code: 'PGRST205', details: null }`

This PostgREST error (PGRST205) typically means "schema not found" or "table not found". Here's how to fix it:

## 🔍 Common Causes

### 1. Tables Don't Exist in Supabase

**Solution:** Run the migration SQL in Supabase:

1. Go to Supabase Dashboard → **SQL Editor**
2. Run `supabase/migrations/001_initial_schema.sql`
3. Verify tables exist: Go to **Table Editor** → Check for `webhooks` and `requests` tables

### 2. Schema Not Specified

**Solution:** The Supabase client now explicitly sets `schema: 'public'` in the configuration.

### 3. Row Level Security (RLS) Blocking Inserts

**Solution:** Check RLS policies:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('webhooks', 'requests');

-- If RLS is blocking, ensure policies allow inserts
SELECT * FROM pg_policies 
WHERE tablename IN ('webhooks', 'requests');
```

The migration should have created permissive policies, but verify they exist.

### 4. Wrong Supabase Credentials

**Solution:** Verify environment variables in Vercel:

- `SUPABASE_URL` - Should be `https://xxxxx.supabase.co`
- `SUPABASE_ANON_KEY` - Should be the anon/public key (not service_role)

### 5. Supabase Project Not Ready

**Solution:** Wait for Supabase project to fully initialize (1-2 minutes after creation).

## ✅ Verification Steps

### Step 1: Check Tables Exist

```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('webhooks', 'requests');
```

Should return both tables.

### Step 2: Check RLS Policies

```sql
-- Run in Supabase SQL Editor
SELECT * FROM pg_policies 
WHERE tablename = 'webhooks';
```

Should show policies allowing all operations.

### Step 3: Test Direct Insert

```sql
-- Run in Supabase SQL Editor
INSERT INTO webhooks (token, expires_at, is_active)
VALUES ('test-token', NOW() + INTERVAL '1 hour', true);
```

If this fails, the issue is with table setup, not the code.

### Step 4: Check Environment Variables

In Vercel Dashboard → Settings → Environment Variables, verify:
- `SUPABASE_URL` is set correctly
- `SUPABASE_ANON_KEY` is set correctly
- Both are set for **Production** environment

## 🔧 Quick Fix

1. **Re-run Migration:**
   ```sql
   -- In Supabase SQL Editor
   -- Drop and recreate tables (if needed)
   DROP TABLE IF EXISTS requests CASCADE;
   DROP TABLE IF EXISTS webhooks CASCADE;
   
   -- Then run 001_initial_schema.sql again
   ```

2. **Verify RLS Policies:**
   ```sql
   -- Ensure policies exist
   CREATE POLICY IF NOT EXISTS "Allow all operations on webhooks" 
   ON webhooks FOR ALL USING (true) WITH CHECK (true);
   
   CREATE POLICY IF NOT EXISTS "Allow all operations on requests" 
   ON requests FOR ALL USING (true) WITH CHECK (true);
   ```

3. **Redeploy:**
   ```bash
   git push
   ```

## 📝 Updated Code

The code has been updated to:
- ✅ Explicitly set `schema: 'public'` in Supabase client
- ✅ Better error logging with full error details
- ✅ Validate data before insertion

## 🐛 Still Having Issues?

1. Check Vercel logs for full error details
2. Verify Supabase project is active (not paused)
3. Check Supabase Dashboard → Settings → API for correct URLs
4. Ensure you're using the **anon** key, not service_role key (unless you need it)

## 📚 Related Documentation

- [Supabase Setup Guide](./SUPABASE_SETUP.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
