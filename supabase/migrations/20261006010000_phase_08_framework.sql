-- Phase 8: Framework adapter support
-- Adds framework column to analyses and updates realtime broadcast trigger

ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS framework text;

CREATE OR REPLACE FUNCTION public.broadcast_analysis_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payload jsonb;
BEGIN
  IF (TG_OP = 'INSERT') OR
     (OLD.stage IS DISTINCT FROM NEW.stage) OR
     (OLD.stage_message IS DISTINCT FROM NEW.stage_message) OR
     (OLD.status IS DISTINCT FROM NEW.status) OR
     (OLD.error_message IS DISTINCT FROM NEW.error_message) OR
     (OLD.framework IS DISTINCT FROM NEW.framework) THEN

    v_payload := jsonb_build_object(
      'analysis_id', NEW.id,
      'status', NEW.status,
      'stage', NEW.stage,
      'stage_message', NEW.stage_message,
      'error_message', NEW.error_message,
      'commit_hash', NEW.commit_hash,
      'framework', NEW.framework,
      'total_files', NEW.total_files,
      'parsed_files', NEW.parsed_files,
      'skipped_files', NEW.skipped_files,
      'coverage_percent', NEW.coverage_percent
    );

    PERFORM realtime.send(
      v_payload,
      'progress',
      'analysis:' || NEW.id::text,
      true
    );

    PERFORM realtime.send(
      v_payload,
      'progress',
      'org:' || NEW.org_id,
      true
    );
  END IF;

  RETURN NEW;
END;
$$;
