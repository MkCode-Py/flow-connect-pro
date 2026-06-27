-- Etapa 9: company_settings + custom_fields.type

CREATE TYPE public.custom_field_type AS ENUM ('text', 'number', 'email', 'phone', 'date', 'boolean');

ALTER TABLE public.custom_fields
  ADD COLUMN IF NOT EXISTS type public.custom_field_type NOT NULL DEFAULT 'text';

CREATE TABLE public.company_settings (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Empresa
  company_name text,
  public_name text,
  phone text,
  website text,
  description text,
  -- Atendimento
  service_active boolean NOT NULL DEFAULT true,
  service_hours jsonb NOT NULL DEFAULT '{"mon":{"enabled":true,"start":"09:00","end":"18:00"},"tue":{"enabled":true,"start":"09:00","end":"18:00"},"wed":{"enabled":true,"start":"09:00","end":"18:00"},"thu":{"enabled":true,"start":"09:00","end":"18:00"},"fri":{"enabled":true,"start":"09:00","end":"18:00"},"sat":{"enabled":false,"start":"09:00","end":"13:00"},"sun":{"enabled":false,"start":"09:00","end":"13:00"}}'::jsonb,
  off_hours_message text DEFAULT 'Olá! Nosso atendimento está fora do horário. Retornaremos em breve.',
  -- Automação
  automation_enabled boolean NOT NULL DEFAULT true,
  max_auto_messages_per_conversation integer NOT NULL DEFAULT 20,
  default_message_delay_ms integer NOT NULL DEFAULT 800,
  on_human_handoff text NOT NULL DEFAULT 'pause_automation',
  on_paused_behavior text NOT NULL DEFAULT 'ignore',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their company settings"
  ON public.company_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER company_settings_set_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();