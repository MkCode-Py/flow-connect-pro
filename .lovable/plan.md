
# MK Flow WhatsApp — Plano de execução aprovado

Implementação em **9 etapas sequenciais**, priorizando funcionamento real sobre estética. Cada etapa só avança quando a anterior estiver validada.

## Prioridades (conforme sua aprovação)

**Não simplificar (qualidade máxima):**
- Editor visual React Flow
- Salvamento/carregamento do `graph` JSON
- Conexões entre blocos
- Inspector lateral
- Simulador de fluxo

**Simplificar para evitar bugs:**
- Sequências (CRUD mínimo, sem scheduler real)
- Webhooks (CRUD mock, sem execução real)
- Analytics (apenas contadores básicos)

**Mockar (não implementar de verdade):**
- Conexão WhatsApp (interface + adapter mock + QR fake)
- Envio/recebimento de mensagens (só no simulador e inbox mockada)

---

## Etapas

### Etapa 1 — Fundações
- Design system completo (tokens HSL em `index.css`, paleta dos nós, variantes shadcn)
- Shell: Sidebar + TopBar + layouts
- Auth (Email/senha + Google) com `/login`, `/signup`, `/reset-password`
- Schema completo + RLS + GRANTs + trigger `handle_new_user` para `profiles`
- Seed inicial (4 fluxos padrão vazios, tags exemplo, quick replies)

### Etapa 2 — Fluxos + Pastas
- `/flows` com seção "Padrões Básicos" + pastas + tabela
- CRUD de pastas e fluxos (criar, renomear, mover, duplicar, excluir)
- Busca e filtros

### Etapa 3 — Editor visual (núcleo)
- Canvas React Flow com grid, pan/zoom, fit-view, minimapa, fullscreen
- 10 tipos de nó com handles tipados e cores próprias
- Paleta flutuante para adicionar blocos
- Autosave debounced + botão Salvar manual
- Persistência `graph` jsonb (nodes + edges + viewport)

### Etapa 4 — Inspector lateral
- Sheet contextual por tipo de nó com campos específicos validados (Zod)
- Suporte a variáveis `{{primeiro_nome}}` etc com autocomplete
- Duplicar, excluir, aviso de bloco desconectado

### Etapa 5 — Engine + Simulador
- Engine pura TS em `src/features/flows/engine/` (reutilizável pelo backend futuro)
- Painel chat de teste no editor: processa início, conteúdo (com delay), menu (número ou texto), condição, ação, pergunta, conexão de fluxo, encerrar
- Log de eventos lateral, contato simulado editável, reiniciar

### Etapa 6 — Palavras-chave
- `/automation/keywords` com CRUD completo vinculado a fluxos
- Regras: contém / começa com / é exatamente, múltiplos termos
- Toggle ativo, contador de execuções
- Sequências e Webhooks: telas simples com CRUD básico (marcadas como "em breve" para execução real)

### Etapa 7 — Inbox + Contatos + Tags + Quick Replies
- `/inbox` 3 colunas mockada (conversas seed)
- Pausar/retomar automação por conversa, marcar resolvida
- `/contacts`, `/tags`, `/quick-replies` com CRUD

### Etapa 8 — Conexões + QR mock + Adapter
- `WhatsAppAdapter` (interface tipada + eventos)
- `MockWhatsAppAdapter` ativo
- `BaileysWhatsAppAdapter` stub com TODOs
- `/connections` + modal QR mockado com contador 30s e estados

### Etapa 9 — Settings + Dev Notes + PWA + revisão
- Settings (perfil, campos personalizados, segurança)
- `/dev-notes` navegável: arquitetura, schema, contrato adapter, eventos, passos para plugar Baileys em Node.js, checklist de segurança
- Manifest PWA + ícones
- Revisão final de RLS, validações, estados vazios/erro/loading

---

## Confirmação

Vou começar pela **Etapa 1** assim que entrar em modo build. Cada etapa termina com verificação funcional antes da próxima.
