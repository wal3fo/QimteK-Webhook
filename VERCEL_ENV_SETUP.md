# Vercel Environment Variables Setup

## Required Environment Variables

For your webhook project to work on Vercel, you **MUST** set the following environment variables:

### 1. Supabase Configuration (REQUIRED)

These are **required** for the application to work in production:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**OR** (if you prefer to use anon key, though SERVICE_ROLE_KEY is recommended):

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### 2. Production Configuration

```
NODE_ENV=production
```

**Note:** Vercel automatically sets `NODE_ENV=production` and `VERCEL=1`, so you don't need to set these manually.

### 3. Optional Configuration

```
BASE_URL=https://your-app.vercel.app
```

## How to Set Environment Variables in Vercel

### Step 1: Go to Vercel Dashboard

1. Navigate to [vercel.com](https://vercel.com)
2. Sign in to your account
3. Select your project (`qimhooks`)

### Step 2: Open Environment Variables

1. Click on **Settings** (in the project navigation)
2. Click on **Environment Variables** (in the left sidebar)

### Step 3: Add Variables

For each variable:

1. Click **Add New**
2. Enter the **Key** (e.g., `SUPABASE_URL`)
3. Enter the **Value** (e.g., `https://xxxxx.supabase.co`)
4. Select **Environment(s)**:
   - ✅ **Production** (required)
   - ✅ **Preview** (optional, for preview deployments)
   - ✅ **Development** (optional, for local dev)
5. Click **Save**

### Step 4: Get Supabase Credentials

1. Go to [supabase.com](https://supabase.com)
2. Sign in and select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (recommended)
   - **anon public** key → `SUPABASE_ANON_KEY` (alternative)

**Important:** 
- `SERVICE_ROLE_KEY` bypasses Row Level Security (RLS) and is recommended for serverless functions
- `ANON_KEY` respects RLS policies and may require additional configuration

### Step 5: Redeploy

After setting environment variables:

1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger automatic deployment

## Environment Variable Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SUPABASE_URL` | ✅ Yes | Supabase project URL | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes* | Service role key (bypasses RLS) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_ANON_KEY` | ⚠️ Alternative | Anonymous key (respects RLS) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `NODE_ENV` | Auto-set | Environment mode | `production` (auto) |
| `BASE_URL` | Optional | Base URL for webhook generation | `https://your-app.vercel.app` |

*Either `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY` is required. `SERVICE_ROLE_KEY` is recommended.

## Verification

After setting environment variables and redeploying:

1. Check **Logs** tab in Vercel Dashboard
2. Look for: `✅ Using Supabase PostgreSQL database (production)`
3. Test webhook generation:
   ```bash
   curl -X POST https://your-app.vercel.app/api/webhooks/generate \
     -H "Content-Type: application/json" \
     -d '{"expiresIn": 60}'
   ```

## Troubleshooting

### Error: "Supabase credentials not found"

**Solution:** Verify environment variables are set:
- Go to Settings → Environment Variables
- Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Ensure they're enabled for **Production** environment
- Redeploy after adding variables

### Error: "PGRST205" or "schema not found"

**Solution:** 
1. Verify tables exist in Supabase (run migration SQL)
2. Check RLS policies allow operations
3. See [TROUBLESHOOTING_PGRST205.md](./TROUBLESHOOTING_PGRST205.md)

### Error: "JSON database cannot be used in production"

**Solution:** This means Supabase is not configured. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel.

## Security Notes

1. **Never commit** environment variables to git
2. **Use SERVICE_ROLE_KEY** only in serverless functions (backend)
3. **Never expose SERVICE_ROLE_KEY** to frontend
4. **ANON_KEY** can be used in frontend (it respects RLS)

## Quick Setup Checklist

- [ ] Supabase project created
- [ ] Migration SQL executed in Supabase
- [ ] `SUPABASE_URL` set in Vercel
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in Vercel
- [ ] Variables enabled for Production environment
- [ ] Project redeployed
- [ ] Tested webhook generation
- [ ] Verified logs show Supabase connection

## Related Documentation

- [Supabase Setup Guide](./SUPABASE_SETUP.md)
- [Troubleshooting PGRST205](./TROUBLESHOOTING_PGRST205.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
