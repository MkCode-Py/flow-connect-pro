# MK Flow WhatsApp

SaaS/PWA para automação de conversas WhatsApp — fluxos visuais, palavras-chave, inbox de atendimento e gestão de contatos. Construído como MVP totalmente funcional **em modo mock**, pronto para receber a integração real de WhatsApp via backend Node.js (Baileys) em uma VPS.

> Documentação técnica completa em **`/dev-notes`** dentro do app.

---

## Stack

- **Frontend:** React 18 · Vite · TypeScript · Tailwind CSS · shadcn/ui · React Flow
- **Estado/dados:** TanStack Query · Zod · React Router
- **Backend gerenciado:** Lovable Cloud (Postgres + Auth + RLS)
- **WhatsApp:** `WhatsAppAdapter` neutro + `MockWhatsAppAdapter`. Implementação real deve viver em um backend Node.js separado.

---

## Como rodar localmente

```bash
# Instalar dependências
npm install

# Subir o dev server (Vite)
npm run dev

# Build de produção
npm run build
```

### Variáveis de ambiente

Criar `.env` na raiz (já gerado em projetos Lovable Cloud):

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key pública>
VITE_SUPABASE_PROJECT_ID=<project ref>
```

---

## Estrutura de pastas

```
src/
  components/          # AppShell, sidebar, PageHeader, shadcn/ui
  features/
    flows/             # Editor visual (React Flow) + engine TS puro
      editor/          # Canvas, palette, inspector, simulador
      engine/          # FlowEngine, variableResolver, keywordMatcher
    automation/        # keywords / sequences / webhooks
    inbox/             # Inbox 3 colunas (WhatsApp Web-like)
    contacts/          # CRUD + drawer com campos personalizados
    tags/              # Etiquetas reutilizáveis
    quick-replies/     # Respostas rápidas com variáveis
    connections/       # Instâncias WhatsApp + QR mock
    settings/          # Perfil, empresa, atendimento, automação, campos
  integrations/
    supabase/          # Cliente gerado (NÃO editar)
    whatsapp/          # adapter.ts, mockAdapter.ts, baileysAdapter.stub.ts
  lib/                 # auth, guards, contactVariables, utils
  pages/               # Dashboard, DevNotes, auth/, NotFound
```

---

## Status do MVP

### Implementado (real, persistido no banco)
- Autenticação (email/senha + Google).
- Fluxos com pastas, templates e CRUD completo.
- Editor visual React Flow com 10 tipos de bloco, autosave e validação Zod.
- Inspector lateral por tipo de bloco, com variáveis e validação.
- Engine de automação (TypeScript puro) reutilizável pelo backend.
- Simulador de fluxo dentro do editor (chat + logs + destaque do bloco ativo).
- Palavras-chave com prioridade, normalização e testador.
- Inbox com 3 colunas, composer com atalhos `/`, pausa de automação, tags.
- Contatos, tags, respostas rápidas, campos personalizados.
- Configurações: perfil, empresa, atendimento, automação global, segurança.
- Conexões: CRUD de instâncias, QR Code mockado, logs por instância.
- Dashboard com KPIs reais (fluxos ativos, conversas, instâncias conectadas).

### Mockado (aguardando backend real)
- Conexão WhatsApp via QR Code (`MockWhatsAppAdapter` simula sucesso).
- Envio e recebimento de mensagens na Inbox.
- Webhooks (CRUD existe, mas "Testar" não dispara HTTP real).
- Sequências (CRUD existe, scheduler real fica no backend).

### Restrições de produto (intencionais)
Não há broadcast, disparo em massa nem campanhas. Toda automação é **reativa** — só dispara em resposta a uma mensagem recebida.

---

## Próximos passos (Claude Code / VPS)

1. Baixar o projeto e revisar `.env`.
2. Criar um backend Node.js separado e instalar Baileys.
3. Implementar um `RemoteWhatsAppAdapter` que respeite o contrato em `src/integrations/whatsapp/adapter.ts`.
4. Persistir sessões Baileys por `whatsapp_instance.id` (`useMultiFileAuthState`).
5. Plugar `FlowEngine` (já pronto) no listener de mensagens recebidas.
6. Implantar com PM2/Docker + Nginx + HTTPS.

O passo a passo completo (20 itens) está em **`/dev-notes` → "Plugar Baileys"** dentro do app, junto com a lista de endpoints HTTP sugeridos e o checklist de migração para VPS.
