import { MockWhatsAppAdapter } from "./mockAdapter";
import type { WhatsAppAdapter } from "./adapter";

/** Singleton do adaptador atualmente ativo. */
export const whatsapp: WhatsAppAdapter = new MockWhatsAppAdapter();
export * from "./adapter";
