-- 001_snippets.sql
-- Base snippets schema + metadata/search improvements

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS snippets (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  html_code TEXT NOT NULL,
  screenshot TEXT,
  is_favorite BOOLEAN DEFAULT false,
  collection TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE snippets ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
ALTER TABLE snippets ADD COLUMN IF NOT EXISTS collection TEXT;
ALTER TABLE snippets ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

ALTER TABLE snippets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'snippets'
      AND policyname = 'Users can view own snippets'
  ) THEN
    CREATE POLICY "Users can view own snippets"
      ON snippets
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'snippets'
      AND policyname = 'Users can insert own snippets'
  ) THEN
    CREATE POLICY "Users can insert own snippets"
      ON snippets
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'snippets'
      AND policyname = 'Users can update own snippets'
  ) THEN
    CREATE POLICY "Users can update own snippets"
      ON snippets
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'snippets'
      AND policyname = 'Users can delete own snippets'
  ) THEN
    CREATE POLICY "Users can delete own snippets"
      ON snippets
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_snippets_user_id ON snippets(user_id);
CREATE INDEX IF NOT EXISTS idx_snippets_created_at ON snippets(created_at);
CREATE INDEX IF NOT EXISTS idx_snippets_is_favorite ON snippets(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_snippets_collection ON snippets(collection);
CREATE INDEX IF NOT EXISTS idx_snippets_tags_gin ON snippets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_snippets_search_trgm
  ON snippets USING GIN ((coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(html_code, '')) gin_trgm_ops);

