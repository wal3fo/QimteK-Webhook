# Supabase Setup Guide for QimteK Hooks

This guide will help you set up Supabase PostgreSQL database for production deployment on Vercel.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: QimteK Hooks (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose the closest region to your users
5. Click "Create new project"
6. Wait for the project to be created (takes 1-2 minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (this is your `SUPABASE_URL`)
   - **anon public** key (this is your `SUPABASE_ANON_KEY`)
   - **service_role** key (this is your `SUPABASE_SERVICE_ROLE_KEY`) - Keep this secret!

## Step 3: Run Database Migration

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Click "Run" to execute the migration
5. Verify tables were created by going to **Table Editor**

## Step 4: Configure Environment Variables

### For Local Development (.env file)

Add these to your `.env` file:

```env
# Supabase Configuration (for production)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Local Development (will use SQLite/JSON if Supabase not configured)
NODE_ENV=development
```

### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:
   - `SUPABASE_URL` = Your Supabase project URL
   - `SUPABASE_ANON_KEY` = Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = Your Supabase service role key (optional, use anon key if you prefer)
   - `NODE_ENV` = `production`

## Step 5: Install Dependencies

Run this command to install the Supabase client:

```bash
npm install @supabase/supabase-js
```

## Step 6: Deploy to Vercel

1. Commit your changes:
   ```bash
   git add .
   git commit -m "Add Supabase integration"
   git push
   ```

2. Vercel will automatically deploy with the new environment variables

## How It Works

- **Production (Vercel)**: Automatically uses Supabase PostgreSQL when `SUPABASE_URL` is set
- **Local Development**: Uses SQLite or JSON file storage (no Supabase needed for local dev)

The database adapter automatically detects the environment and uses the appropriate storage solution.

## Troubleshooting

### Error: "Supabase credentials not found"
- Make sure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in your environment variables
- For Vercel, check that variables are set for the correct environment (Production, Preview, Development)

### Error: "relation does not exist"
- Make sure you ran the migration SQL in Supabase SQL Editor
- Check that tables exist in Supabase Table Editor

### Local development still using Supabase
- Set `NODE_ENV=development` in your `.env` file
- Or remove `SUPABASE_URL` from `.env` to force local storage

## Security Notes

- **Never commit** your `SUPABASE_SERVICE_ROLE_KEY` to git
- Use `SUPABASE_ANON_KEY` for most operations (it's safe to expose)
- Use `SUPABASE_SERVICE_ROLE_KEY` only if you need to bypass RLS policies
- The current setup allows all operations - consider adding proper RLS policies for production
