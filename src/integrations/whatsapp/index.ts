import { MockWhatsAppAdapter } from "./mockAdapter";
import type { WhatsAppAdapter } from "./adapter";

/**
 * Singleton do adaptador atualmente ativo.
 * No MVP: MockWhatsAppAdapter. Em produção: trocar por uma implementação HTTP
 * que fala com o backend Node.js (que por sua vez usa BaileysWhatsAppAdapter).
 */
export const whatsapp = new MockWhatsAppAdapter();
export const whatsappAdapter: WhatsAppAdapter = whatsapp;
export * from "./adapter";
