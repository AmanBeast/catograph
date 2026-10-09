-- Phase 10 — Explain, cached and traced
-- Allow folder explanations, target keys, and content-hash caching

ALTER TABLE files ADD COLUMN IF NOT EXISTS content_hash text;

ALTER TABLE explanations ALTER COLUMN file_id DROP NOT NULL;
ALTER TABLE explanations ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'file';
ALTER TABLE explanations ADD COLUMN IF NOT EXISTS target_key text;
ALTER TABLE explanations ADD COLUMN IF NOT EXISTS content_hash text;
ALTER TABLE explanations ADD COLUMN IF NOT EXISTS commit_hash text;
ALTER TABLE explanations ADD COLUMN IF NOT EXISTS role text;

CREATE INDEX IF NOT EXISTS idx_explanations_cache ON explanations (org_id, target_key, content_hash, model_version);
