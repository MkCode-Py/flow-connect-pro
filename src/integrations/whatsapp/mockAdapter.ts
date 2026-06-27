/**
 * MockWhatsAppAdapter — usado pela UI no MVP.
 * Não envia nem recebe nada real. Apenas emite eventos sintéticos para a UI
 * exercitar todos os estados do fluxo de conexão.
 */
import type {
  WhatsAppAdapter,
  WAEvent,
  WAEventHandler,
  WAEventMap,
  WAStatus,
  OutboundMessage,
  Unsubscribe,
} from "./adapter";

type Listener = { event: WAEvent; handler: WAEventHandler<WAEvent> };

class EventBus {
  private listeners: Listener[] = [];
  on<E extends WAEvent>(event: E, handler: WAEventHandler<E>): Unsubscribe {
    const l: Listener = { event, handler: handler as WAEventHandler<WAEvent> };
    this.listeners.push(l);
    return () => {
      this.listeners = this.listeners.filter((x) => x !== l);
    };
  }
  emit<E extends WAEvent>(event: E, payload: WAEventMap[E]) {
    this.listeners
      .filter((l) => l.event === event)
      .forEach((l) => (l.handler as (p: WAEventMap[E]) => void)(payload));
  }
}

function randomQrString() {
  return [
    "2@",
    Array.from({ length: 4 })
      .map(() => Math.random().toString(36).slice(2, 10))
      .join(""),
    Date.now().toString(36),
  ].join(":");
}

/** Telefone mockado usado para representar a conexão simulada. */
export function mockConnectedPhone() {
  const ddd = 11;
  const n = Math.floor(90000000 + Math.random() * 9999999);
  return `+55 ${ddd} 9${String(n).slice(0, 4)}-${String(n).slice(4, 8)}`;
}

export class MockWhatsAppAdapter implements WhatsAppAdapter {
  private bus = new EventBus();
  private statuses = new Map<string, WAStatus>();

  on<E extends WAEvent>(event: E, handler: WAEventHandler<E>) {
    return this.bus.on(event, handler);
  }

  async connectInstance(instanceId: string) {
    this.statuses.set(instanceId, "connecting");
    await new Promise((r) => setTimeout(r, 200));
    this.statuses.set(instanceId, "qr_pending");
    await this.generateQrCode(instanceId);
  }

  async generateQrCode(instanceId: string) {
    const qr = randomQrString();
    const expiresAt = new Date(Date.now() + 30_000);
    this.statuses.set(instanceId, "qr_pending");
    this.bus.emit("qr.generated", { instanceId, qr, expiresAt });
    return { qr, expiresAt };
  }

  async reconnectInstance(instanceId: string) {
    this.statuses.set(instanceId, "reconnecting");
    this.bus.emit("connection.reconnecting", { instanceId });
    await new Promise((r) => setTimeout(r, 400));
    this.statuses.set(instanceId, "qr_pending");
    await this.generateQrCode(instanceId);
  }

  async disconnectInstance(instanceId: string) {
    this.statuses.set(instanceId, "disconnected");
    this.bus.emit("connection.closed", { instanceId });
  }

  async deleteSession(instanceId: string) {
    this.statuses.set(instanceId, "disconnected");
    this.bus.emit("session.deleted", { instanceId });
    this.bus.emit("connection.closed", { instanceId, reason: "session_deleted" });
  }

  async sendMessage(_instanceId: string, _to: string, _msg: OutboundMessage) {
    // Mock — não envia nada
    return { id: crypto.randomUUID() };
  }

  async getStatus(instanceId: string): Promise<WAStatus> {
    return this.statuses.get(instanceId) ?? "disconnected";
  }

  /** Helper exclusivo do mock: simula um scan bem-sucedido do QR. */
  simulateSuccessfulConnection(instanceId: string, phone?: string) {
    const p = phone ?? mockConnectedPhone();
    this.statuses.set(instanceId, "connected");
    this.bus.emit("connection.open", { instanceId, phone: p });
    return p;
  }
}
