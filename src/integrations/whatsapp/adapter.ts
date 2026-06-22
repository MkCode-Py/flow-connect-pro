/**
 * WhatsAppAdapter — contrato neutro entre a UI e o backend de integração real.
 *
 * No MVP, usamos `MockWhatsAppAdapter` (fake QR, sem conexão real).
 * Em produção, o Claude Code deve implementar `BaileysWhatsAppAdapter`
 * (ou whatsapp-web.js) num backend Node.js separado, mantendo este contrato.
 */

export type WAStatus = "disconnected" | "qr" | "connecting" | "connected" | "error";

export type OutboundMessage = {
  type: "text" | "image" | "video" | "audio" | "file" | "contact";
  body?: string;
  mediaUrl?: string;
  caption?: string;
};

export type InboundMessage = {
  instanceId: string;
  from: string;
  type: "text" | "image" | "video" | "audio" | "file" | "contact" | "location";
  body?: string;
  mediaUrl?: string;
  receivedAt: Date;
};

export type WAEventMap = {
  "qr.generated": { instanceId: string; qr: string; expiresAt: Date };
  "connection.open": { instanceId: string };
  "connection.closed": { instanceId: string; reason?: string };
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
  /** Apaga toda a sessão local (force logout). */
  deleteSession(instanceId: string): Promise<void>;
  /** Envia mensagem ao destinatário. */
  sendMessage(instanceId: string, to: string, msg: OutboundMessage): Promise<{ id: string }>;
  /** Status atual conhecido localmente. */
  getStatus(instanceId: string): Promise<WAStatus>;
  /** Assina eventos. */
  on<E extends WAEvent>(event: E, handler: WAEventHandler<E>): Unsubscribe;
}
