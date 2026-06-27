# Integração com WhatsApp real (Baileys)

Guia técnico para sair do `MockWhatsAppAdapter` e plugar um backend Node.js usando [Baileys](https://github.com/WhiskeySockets/Baileys) numa VPS própria.

---

## Por que um backend separado?

Baileys é uma biblioteca Node.js que abre uma conexão WebSocket persistente com os servidores do WhatsApp. Ela **não roda no browser** e precisa de:

- Sistema de arquivos para `useMultiFileAuthState` (sessões persistentes).
- Processo Node sempre ativo (PM2 ou Docker).
- Capacidade de receber mensagens em tempo real e disparar a engine de fluxos.

O frontend continua igual — ele só consome o adapter. Trocar mock por real é configurar `VITE_WHATSAPP_BACKEND_URL` e implementar um `RemoteWhatsAppAdapter`.

---

## Arquitetura recomendada

```
┌─────────────────┐         ┌────────────────────┐         ┌──────────────┐
│  Frontend       │  HTTPS  │  Backend Node.js   │   WSS   │   WhatsApp   │
│  (Vite build)   │◄───────►│  Express + Baileys │◄───────►│   servers    │
│                 │         │                    │         │              │
│  RemoteAdapter  │         │  FlowEngine        │         └──────────────┘
└─────────────────┘         │  KeywordMatcher    │
        │                   │                    │
        │                   └─────────┬──────────┘
        │                             │
        ▼                             ▼
┌───────────────────────────────────────────────┐
│  Postgres (Supabase / Lovable Cloud)          │
│  flows · contacts · messages · conversations  │
└───────────────────────────────────────────────┘
```

Ambos (frontend e backend) leem/escrevem no **mesmo Postgres**. O backend usa a `service_role` key; o frontend, a `anon` key.

---

## Passo a passo

### 1. Criar o backend

```bash
mkdir mk-flow-backend && cd mk-flow-backend
npm init -y
npm install express cors zod @whiskeysockets/baileys pino qrcode @supabase/supabase-js
npm install -D typescript tsx @types/express @types/cors @types/node
npx tsc --init
```

Estrutura mínima:

```
mk-flow-backend/
├─ src/
│  ├─ index.ts                # Express app
│  ├─ supabase.ts             # Cliente com service_role
│  ├─ baileys/
│  │  ├─ sessionManager.ts    # Map<instanceId, WASocket>
│  │  └─ startSession.ts      # useMultiFileAuthState + makeWASocket
│  ├─ engine/                 # COPIAR de src/features/flows/engine/ do frontend
│  ├─ handlers/
│  │  ├─ onIncomingMessage.ts # Salva message + roda engine
│  │  └─ routes.ts            # POST /sessions, GET /sessions/:id/status, etc.
│  └─ env.ts                  # Validação Zod das envs
├─ sessions/                  # Pasta de sessões Baileys (gitignored!)
├─ .env                       # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORT
└─ package.json
```

### 2. Copiar a engine

```bash
cp -r ../mk-flow-whatsapp/src/features/flows/engine ./src/engine
```

Ajustar imports: a engine importa tipos do editor (`AnyNodeData`, `NodeKind`). Copie também `src/features/flows/editor/types/index.ts` ou extraia esses tipos para um pacote compartilhado (`packages/shared-types/`).

### 3. Sessões Baileys persistentes

```ts
// src/baileys/startSession.ts
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import path from "node:path";
import qrcode from "qrcode";

export async function startSession(instanceId: string, onQr: (dataUrl: string) => void) {
  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(process.cwd(), "sessions", instanceId),
  );

  const sock = makeWASocket({ auth: state, printQRInTerminal: false });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async ({ qr, connection }) => {
    if (qr) onQr(await qrcode.toDataURL(qr));
    if (connection === "open") {
      await supabase.from("whatsapp_instances")
        .update({ status: "connected", phone: sock.user?.id })
        .eq("id", instanceId);
    }
  });
  sock.ev.on("messages.upsert", (ev) => onIncomingMessage(instanceId, sock, ev));

  return sock;
}
```

### 4. Listener de mensagens — onde a engine entra

```ts
// src/handlers/onIncomingMessage.ts
import { FlowEngine } from "../engine/flowEngine";
import { matchKeyword } from "../engine/keywordMatcher"; // já existe no frontend

export async function onIncomingMessage(instanceId, sock, { messages }) {
  for (const msg of messages) {
    if (msg.key.fromMe) continue;
    const phone = msg.key.remoteJid!;
    const text = msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? "";

    // 1. Resolver/criar contato e conversa
    const contact = await upsertContact(phone);
    const conversation = await upsertConversation(contact.id, instanceId);

    // 2. Persistir mensagem recebida
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      direction: "in", body: text, kind: "text",
    });

    if (conversation.automation_paused) return;

    // 3. Procurar fluxo via palavra-chave
    const flow = await findFlowByKeyword(contact.owner_id, text);
    if (!flow) return;

    // 4. Executar engine
    const engine = new FlowEngine(flow.graph, contactToSimulation(contact));
    const tick = await engine.start();

    // 5. Enviar outputs reais via Baileys
    for (const out of tick.outputs) {
      if (out.kind === "text") await sock.sendMessage(phone, { text: out.body });
      // ... media_mock, menu (buttons), etc.
    }
  }
}
```

### 5. Endpoints HTTP esperados pelo `RemoteWhatsAppAdapter`

| Método | Rota | Função |
|---|---|---|
| `POST` | `/sessions` | Inicia sessão (body: `{ instanceId }`), retorna `{ qr, expiresInSec }` |
| `GET` | `/sessions/:id/status` | Retorna `{ status: "pending" \| "connecting" \| "connected" \| "disconnected", phone? }` |
| `DELETE` | `/sessions/:id` | Logout + remove pasta de sessão |
| `POST` | `/sessions/:id/messages` | Envia mensagem (body: `{ to, body, kind }`), retorna `{ id }` |
| `GET` | `/sessions/:id/events` | SSE/WebSocket com eventos `qr.update`, `connection.update`, `message.received` |

Proteja todas as rotas com um header `X-Internal-Token` validado contra uma env var, ou JWT do próprio Supabase.

### 6. Implementar o `RemoteWhatsAppAdapter` no frontend

Crie `src/integrations/whatsapp/remoteAdapter.ts` implementando a interface `WhatsAppAdapter` com `fetch`/`EventSource` contra o backend. Em `src/integrations/whatsapp/index.ts`:

```ts
export function getAdapter(): WhatsAppAdapter {
  const backendUrl = import.meta.env.VITE_WHATSAPP_BACKEND_URL;
  return backendUrl ? new RemoteWhatsAppAdapter(backendUrl) : new MockWhatsAppAdapter();
}
```

### 7. Deploy

Veja [`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## Checklist de validação (após plugar Baileys)

- [ ] Criar instância na tela `/connections`, escanear QR real com WhatsApp.
- [ ] `whatsapp_instances.status` muda para `connected` automaticamente.
- [ ] Mandar "oi" de outro celular para o número conectado.
- [ ] Mensagem aparece em `messages` e na Inbox em < 2s.
- [ ] Fluxo de boas-vindas dispara e o bot responde de verdade no WhatsApp.
- [ ] Pausar automação numa conversa interrompe os disparos.
- [ ] Reiniciar o servidor (PM2 restart): a sessão reconecta sem novo QR (graças ao `useMultiFileAuthState`).

---

## Erros comuns

| Sintoma | Causa | Solução |
|---|---|---|
| QR expira em poucos segundos | `printQRInTerminal: true` + browser tentando reconectar | Use `printQRInTerminal: false` e envie o QR só via API |
| Sessão pede QR a cada restart | Pasta `sessions/` não persiste | Em Docker, monte volume. Em PM2, use caminho absoluto |
| Mensagens recebidas duplicadas | Múltiplos listeners | Garantir um único `sock` por `instanceId` (use o sessionManager) |
| `rate-overlimit` ao enviar | Spam | Adicione fila com delay (200–500ms entre mensagens) |
