# Etapa 2 — Fluxos + Pastas

Reconstrução completa da rota `/flows` com foco em gestão, organização e CRUD. O editor React Flow fica para a Etapa 3 — aqui apenas garantimos que `/flows/:id` recebe o registro correto com graph inicial válido.

## Schema (ajustes mínimos via migração)

A tabela `flows` já existe com todos os campos necessários (`kind`, `folder_id`, `graph`, `is_active`, `executions`, `connections`, `ctr`, `updated_at`). A tabela `flow_folders` precisa de dois complementos:

- adicionar `updated_at timestamptz` com trigger
- adicionar índice em `(owner_id, name)` único para evitar pastas duplicadas

Nenhuma mudança destrutiva. Tipos (`flow_kind`) já contemplam `welcome`, `default_reply`, `media_default`, `post_service`, `custom`.

## Estrutura de pastas

Reorganizar de `src/pages/flows/FlowsList.tsx` (atual monolito) para:

```text
src/features/flows/
  pages/
    FlowsListPage.tsx           # rota /flows
  components/
    FlowsHeader.tsx             # título, subtítulo, CTAs
    FlowsFilters.tsx            # busca, filtro pasta/tipo/status
    DefaultFlowsSection.tsx     # 4 cards padrão
    DefaultFlowCard.tsx
    FoldersGrid.tsx             # grid de pastas + chips Todos/Sem pasta
    FolderCard.tsx
    FlowsTable.tsx              # tabela desktop
    FlowsMobileList.tsx         # cards no mobile
    FlowRowActions.tsx          # menu 3 pontos
    dialogs/
      CreateFlowDialog.tsx
      RenameFlowDialog.tsx
      MoveFlowDialog.tsx
      DeleteFlowDialog.tsx
      CreateFolderDialog.tsx
      RenameFolderDialog.tsx
      DeleteFolderDialog.tsx
  hooks/
    useFlows.ts                 # list + filtros
    useFlowFolders.ts
    useDefaultFlows.ts          # garante existência dos 4 padrões
    useFlowMutations.ts         # create/update/delete/duplicate/move/toggle
    useFolderMutations.ts
  utils/
    defaults.ts                 # DEFAULT_FLOW_DEFINITIONS, labels, descrições
    templates.ts                # 3 modelos (Atendimento, Pix, Pós-atendimento) com graph JSON
    graph.ts                    # buildInitialGraph(), buildTemplateGraph()
    kindLabels.ts
  types/
    index.ts
```

`src/pages/flows/FlowsList.tsx` vira um re-export fino para não quebrar a rota atual. `FlowEditor.tsx` permanece intacto (Etapa 3 mexe nele).

## Página /flows — comportamento

**Header**: título "Fluxos de conversa", subtítulo, CTAs primário ("Criar Novo Fluxo") e secundário ("Criar Pasta").

**Filtros (linha sticky)**: busca por nome (debounced), select de pasta (Todos / Sem pasta / lista), select de tipo (Todos + 5 tipos), select de status (Todos/Ativo/Inativo), botão "Limpar".

**Seção "Fluxos Padrões Básicos"**: 4 cards fixos (boas-vindas, resposta padrão, mídia, pós-atendimento). Ao montar a página, `useDefaultFlows` garante que cada `kind` exista para o `owner_id` — se faltar, cria com nome padrão e graph inicial mínimo. Card mostra nome, badge do tipo, badge "Configurado" (quando o graph tem >1 nó) ou "Não configurado", data da última alteração e botão "Editar fluxo" que navega para `/flows/:id`.

**Seção "Todos os Fluxos"**:
- Grid de pastas no topo com chips "Todos" e "Sem pasta" + cards de pasta (ícone, nome, contagem, menu 3 pontos: renomear, excluir, ver fluxos).
- Excluir pasta: se tem fluxos dentro, modal pergunta "Mover para Sem pasta" ou "Cancelar"; se vazia, confirmação simples.
- Tabela de fluxos (desktop) com colunas: checkbox, nome (linkado), pasta, tipo, status (switch), conexões, execuções, CTR%, última alteração, ações (menu 3 pontos).
- No mobile vira lista de cards com os mesmos dados essenciais.
- Empty state ilustrado quando não há fluxos. Skeleton durante load. Toast em erro.
- Ordenação default por `updated_at desc`; header das colunas Nome / Última alteração clicável para ordenar.

## Diálogos

- **Criar Fluxo**: campos Nome (Zod, 1-80), Pasta (select com "Sem pasta"), Tipo (5 opções), origem (Fluxo vazio / A partir de modelo → seleciona 1 dos 3 templates). Cria registro, redireciona para `/flows/:id`.
- **Renomear / Mover / Excluir / Duplicar**: modais focados com confirmação e toasts.
- **Criar / Renomear / Excluir Pasta**: idem.

## Regras de negócio

- 4 fluxos padrão (`kind != custom`) **não podem ser excluídos**; menu de ações oferece apenas "Editar" e "Resetar para template vazio".
- Duplicar fluxo padrão gera cópia com `kind = custom`, `is_active = false`, nome "Cópia de …", mesma pasta, mesmo graph.
- Toggle ativo/inativo via switch otimista com rollback em erro.
- RLS já garante isolamento por `owner_id`; todos os hooks injetam `owner_id = auth.uid()` nos inserts.
- Validação com Zod em todos os formulários, mensagens em pt-BR.

## Templates iniciais (`utils/templates.ts`)

Cada template retorna `{ nodes, edges, viewport }` compatível com o FlowEngine existente:

1. **Atendimento básico**: start → message(boas-vindas) → menu(3 opções: Preços / Pedido / Atendente) com 3 saídas vazias.
2. **Pagamento/Pix**: start → message(formas de pagamento) → question("Já realizou o pagamento?") → action(set_tag "Pagamento").
3. **Pós-atendimento**: start → message(agradecimento) → question(satisfação 1-5) → end.

IDs únicos via `crypto.randomUUID()`, posições espaçadas (~240px) para abrirem prontas no editor da Etapa 3.

## Design

Mantém tokens dark premium já definidos em `src/index.css`: cards `bg-card` com `border-border/60`, hover sutil `border-primary/40`, badges semânticos por `kind` (reutiliza variáveis `--node-*`), switches shadcn, menus dropdown com ícones lucide. Tabela com linhas zebradas leves, header sticky, scroll horizontal controlado. Mobile-first com breakpoint `md` para alternar tabela ↔ cards.

## Critério de pronto

Todos os itens da lista do usuário verificáveis manualmente em `/flows`, com persistência real no banco e navegação para `/flows/:id` carregando o graph salvo. Nenhuma alteração no editor visual (Etapa 3).
