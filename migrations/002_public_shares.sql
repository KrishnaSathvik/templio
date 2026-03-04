-- 002_public_shares.sql
-- Public, read-only share links for snippets

CREATE TABLE IF NOT EXISTS public_shares (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snippet_id BIGINT NOT NULL REFERENCES snippets(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  html_code TEXT NOT NULL,
  screenshot TEXT,
  tags TEXT[] DEFAULT '{}',
  collection TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (snippet_id, user_id)
);

ALTER TABLE public_shares ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'public_shares'
      AND policyname = 'Users manage own shares'
  ) THEN
    CREATE POLICY "Users manage own shares"
      ON public_shares
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'public_shares'
      AND policyname = 'Public can read shares'
  ) THEN
    CREATE POLICY "Public can read shares"
      ON public_shares
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_public_shares_token ON public_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_public_shares_snippet ON public_shares(snippet_id);

