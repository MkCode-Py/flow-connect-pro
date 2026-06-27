
-- Adicionar valores aos enums existentes
ALTER TYPE public.message_direction ADD VALUE IF NOT EXISTS 'system';
ALTER TYPE public.message_sent_by ADD VALUE IF NOT EXISTS 'system';
ALTER TYPE public.conversation_status ADD VALUE IF NOT EXISTS 'human_required';

-- Contatos: empresa e observações internas
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Conversas: preview da última mensagem e contagem mockada de não lidas
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_message_preview text,
  ADD COLUMN IF NOT EXISTS unread_count integer NOT NULL DEFAULT 0;

-- Quick replies: título, ativo, updated_at
ALTER TABLE public.quick_replies
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS quick_replies_set_updated_at ON public.quick_replies;
CREATE TRIGGER quick_replies_set_updated_at
  BEFORE UPDATE ON public.quick_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tags: updated_at
ALTER TABLE public.tags
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS tags_set_updated_at ON public.tags;
CREATE TRIGGER tags_set_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atalho único por usuário em quick_replies
CREATE UNIQUE INDEX IF NOT EXISTS quick_replies_owner_shortcut_uniq
  ON public.quick_replies (owner_id, lower(shortcut));

-- Índices úteis para inbox
CREATE INDEX IF NOT EXISTS messages_conv_created_idx
  ON public.messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS conversations_owner_last_msg_idx
  ON public.conversations (owner_id, last_message_at DESC NULLS LAST);
