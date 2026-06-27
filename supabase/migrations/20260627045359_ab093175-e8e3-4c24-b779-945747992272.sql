
-- Add new statuses to wa_instance_status enum
ALTER TYPE public.wa_instance_status ADD VALUE IF NOT EXISTS 'qr_pending';
ALTER TYPE public.wa_instance_status ADD VALUE IF NOT EXISTS 'reconnecting';
ALTER TYPE public.wa_instance_status ADD VALUE IF NOT EXISTS 'session_expired';

-- Add columns to whatsapp_instances
ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS connected_phone text,
  ADD COLUMN IF NOT EXISTS session_saved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_qr_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_message text;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_wa_instances_updated_at ON public.whatsapp_instances;
CREATE TRIGGER trg_wa_instances_updated_at
BEFORE UPDATE ON public.whatsapp_instances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Connection logs table (mock + future real)
CREATE TABLE IF NOT EXISTS public.wa_instance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  event text NOT NULL,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_instance_logs TO authenticated;
GRANT ALL ON public.wa_instance_logs TO service_role;

ALTER TABLE public.wa_instance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner manages own wa_instance_logs" ON public.wa_instance_logs;
CREATE POLICY "Owner manages own wa_instance_logs" ON public.wa_instance_logs
FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_wa_instance_logs_instance ON public.wa_instance_logs(instance_id, created_at DESC);
