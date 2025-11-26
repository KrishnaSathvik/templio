# Supabase Setup Guide

This app uses Supabase for cloud storage, so your snippets are saved in the cloud and accessible from any device.

## Step 1: Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub, Google, or email
4. Create a new project (it's free!)

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy your **Project URL** and **anon/public key**
3. You'll need these for the next step

## Step 3: Create the Database Table

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Paste this SQL and click **Run**:

```sql
-- Create snippets table
CREATE TABLE snippets (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  html_code TEXT NOT NULL,
  screenshot TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE snippets ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own snippets
CREATE POLICY "Users can view own snippets"
  ON snippets FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own snippets
CREATE POLICY "Users can insert own snippets"
  ON snippets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own snippets
CREATE POLICY "Users can update own snippets"
  ON snippets FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can delete their own snippets
CREATE POLICY "Users can delete own snippets"
  ON snippets FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_snippets_user_id ON snippets(user_id);
CREATE INDEX idx_snippets_created_at ON snippets(created_at);
CREATE INDEX idx_snippets_is_favorite ON snippets(is_favorite) WHERE is_favorite = true;
```

## Step 3.5: Add Favorite Field (Migration)

If you already have the snippets table, run this migration to add the favorite feature:

```sql
-- Add is_favorite column
ALTER TABLE snippets ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Create index for faster favorite queries
CREATE INDEX IF NOT EXISTS idx_snippets_is_favorite ON snippets(is_favorite) WHERE is_favorite = true;
```

## Step 4: Configure Environment Variables

1. Create a `.env` file in the project root (copy from `.env.example`)
2. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. **Important**: Add `.env` to `.gitignore` (already done) to keep your keys safe

## Step 5: Install Dependencies and Run

```bash
pnpm install
pnpm dev
```

## That's it! 🎉

Now your app will:
- ✅ Save snippets to the cloud
- ✅ Sync across all your devices
- ✅ Keep data safe even if you clear browser history
- ✅ Work on mobile and desktop

## Troubleshooting

**"Missing Supabase environment variables" error:**
- Make sure your `.env` file exists and has the correct variable names
- Restart the dev server after creating/updating `.env`

**Can't sign up/login:**
- Check that email confirmation is set up in Supabase (Settings → Auth)
- For development, you can disable email confirmation in Supabase dashboard

**Data not syncing:**
- Check browser console for errors
- Verify your Supabase project is active
- Make sure RLS policies are set up correctly

