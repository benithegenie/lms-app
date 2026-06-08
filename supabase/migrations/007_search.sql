-- ============================================================
-- LMS — Wiki search (migration 007)
-- Run AFTER 001. Safe to re-run.
-- Adds a plain-text column to article_content kept in sync by a trigger,
-- so all article content (existing + future) is searchable.
-- ============================================================

ALTER TABLE article_content ADD COLUMN IF NOT EXISTS search_text TEXT;

-- Extract all Tiptap text nodes from the JSONB content into plain text.
CREATE OR REPLACE FUNCTION article_content_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text := (
    SELECT string_agg(t #>> '{}', ' ')
    FROM jsonb_path_query(coalesce(NEW.content, '{}'::jsonb), '$.**.text') AS t
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_article_search_text ON article_content;
CREATE TRIGGER trg_article_search_text
  BEFORE INSERT OR UPDATE ON article_content
  FOR EACH ROW EXECUTE FUNCTION article_content_search_text();

-- Backfill existing rows (fires the trigger)
UPDATE article_content SET content = content;

-- Trigram index for fast ILIKE search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_article_search_text
  ON article_content USING gin (search_text gin_trgm_ops);
