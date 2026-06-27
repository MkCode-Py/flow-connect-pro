/**
 * BaileysWhatsAppAdapter — STUB para o Claude Code implementar em backend Node.js.
 *
 * ⚠️ NÃO IMPORTE ESTE ARQUIVO NO FRONTEND.
 * O frontend deve continuar usando `MockWhatsAppAdapter` até existir um backend
 * Node.js que exponha rotas seguras consumindo este adapter.
 *
 * Recomendação de implementação:
 *   - Use @whiskeysockets/baileys (preferido) ou whatsapp-web.js.
 *   - Persista o auth state em filesystem privado / bucket privado / Postgres.
 *   - Exponha eventos via WebSocket ou Server-Sent Events para o frontend reagir em tempo real.
 *   - Persista mensagens recebidas em `messages` e dispare `processAutomation`.
 *   - Aplique rate limit, fila e idempotência por message-id do WhatsApp.
 *   - Proteja todas as rotas por owner_id (JWT do Supabase).
 *   - NÃO implemente disparo em massa, broadcast ou campanhas.
 *     Envios devem ocorrer apenas em conversa individual ou automação reativa.
 *
 * Checklist para o Claude Code:
 *   [ ] Criar backend Node.js dedicado (ex.: Fastify + Socket.io).
 *   [ ] Instalar @whiskeysockets/baileys e qrcode.
 *   [ ] Implementar auth state persistente (useMultiFileAuthState ou custom).
 *   [ ] Expor endpoints HTTP descritos em `adapter.ts`.
 *   [ ] Criar canal WebSocket/SSE por instância para QR/status em tempo real.
 *   [ ] Proteger todos os endpoints por usuário (validar JWT Supabase).
 *   [ ] Implementar reconexão automática (escutar connection.update).
 *   [ ] Salvar messages.upsert na tabela `messages`.
 *   [ ] Chamar matchKeywords + FlowEngine ao receber mensagem (se automação ativa).
 *   [ ] Enviar respostas via sock.sendMessage().
 *   [ ] Persistir logs em `wa_instance_logs`.
 *   [ ] Aplicar rate limit (ex.: 1 msg/s por instância).
 */
import type {
  WhatsAppAdapter,
  OutboundMessage,
  WAStatus,
  WAEvent,
  WAEventHandler,
} from "./adapter";

export class BaileysWhatsAppAdapter implements WhatsAppAdapter {
  async connectInstance(_instanceId: string): Promise<void> {
    // TODO: inicializar socket Baileys; carregar auth state; assinar connection.update.
    throw new Error("Backend Baileys ainda não implementado.");
  }

  async generateQrCode(_instanceId: string): Promise<{ qr: string; expiresAt: Date }> {
    // TODO: capturar evento connection.update { qr } e devolver para o frontend.
    throw new Error("Backend Baileys ainda não implementado.");
  }

  async disconnectInstance(_instanceId: string): Promise<void> {
    // TODO: chamar sock.logout(); manter auth state se possível.
    throw new Error("Backend Baileys ainda não implementado.");
  }

  async reconnectInstance(_instanceId: string): Promise<void> {
    // TODO: tentar reabrir conexão com auth state existente.
    throw new Error("Backend Baileys ainda não implementado.");
  }

  async deleteSession(_instanceId: string): Promise<void> {
    // TODO: apagar arquivos/registros de auth state e marcar session_saved=false.
    throw new Error("Backend Baileys ainda não implementado.");
  }

  async sendMessage(
    _instanceId: string,
    _to: string,
    _msg: OutboundMessage,
  ): Promise<{ id: string }> {
    // TODO: sock.sendMessage(jid, payload); persistir id retornado.
    throw new Error("Backend Baileys ainda não implementado.");
  }

  async getStatus(_instanceId: string): Promise<WAStatus> {
    // TODO: consultar estado interno do socket.
    return "disconnected";
  }

  on<E extends WAEvent>(_event: E, _handler: WAEventHandler<E>) {
    // TODO: propagar eventos do Baileys (connection.update, messages.upsert, ...).
    return () => undefined;
  }
}
