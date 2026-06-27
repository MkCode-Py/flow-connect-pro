export type ConversationStatus = "open" | "pending" | "resolved" | "human_required";
export type MessageDirection = "in" | "out" | "system";
export type MessageSender = "contact" | "bot" | "human" | "system";

export type InboxConversation = {
  id: string;
  owner_id: string;
  contact_id: string;
  status: ConversationStatus;
  automation_paused: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
  contact: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    company: string | null;
    notes: string | null;
    automation_paused: boolean;
    custom_fields: Record<string, unknown>;
  };
  tags: Array<{ id: string; name: string; color: string }>;
};

export type InboxMessage = {
  id: string;
  conversation_id: string;
  direction: MessageDirection;
  sent_by: MessageSender;
  body: string | null;
  media_url: string | null;
  created_at: string;
};

export const STATUS_LABEL: Record<ConversationStatus, string> = {
  open: "Aberta",
  pending: "Pendente",
  resolved: "Resolvida",
  human_required: "Aguardando humano",
};
