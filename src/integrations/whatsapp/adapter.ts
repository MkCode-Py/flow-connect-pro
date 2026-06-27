/**
 * WhatsAppAdapter — contrato neutro entre a UI e o backend de integração real.
 *
 * No MVP, a UI usa `MockWhatsAppAdapter` (QR fake, sem conexão real).
 * Em produção, um backend Node.js (Baileys ou whatsapp-web.js) deve implementar
 * este mesmo contrato e expor endpoints HTTP/WebSocket — o frontend continua
 * consumindo o adapter por trás de uma fina camada HTTP.
 *
 * IMPORTANTE: nenhuma biblioteca real de WhatsApp deve ser importada no frontend.
 */

export type WAStatus =
  | "disconnected"
  | "connecting"
  | "qr_pending"
  | "connected"
  | "reconnecting"
  | "error"
  | "session_expired";

export const WA_STATUS_LABEL: Record<WAStatus, string> = {
  disconnected: "Desconectado",
  connecting: "Conectando",
  qr_pending: "Aguardando QR",
  connected: "Conectado",
  reconnecting: "Reconectando",
  error: "Erro",
  session_expired: "Sessão expirada",
};

export type OutboundMessageType = "text" | "image" | "audio" | "video" | "document" | "contact";

export type OutboundMessage = {
  type: OutboundMessageType;
  body?: string;
  mediaUrl?: string;
  filename?: string;
  caption?: string;
  metadata?: Record<string, unknown>;
};

export type InboundMessage = {
  instanceId: string;
  from: string;
  type: "text" | "image" | "audio" | "video" | "document" | "contact" | "location";
  body?: string;
  mediaUrl?: string;
  receivedAt: Date;
};

export type WAEventMap = {
  "qr.generated": { instanceId: string; qr: string; expiresAt: Date };
  "connection.open": { instanceId: string; phone?: string };
  "connection.closed": { instanceId: string; reason?: string };
  "connection.error": { instanceId: string; message: string };
  "connection.reconnecting": { instanceId: string };
  "session.deleted": { instanceId: string };
  "message.received": InboundMessage;
  "message.sent": { instanceId: string; to: string; id: string };
  "automation.triggered": { instanceId: string; conversationId: string; flowId: string };
  "automation.paused": { instanceId: string; conversationId: string };
  "automation.finished": { instanceId: string; conversationId: string; reason: string };
};

export type WAEvent = keyof WAEventMap;
export type WAEventHandler<E extends WAEvent> = (payload: WAEventMap[E]) => void;
export type Unsubscribe = () => void;

export interface WhatsAppAdapter {
  /** Inicia o handshake / sessão para a instância. Pode emitir `qr.generated`. */
  connectInstance(instanceId: string): Promise<void>;
  /** Solicita um novo QR Code (rotação periódica). */
  generateQrCode(instanceId: string): Promise<{ qr: string; expiresAt: Date }>;
  /** Encerra a sessão; mantém a instância cadastrada. */
  disconnectInstance(instanceId: string): Promise<void>;
  /** Tenta reabrir uma sessão existente. */
  reconnectInstance(instanceId: string): Promise<void>;
  /** Apaga toda a sessão local (force logout). */
  deleteSession(instanceId: string): Promise<void>;
  /** Envia mensagem ao destinatário. */
  sendMessage(instanceId: string, to: string, msg: OutboundMessage): Promise<{ id: string }>;
  /** Status atual conhecido localmente. */
  getStatus(instanceId: string): Promise<WAStatus>;
  /** Assina eventos. */
  on<E extends WAEvent>(event: E, handler: WAEventHandler<E>): Unsubscribe;
}

/**
 * Endpoints HTTP sugeridos para o backend real (referência para o Claude Code):
 *
 *   POST   /api/whatsapp/instances
 *   POST   /api/whatsapp/instances/:id/connect
 *   POST   /api/whatsapp/instances/:id/reconnect
 *   POST   /api/whatsapp/instances/:id/disconnect
 *   DELETE /api/whatsapp/instances/:id/session
 *   DELETE /api/whatsapp/instances/:id
 *   GET    /api/whatsapp/instances/:id/status
 *   GET    /api/whatsapp/instances/:id/qr        (SSE / WebSocket)
 *   POST   /api/whatsapp/instances/:id/send
 *
 * Todos protegidos por owner_id (JWT do Supabase).
 */
