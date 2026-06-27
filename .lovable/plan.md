## Etapa 9 — Acabamento, Documentação e Preparação para VPS

Última etapa antes do export para Claude Code. Foco em **polish, Settings completo, Dev Notes como handoff técnico e revisão geral** — sem qualquer integração real de WhatsApp.

---

### 1. Settings completo (`/settings`)

Refatorar `src/pages/Settings.tsx` em uma página com abas (`Tabs` shadcn) e componentes em `src/features/settings/`:

- **Perfil** — nome, email (readonly), avatar opcional (upload simples para placeholder/URL), salvar.
- **Empresa** — nova tabela `company_settings` (1:1 com owner): nome, nome público, telefone, site, descrição. Disponibiliza `{{empresa}}` em `contactVariables.ts`.
- **Atendimento** — horários por dia da semana (JSONB), mensagem fora do horário, toggle "Atendimento ativo".
- **Automação** — toggle global, limite msg/conversa, delay padrão (ms), comportamento ao transferir para humano, comportamento quando pausada. Persistido em `company_settings`.
- **Campos personalizados** — estender `custom_fields` com coluna `type` (`text|number|email|phone|date|boolean`); UI com seletor de tipo. Atualizar `ContactDrawer` e `QuestionInspector` para renderizar input correto.
- **Segurança** — alterar senha (via `supabase.auth.updateUser`), sair, aviso sobre sessões WhatsApp gerenciadas no backend.
- **Aparência** — dark fixo, com nota explicativa (sem light mode).

Hook central: `useCompanySettings()` em `src/features/settings/hooks/`.

---

### 2. Migration

Uma migration consolidada:
- `company_settings` (owner_id PK, campos acima, RLS por `auth.uid()`, GRANTs, trigger updated_at).
- `custom_fields.type` (enum text/number/email/phone/date/boolean, default `text`).
- Auditoria rápida: revisar policies de todas as 16 tabelas listadas, garantir `owner_id = auth.uid()` em SELECT/INSERT/UPDATE/DELETE, GRANTs para `authenticated` + `service_role`.

---

### 3. Dashboard final (`src/pages/Dashboard.tsx`)

Cards: Instâncias WhatsApp · Conversas abertas · Aguardando humano · Automação pausada · Fluxos ativos · Palavras-chave ativas.
Atalhos rápidos: Criar fluxo · Testar fluxo · Criar palavra-chave · Abrir inbox · Conectar WhatsApp · Ver Dev Notes.
Banner persistente: "Ambiente MVP em modo mock. A conexão real será implementada no backend."

Hook `useDashboardStats()` em paralelo via `Promise.all` em uma única query agregada.

---

### 4. Dev Notes final (`src/pages/DevNotes.tsx`)

Reescrever como documento de handoff completo, com `Tabs` ou âncoras laterais, cobrindo seções A–L do briefing:

A. Visão geral · B. Arquitetura · C. Modelo de dados (cada tabela com colunas-chave) · D. Formato graph JSON com exemplos JSON reais por tipo de nó · E. Engine (fluxograma por tipo) · F. matchKeywords · G. Inbox · H. WhatsAppAdapter (interface + eventos) · I. **Passo a passo Baileys (20 passos numerados)** · J. Endpoints HTTP sugeridos · K. Segurança e limites (anti-broadcast explícito) · L. Checklist VPS.

Adicionar seção final: **Checklist de Validação Manual** (fluxos, inspector, simulador, automação, inbox, conexões) com checkboxes locais (estado em `localStorage`).

---

### 5. README.md

Criar na raiz: nome, stack (React 18 + Vite + Tailwind + shadcn + React Flow + Lovable Cloud), como rodar local (`npm i`, `npm run dev`), variáveis de ambiente, estrutura de pastas (`src/features/*`, `src/integrations/*`), status do MVP (o que é real / o que é mock), próximos passos no Claude Code com link para `/dev-notes`.

---

### 6. PWA básico

Revisar `public/manifest.webmanifest`: `name: "MK Flow WhatsApp"`, `short_name: "MK Flow"`, `theme_color` e `background_color` dark (token), `display: standalone`. Manter ícones placeholder. Sem service worker.

---

### 7. Revisão geral (bug sweep)

Varredura rápida e correção pontual:
- Rotas: testar todas as 16 rotas listadas; corrigir links quebrados na sidebar; verificar `RequireAuth` em todas; estados vazios coerentes.
- Editor: garantir que graph vazio nunca sobrescreve graph válido (guard no `useGraphAutosave`); confirmar bloco `start` único e indeletável; limpeza de edges órfãs ao remover opção de menu/random.
- Inspector: verificar persistência de cada um dos 10 sub-inspectors.
- Engine/Simulador: testar fluxo template "Atendimento Básico" ponta a ponta; logs e destaque de bloco ativo.
- Inbox: empty states, composer com `/atalho`, pause/resume automação.
- Conexões: ciclo completo create → QR → simular → desconectar.
- TypeScript: `tsgo` limpo, imports não usados removidos.

---

### 8. Resumo técnico final

Após implementar, gerar mensagem-resumo cobrindo: implementado · mockado · arquivos principais novos · tabelas · pontos para Claude Code continuar · riscos/pendências.

---

### Restrições reforçadas

Nenhum código de Baileys, whatsapp-web.js, backend Node real, envio/recebimento real, webhook real, broadcast, disparo em massa ou campanha. Tudo permanece mock, e a Dev Notes deixa explícito como o Claude Code deve plugar o real depois.

### Detalhes técnicos

- Stack mantida: React 18, Vite, TS, Tailwind, shadcn, React Flow, React Query, Lovable Cloud (Supabase).
- Novos arquivos principais: `src/features/settings/{pages,hooks,components}`, `README.md`, migration `company_settings + custom_fields.type`.
- Arquivos reescritos: `src/pages/Settings.tsx`, `src/pages/Dashboard.tsx`, `src/pages/DevNotes.tsx`, `public/manifest.webmanifest`, `src/lib/contactVariables.ts` (para `{{empresa}}`).
- Sem dependências novas (exceto, se necessário, nada — usar shadcn existente).
