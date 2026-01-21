# Quick Start: Deploy QimteK Hooks to Vercel

## 🚀 5-Minute Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Supabase (Free)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **Settings** → **API**
4. Copy your **Project URL** and **anon public** key

### Step 3: Run Database Migration

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and click **Run**

### Step 4: Configure Vercel

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add these variables:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
```

### Step 5: Deploy

```bash
git add .
git commit -m "Add Supabase integration"
git push
```

**Done!** 🎉 Your app is now deployed with persistent storage.

## How It Works

- **Local Development**: Uses SQLite/JSON (no Supabase needed)
- **Production (Vercel)**: Automatically uses Supabase PostgreSQL
- **Zero Code Changes**: The adapter handles everything automatically

## Testing Locally

Just run:
```bash
npm run dev
```

It will use local storage. No Supabase needed for local dev!

## Troubleshooting

**"Supabase credentials not found"**
→ Check environment variables in Vercel

**"relation does not exist"**
→ Run the migration SQL in Supabase SQL Editor

**Local dev using Supabase**
→ Remove `SUPABASE_URL` from `.env` or set `NODE_ENV=development`

For more details, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
