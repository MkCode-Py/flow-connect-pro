/**
 * BaileysWhatsAppAdapter — STUB para o Claude Code implementar em backend Node.js.
 * NÃO importe este arquivo diretamente no frontend. A UI deve continuar usando
 * MockWhatsAppAdapter até que exista uma rota/edge function que exponha o backend real.
 *
 * Recomendação de implementação:
 *  - Use @whiskeysockets/baileys ou whatsapp-web.js num serviço Node separado.
 *  - Persista o estado da sessão (auth state) em filesystem ou bucket privado.
 *  - Exponha os eventos via WebSocket / SSE para o frontend reagir em tempo real.
 *  - Salve mensagens recebidas em `messages` e dispare `processAutomation`.
 *  - Aplique rate limit, fila e idempotência por message-id do WhatsApp.
 */
import type { WhatsAppAdapter, OutboundMessage, WAStatus, WAEvent, WAEventHandler } from "./adapter";

export class BaileysWhatsAppAdapter implements WhatsAppAdapter {
  async connectInstance(_instanceId: string) { throw new Error("TODO: implementar via backend Baileys"); }
  async generateQrCode(_instanceId: string) { throw new Error("TODO: implementar via backend Baileys"); }
  async disconnectInstance(_instanceId: string) { throw new Error("TODO: implementar via backend Baileys"); }
  async deleteSession(_instanceId: string) { throw new Error("TODO: implementar via backend Baileys"); }
  async sendMessage(_instanceId: string, _to: string, _msg: OutboundMessage): Promise<{ id: string }> { throw new Error("TODO"); }
  async getStatus(_instanceId: string): Promise<WAStatus> { return "disconnected"; }
  on<E extends WAEvent>(_event: E, _handler: WAEventHandler<E>) { return () => undefined; }
}
