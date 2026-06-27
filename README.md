# MK Flow WhatsApp

SaaS/PWA para automação de conversas WhatsApp — fluxos visuais, palavras-chave, inbox de atendimento e gestão de contatos. Construído como **MVP funcional completo** em modo mock, pronto para receber a integração real de WhatsApp via backend Node.js (Baileys) em uma VPS.

> **Documentação interativa** dentro do app em **`/dev-notes`** (inclui checklist de validação manual e checklist de implantação em VPS).

---

## Sumário

1. [Stack](#stack)
2. [Como rodar localmente](#como-rodar-localmente)
3. [Variáveis de ambiente](#variáveis-de-ambiente)
4. [Banco de dados](#banco-de-dados)
5. [Estrutura de pastas](#estrutura-de-pastas)
6. [Scripts npm](#scripts-npm)
7. [Status do MVP](#status-do-mvp)
8. [Roteiro de hand-off para VPS / Claude Code](#roteiro-de-hand-off-para-vps--claude-code)
9. [Documentação adicional](#documentação-adicional)

---

## Stack

- **Frontend:** React 18 · Vite 5 · TypeScript 5 · Tailwind CSS 3 · shadcn/ui · React Flow 11
- **Estado/dados:** TanStack Query · React Hook Form · Zod · React Router 6
- **Backend gerenciado:** Postgres + Auth + RLS (Lovable Cloud / Supabase)
- **WhatsApp:** contrato neutro `WhatsAppAdapter` + `MockWhatsAppAdapter` no frontend. A implementação real (Baileys) deve viver num **backend Node.js separado** — ver [`docs/BACKEND_INTEGRATION.md`](./docs/BACKEND_INTEGRATION.md).
- **PWA:** `public/manifest.webmanifest` + ícones, instalável em mobile.

---

## Como rodar localmente

### Pré-requisitos

- **Node.js 20+** (LTS recomendado)
- **npm 10+** (ou `pnpm` / `bun` — o lockfile padrão é `package-lock.json`)
- Conta no [Lovable Cloud](https://lovable.dev) **ou** um projeto Supabase próprio (self-hosted ou supabase.com)

### Passos

```bash
# 1. Clonar o repositório
git clone <seu-repo-url>
cd mk-flow-whatsapp

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com as credenciais do seu projeto Supabase

# 4. Aplicar as migrações no banco
# Opção A — Supabase CLI (recomendado):
npx supabase link --project-ref <seu-project-ref>
npx supabase db push
# Opção B — copiar/colar cada arquivo de supabase/migrations/ no SQL Editor

# 5. Subir o dev server
npm run dev
# App em http://localhost:8080
```

### Primeiro acesso

1. Acesse `http://localhost:8080`.
2. Crie uma conta em **/auth/signup** (email/senha) ou faça login com Google.
3. Os triggers do banco criam automaticamente seu `profile` + `company` + dados iniciais.
4. Explore: `/flows`, `/automation/keywords`, `/inbox`, `/connections`, `/settings`, `/dev-notes`.

---

## Variáveis de ambiente

Veja [`.env.example`](./.env.example) — sempre copie e preencha um `.env` local. Nunca commite credenciais.

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | ✓ | URL pública do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✓ | Chave anon/public (segura no cliente, protegida por RLS) |
| `VITE_SUPABASE_PROJECT_ID` | ✓ | Project ref (subdomínio Supabase) |
| `VITE_WHATSAPP_BACKEND_URL` | — | URL do backend Node.js (quando você implantar a integração real) |

> **Service role key / senha do banco:** nunca vão no frontend. Use-as apenas no backend Node.js, em variáveis de ambiente do servidor (PM2/Docker secrets).

---

## Banco de dados

Schema completo em [`supabase/migrations/`](./supabase/migrations/) (6 migrations idempotentes). Todas as tabelas vivem em `public`, com RLS habilitado e políticas `owner_id = auth.uid()`.

Tabelas principais:

| Tabela | Função |
|---|---|
| `profiles` | Perfil do usuário, vinculado a `auth.users` |
| `user_roles` | Papéis (`admin` / `member`) — separados do profile por segurança |
| `companies` / `company_settings` | Empresa do usuário e configurações operacionais |
| `whatsapp_instances` | Conexões WhatsApp (cada uma vira uma sessão Baileys no backend) |
| `flows` / `flow_folders` | Fluxos visuais + organização em pastas |
| `keyword_rules` | Disparadores reativos por palavra-chave |
| `sequences` / `webhooks` | CRUD mockado, scheduler/HTTP no backend |
| `contacts` / `tags` / `contact_tags` | CRM básico |
| `custom_fields` | Campos personalizados por empresa |
| `conversations` / `messages` | Inbox |
| `quick_replies` | Respostas rápidas com variáveis |

Detalhes em [`docs/DATABASE.md`](./docs/DATABASE.md).

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
supabase/
  migrations/          # SQL versionado
  config.toml          # Project ref (gerado, não editar)
docs/                  # Documentação técnica detalhada
public/                # manifest.webmanifest, ícones, robots.txt
```

---

## Scripts npm

| Script | O que faz |
|---|---|
| `npm run dev` | Vite dev server em `http://localhost:8080` |
| `npm run build` | Build de produção em `dist/` |
| `npm run build:dev` | Build sem minificação (debug) |
| `npm run preview` | Servir `dist/` localmente |
| `npm run lint` | ESLint (TypeScript + React) |
| `npm run test` | Vitest (modo CI, sem watch) |
| `npm run test:watch` | Vitest em modo watch |

---

## Status do MVP

### Implementado (real, persistido no banco)
- Autenticação (email/senha + Google OAuth).
- Fluxos com pastas, templates iniciais e CRUD completo.
- Editor visual React Flow com **10 tipos de bloco**, autosave debounced e validação Zod.
- Inspector lateral por tipo de bloco, com variáveis `{{nome}}` e validação inline.
- **Engine de automação em TypeScript puro** — sem React, reutilizável pelo backend.
- Simulador de fluxo dentro do editor (chat estilo WhatsApp + logs + destaque do bloco ativo + botões interativos para menus).
- Palavras-chave com prioridade, normalização (acentos, case) e testador ao vivo.
- Inbox de 3 colunas, composer com atalhos `/`, pausa de automação por conversa.
- Contatos, tags, respostas rápidas, campos personalizados.
- Configurações: perfil, empresa, horário de atendimento, automação global, segurança, aparência.
- Conexões: CRUD de instâncias, QR Code mockado, logs por instância.
- Dashboard com KPIs reais.
- PWA instalável (manifest + ícones).

### Mockado (aguardando backend real)
- Conexão WhatsApp via QR Code (`MockWhatsAppAdapter` simula sucesso após 3s).
- Envio e recebimento real de mensagens na Inbox.
- Disparo HTTP de webhooks (CRUD existe; "Testar" não bate em servidor real).
- Scheduler de sequências (CRUD existe; cron job fica no backend).

### Restrições de produto (intencionais)
Não há broadcast, disparo em massa nem campanhas. Toda automação é **reativa** — só dispara em resposta a uma mensagem recebida do contato. Isso é deliberado e está alinhado com as políticas do WhatsApp.

---

## Roteiro de hand-off para VPS / Claude Code

O passo a passo completo (20+ itens, com checklist interativo) vive em **`/dev-notes` → "Plugar Baileys" + "Checklist VPS"** dentro do app. Resumo:

1. **Baixar o projeto** (botão "Download codebase" no Lovable, ou clonar do GitHub).
2. Revisar `.env` e o **schema do banco** (`supabase/migrations/`).
3. **Subir um backend Node.js** separado (Express/Fastify) na mesma VPS.
4. Instalar **Baileys** (`@whiskeysockets/baileys`) e persistir sessões com `useMultiFileAuthState`, indexadas por `whatsapp_instances.id`.
5. Implementar um **`RemoteWhatsAppAdapter`** que respeite o contrato em [`src/integrations/whatsapp/adapter.ts`](./src/integrations/whatsapp/adapter.ts) — o frontend já está pronto para trocar o mock por ele via `VITE_WHATSAPP_BACKEND_URL`.
6. No listener `messages.upsert` do Baileys: salvar mensagem em `messages`, rodar `keywordMatcher`, instanciar `FlowEngine` (a mesma da `src/features/flows/engine/`) e executar o graph carregado de `flows.graph`.
7. Implantar com **PM2/Docker + Nginx + HTTPS** (Let's Encrypt).
8. Apontar o frontend (Vercel/Netlify/VPS) para o backend via `VITE_WHATSAPP_BACKEND_URL`.

Guia técnico completo em [`docs/BACKEND_INTEGRATION.md`](./docs/BACKEND_INTEGRATION.md).

---

## Documentação adicional

| Documento | Conteúdo |
|---|---|
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Decisões de arquitetura, separação de camadas, padrões de código |
| [`docs/DATABASE.md`](./docs/DATABASE.md) | Schema completo, RLS, triggers, como rodar migrations |
| [`docs/BACKEND_INTEGRATION.md`](./docs/BACKEND_INTEGRATION.md) | Como conectar Baileys e migrar do `MockWhatsAppAdapter` para real |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) | Deploy do frontend (Vercel/Netlify/VPS) e do backend (PM2/Nginx) |
| [`CHANGELOG.md`](./CHANGELOG.md) | Histórico de versões |
| `/dev-notes` (rota do app) | Checklist interativo de validação manual + checklist de VPS |

---

## Licença

Projeto privado/proprietário. Defina a licença antes de tornar o repositório público.
