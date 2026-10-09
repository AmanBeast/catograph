-- Phase 11 — Evals
-- Add evaluation score and details to explanations table for live tracking

ALTER TABLE explanations ADD COLUMN IF NOT EXISTS eval_score numeric(3, 2);
ALTER TABLE explanations ADD COLUMN IF NOT EXISTS eval_details jsonb;
