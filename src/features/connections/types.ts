import type { WAStatus } from "@/integrations/whatsapp/adapter";

export type WAInstance = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  status: WAStatus;
  last_qr: string | null;
  last_qr_at: string | null;
  connected_phone: string | null;
  session_saved: boolean;
  last_seen_at: string | null;
  last_activity_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type WAInstanceLog = {
  id: string;
  owner_id: string;
  instance_id: string;
  event: string;
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export const LOG_EVENT_LABEL: Record<string, string> = {
  "instance.created": "Instância criada",
  "qr.generated": "Novo QR gerado",
  "connection.mock_connected": "Conexão simulada (mock)",
  "connection.disconnected": "Desconectado",
  "connection.reconnecting": "Reconectando",
  "session.deleted": "Sessão apagada",
  "connection.error": "Erro de conexão",
  "instance.deleted": "Instância removida",
};
