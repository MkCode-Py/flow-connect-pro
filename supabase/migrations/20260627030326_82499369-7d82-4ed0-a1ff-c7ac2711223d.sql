
-- Extend match rule enum
ALTER TYPE keyword_match_rule ADD VALUE IF NOT EXISTS 'contains_any';
ALTER TYPE keyword_match_rule ADD VALUE IF NOT EXISTS 'contains_all';

-- Keywords: add priority, notes, last_match_at
ALTER TABLE public.keywords
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS last_match_at timestamptz;

-- Sequences: add updated_at + body fields
ALTER TABLE public.sequences
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS notes text;

DROP TRIGGER IF EXISTS trg_seq_updated ON public.sequences;
CREATE TRIGGER trg_seq_updated BEFORE UPDATE ON public.sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Webhooks: add updated_at, body, last_tested_at
ALTER TABLE public.webhooks
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS body jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_tested_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_test_result jsonb;

DROP TRIGGER IF EXISTS trg_wh_updated ON public.webhooks;
CREATE TRIGGER trg_wh_updated BEFORE UPDATE ON public.webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
