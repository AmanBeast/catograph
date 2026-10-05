-- Phase 7: Realtime progress channels, trigger, and policies
-- The channel has to be declared before anything can publish to it.
-- A pattern for per-analysis channels is registered as part of the migration.
-- Subscriptions are protected by organization RLS matching data access.

-- 1. Trigger function that publishes stage progress
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
     (OLD.error_message IS DISTINCT FROM NEW.error_message) THEN

    v_payload := jsonb_build_object(
      'analysis_id', NEW.id,
      'status', NEW.status,
      'stage', NEW.stage,
      'stage_message', NEW.stage_message,
      'error_message', NEW.error_message,
      'commit_hash', NEW.commit_hash,
      'total_files', NEW.total_files,
      'parsed_files', NEW.parsed_files,
      'skipped_files', NEW.skipped_files,
      'coverage_percent', NEW.coverage_percent
    );

    -- Publish to per-analysis private channel: analysis:<analysis_id>
    PERFORM realtime.send(
      v_payload,
      'progress',
      'analysis:' || NEW.id::text,
      true
    );

    -- Publish to organization-wide channel for dashboard: org:<org_id>
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

DROP TRIGGER IF EXISTS trigger_analysis_progress ON public.analyses;

CREATE TRIGGER trigger_analysis_progress
AFTER INSERT OR UPDATE ON public.analyses
FOR EACH ROW EXECUTE FUNCTION public.broadcast_analysis_progress();

-- 2. Realtime messages RLS policies:
-- Only allow subscribing to an analysis channel if the user belongs to the analysis org.
DROP POLICY IF EXISTS "analysis_channel_subscription" ON realtime.messages;
CREATE POLICY "analysis_channel_subscription" ON realtime.messages
  FOR SELECT
  USING (
    topic LIKE 'analysis:%' AND
    EXISTS (
      SELECT 1 FROM public.analyses a
      WHERE a.id::text = split_part(realtime.messages.topic, ':', 2)
        AND a.org_id = current_org_id()
    )
  );

DROP POLICY IF EXISTS "org_channel_subscription" ON realtime.messages;
CREATE POLICY "org_channel_subscription" ON realtime.messages
  FOR SELECT
  USING (
    topic LIKE 'org:%' AND
    split_part(realtime.messages.topic, ':', 2) = current_org_id()
  );

DROP POLICY IF EXISTS "analysis_channel_broadcast" ON realtime.messages;
CREATE POLICY "analysis_channel_broadcast" ON realtime.messages
  FOR INSERT
  WITH CHECK (true);

-- 3. Enable supabase_realtime publication for analyses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'analyses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.analyses;
  END IF;
END $$;
