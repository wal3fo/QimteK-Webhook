# Deployment Guide: QimteK Hooks on Vercel with Supabase

This guide covers deploying QimteK Hooks to Vercel with Supabase PostgreSQL database.

## Quick Start

1. **Set up Supabase** (5 minutes)
   - Follow [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
   - Get your Supabase URL and API keys

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Vercel environment variables**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `NODE_ENV=production`

4. **Deploy**
   ```bash
   git push
   ```
   Vercel will automatically deploy!

## How It Works

### Environment Detection

The application automatically detects the environment:

- **Production (Vercel)**: Uses Supabase PostgreSQL when `SUPABASE_URL` is set
- **Local Development**: Uses SQLite or JSON file storage (no Supabase needed)

### Database Adapter Pattern

All database operations go through a unified adapter that:
- Works with SQLite (local dev)
- Works with JSON files (fallback)
- Works with Supabase PostgreSQL (production)

No code changes needed - just set environment variables!

## Environment Variables

### Required for Production (Vercel)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
NODE_ENV=production
```

### Optional

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Only if you need to bypass RLS
BASE_URL=https://your-domain.vercel.app  # Your Vercel deployment URL
```

### Local Development

```env
NODE_ENV=development
# Don't set SUPABASE_URL to use local storage
```

## Database Schema

The Supabase migration creates:

- `webhooks` table - stores webhook tokens and metadata
- `requests` table - stores incoming webhook requests
- Indexes for performance
- Row Level Security policies (currently permissive)

See `supabase/migrations/001_initial_schema.sql` for the full schema.

## Troubleshooting

### "Supabase credentials not found"
- Check environment variables in Vercel dashboard
- Ensure variables are set for the correct environment (Production)

### "relation does not exist"
- Run the migration SQL in Supabase SQL Editor
- Check that tables exist in Supabase Table Editor

### Local dev using Supabase instead of local storage
- Remove `SUPABASE_URL` from `.env` file
- Or set `NODE_ENV=development`

### Build fails on Vercel
- Check build logs for errors
- Ensure `@supabase/supabase-js` is in dependencies
- Verify TypeScript compilation passes locally

## Migration from Local Storage

If you have existing data in local JSON/SQLite:

1. Export your data (if needed)
2. Set up Supabase and run migration
3. Deploy to Vercel with Supabase credentials
4. Old local data will remain for local dev, new data goes to Supabase in production

## Cost Estimate

- **Supabase Free Tier**: 
  - 500 MB database
  - 2 GB bandwidth/month
  - Unlimited API requests
  - Perfect for development and small projects

- **Vercel Free Tier**:
  - 100 GB bandwidth/month
  - Serverless functions
  - Perfect for this use case

**Total: $0/month for small to medium usage!**

## Security Notes

- Never commit `SUPABASE_SERVICE_ROLE_KEY` to git
- `SUPABASE_ANON_KEY` is safe to expose (it's public)
- Consider tightening RLS policies for production
- Use environment variables for all secrets

## Support

For issues:
1. Check [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
2. Check Vercel deployment logs
3. Check Supabase logs in dashboard
4. Verify environment variables are set correctly
