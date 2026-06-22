/**
 * MockWhatsAppAdapter — usado pela UI no MVP.
 * Não envia nada; gera QR fakes e simula transições de estado.
 */
import type { WhatsAppAdapter, WAEvent, WAEventHandler, WAEventMap, WAStatus, OutboundMessage, Unsubscribe } from "./adapter";

type Listener = { event: WAEvent; handler: WAEventHandler<WAEvent> };

class EventBus {
  private listeners: Listener[] = [];
  on<E extends WAEvent>(event: E, handler: WAEventHandler<E>): Unsubscribe {
    const l: Listener = { event, handler: handler as WAEventHandler<WAEvent> };
    this.listeners.push(l);
    return () => { this.listeners = this.listeners.filter((x) => x !== l); };
  }
  emit<E extends WAEvent>(event: E, payload: WAEventMap[E]) {
    this.listeners.filter((l) => l.event === event).forEach((l) => (l.handler as (p: WAEventMap[E]) => void)(payload));
  }
}

function randomQrString() {
  return Array.from({ length: 4 }).map(() => Math.random().toString(36).slice(2, 10)).join(":");
}

export class MockWhatsAppAdapter implements WhatsAppAdapter {
  private bus = new EventBus();
  private statuses = new Map<string, WAStatus>();

  on<E extends WAEvent>(event: E, handler: WAEventHandler<E>) { return this.bus.on(event, handler); }

  async connectInstance(instanceId: string) {
    this.statuses.set(instanceId, "qr");
    await this.generateQrCode(instanceId);
  }

  async generateQrCode(instanceId: string) {
    const qr = randomQrString();
    const expiresAt = new Date(Date.now() + 30_000);
    this.bus.emit("qr.generated", { instanceId, qr, expiresAt });
    return { qr, expiresAt };
  }

  async disconnectInstance(instanceId: string) {
    this.statuses.set(instanceId, "disconnected");
    this.bus.emit("connection.closed", { instanceId });
  }

  async deleteSession(instanceId: string) {
    this.statuses.set(instanceId, "disconnected");
    this.bus.emit("connection.closed", { instanceId, reason: "session_deleted" });
  }

  async sendMessage(_instanceId: string, _to: string, _msg: OutboundMessage) {
    return { id: crypto.randomUUID() };
  }

  async getStatus(instanceId: string): Promise<WAStatus> {
    return this.statuses.get(instanceId) ?? "disconnected";
  }
}
