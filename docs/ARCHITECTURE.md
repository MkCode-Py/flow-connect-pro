# Arquitetura — MK Flow WhatsApp

Este documento descreve as decisões de arquitetura do MVP e os pontos de extensão pensados para o backend real.

---

## Princípios

1. **Engine de automação isolada do React.** Toda a lógica de fluxo vive em `src/features/flows/engine/` como TypeScript puro, sem dependências de UI. Isso permite copiar o mesmo módulo para o backend Node sem refatoração.
2. **Adapter pattern para WhatsApp.** O frontend nunca importa Baileys diretamente. Ele consome `WhatsAppAdapter`, e na build atual recebe o `MockWhatsAppAdapter`. Trocar pelo backend real é substituir uma factory.
3. **Banco como fonte de verdade.** Nenhum estado crítico vive em memória ou localStorage. Fluxos, conversas, contatos, configurações — tudo persiste no Postgres com RLS.
4. **RLS sempre ativo.** Toda tabela em `public` tem RLS habilitado e políticas `owner_id = auth.uid()`. Roles ficam em tabela separada (`user_roles`) — nunca no `profiles`.
5. **Validação dupla.** Zod no cliente (formulários e graph), constraints no banco (NOT NULL, FK, CHECK). Não confie só num lado.

---

## Camadas

```
┌─────────────────────────────────────────────────────────────┐
│  UI (React + shadcn/ui)                                     │
│   • pages/                                                  │
│   • features/*/components/                                  │
└─────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────────┐
│  Hooks de dados (TanStack Query)                            │
│   • features/*/hooks/use*.ts                                │
└─────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────────┐
│  Domínio puro (sem React)                                   │
│   • features/flows/engine/                                  │
│   • features/automation/keywords/utils/                     │
│   • lib/contactVariables.ts                                 │
└─────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────────┐
│  Integrações                                                │
│   • integrations/supabase/    (cliente gerado)              │
│   • integrations/whatsapp/    (adapter neutro)              │
└─────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────────┐
│  Backend                                                    │
│   • Postgres + Auth + RLS  (Lovable Cloud / Supabase)       │
│   • [futuro] Node.js + Baileys  (VPS própria)               │
└─────────────────────────────────────────────────────────────┘
```

---

## Editor visual de fluxos

- **Biblioteca:** `reactflow@11`.
- **Tipos de nó:** `start | content | action | condition | menu | question | flowlink | random | webhook | end` — definidos em `src/features/flows/editor/types/index.ts`.
- **Schema por nó:** Zod em `src/features/flows/editor/schemas/nodeSchemas.ts`. O Inspector valida em tempo real e o autosave só grava graphs válidos.
- **Autosave:** debounced 800ms (`useGraphAutosave`). Grava o JSON completo em `flows.graph` (jsonb).
- **Inspector:** painel lateral renderizado **só quando há nó selecionado**. Sub-inspectores por tipo em `editor/components/inspector/`.
- **Variáveis:** `{{nome}}`, `{{telefone}}`, `{{custom_field.chave}}` — resolvidas via `lib/contactVariables.ts`. O `VariableMenu` permite inserir variáveis em qualquer textarea.

---

## Engine de automação (`features/flows/engine/`)

| Arquivo | Responsabilidade |
|---|---|
| `flowEngine.ts` | Máquina de estados que executa o graph, mantém pendências de menu/pergunta e emite outputs/logs |
| `variableResolver.ts` | Substitui `{{var}}` em textos, com fallback explícito quando a variável não existe |
| `conditionEvaluator.ts` | Avalia regras (`is`, `contains`, `between`, etc.) sobre contato/variáveis |
| `actionExecutor.ts` | Aplica efeitos colaterais simulados (add tag, pause bot, transfer human, update field) |
| `menuMatcher.ts` | Matching de respostas livres com normalização de texto |
| `graphTraversal.ts` | Helpers de leitura do graph (`getNextNode`, `getNodeById`) |
| `types.ts` | Contratos públicos: `BotOutput`, `EngineStatus`, `AutomationLog`, `SimulationContact` |

**Como reusar no backend:** copie a pasta inteira para o repositório do backend Node, instale `reactflow` (somente para os tipos `Node`/`Edge`) ou substitua por `import type` apenas. Não há nenhuma dependência de DOM ou React.

---

## WhatsAppAdapter

Contrato em `src/integrations/whatsapp/adapter.ts`. Métodos mínimos:

```ts
export interface WhatsAppAdapter {
  startSession(instanceId: string): Promise<{ qr: string; expiresInSec: number }>;
  getStatus(instanceId: string): Promise<InstanceStatus>;
  disconnect(instanceId: string): Promise<void>;
  sendText(instanceId: string, to: string, body: string): Promise<{ id: string }>;
  // ... ver arquivo
}
```

- `MockWhatsAppAdapter` (uso atual): gera QR fake e simula `connected` após 3s. Mensagens enviadas ficam só em memória.
- `BaileysAdapter` (stub em `baileysAdapter.stub.ts`): apenas TODOs com a estrutura esperada — a implementação real **não roda no browser**.

A factory em `integrations/whatsapp/index.ts` escolhe o adapter. Quando `VITE_WHATSAPP_BACKEND_URL` estiver definido, deve retornar um `RemoteWhatsAppAdapter` que faz HTTP/WebSocket contra o backend Node.

---

## Convenções de código

- **Feature-oriented:** cada domínio vive em `src/features/<dominio>/` (componentes, hooks, utils, types).
- **Hooks de dados sempre via TanStack Query** — nunca `useEffect + fetch`. Invalidações explícitas.
- **shadcn/ui em `src/components/ui/`** — não editar diretamente, estender via wrappers.
- **Tokens semânticos no `index.css`** — nunca usar `text-white`, `bg-[#xxx]` etc.; sempre via classes Tailwind que referenciam variáveis CSS.
- **Sem `any`.** Use `unknown` + type guards.
- **Mensagens de erro em PT-BR** voltadas ao usuário; logs internos em inglês.

---

## Segurança

- RLS em todas as tabelas. Política padrão: `owner_id = auth.uid()`.
- `user_roles` separado de `profiles`. A função `has_role(uuid, app_role)` é `SECURITY DEFINER` para evitar recursão.
- Chaves: só `VITE_SUPABASE_PUBLISHABLE_KEY` (anon) vai para o cliente. `service_role` fica no backend.
- Triggers `handle_new_user`, `seed_default_company`, `seed_default_flows` rodam com `SECURITY DEFINER` e `search_path` fixo em `public`.
