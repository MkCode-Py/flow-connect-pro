## Etapa 3 — Editor Visual React Flow

Reconstruir o editor de fluxos em `/flows/:id` como núcleo da plataforma: canvas React Flow real, 10 tipos de nós, conexões válidas, persistência robusta com autosave e validação. Substitui o `FlowEditor.tsx` provisório do MVP por uma estrutura modular preparada para as Etapas 4 (inspector) e 5 (engine).

### Arquitetura de pastas

```text
src/features/flows/editor/
├── FlowEditorPage.tsx          # Container: carrega flow, gerencia status, monta layout
├── components/
│   ├── EditorTopBar.tsx        # Voltar, nome, status, Salvar, Testar, Copiar link, menu •••
│   ├── FlowCanvas.tsx          # ReactFlow + controls + minimap + grid + handlers
│   ├── NodePalette.tsx         # Popover "+ Adicionar bloco" com 9 tipos
│   ├── MiniInspector.tsx       # Painel lateral simples (tipo, nome, id, aviso)
│   └── EmptyFlowError.tsx      # Estado erro/permissão + botão voltar
├── nodes/
│   ├── BaseNode.tsx            # Card visual reutilizável (header colorido, ícone, handles)
│   ├── StartNode.tsx           # verde, só saída, não deletável
│   ├── ContentNode.tsx         # vinho/coral
│   ├── ActionNode.tsx          # âmbar
│   ├── ConditionNode.tsx       # azul, 2 saídas (true/false rotuladas)
│   ├── MenuNode.tsx            # violeta, saídas dinâmicas por opção
│   ├── QuestionNode.tsx        # ciano, 2 saídas (valid/timeout)
│   ├── FlowLinkNode.tsx        # verde escuro
│   ├── RandomNode.tsx          # rosa, ≥2 saídas
│   ├── WebhookNode.tsx         # cinza-azulado
│   ├── EndNode.tsx             # vermelho, sem saída
│   └── index.ts                # nodeTypes registry para ReactFlow
├── edges/
│   └── index.ts                # edgeTypes (default suave + cor selecionado)
├── hooks/
│   ├── useFlowGraph.ts         # Carrega flow do banco, estado nodes/edges/viewport
│   └── useGraphAutosave.ts     # Debounce 800ms, status, persistência guardada
├── utils/
│   ├── graphSchema.ts          # Zod: FlowGraph, NodeData por tipo, validação
│   ├── graphUtils.ts           # ensureStart, addNode, validate, sanitize
│   └── nodeFactory.ts          # Factory por tipo: id único, data inicial, position
└── types/
    └── index.ts                # NodeKind, NodeData<T>, FlowStatus, etc.
```

Arquivos antigos `FlowNode.tsx`, `NodeInspector.tsx`, `FlowSimulator.tsx`, `nodeDefs.ts` e `pages/flows/FlowEditor.tsx` serão removidos/substituídos. O simulador volta na Etapa 5; o botão "Testar" abre toast informando que será habilitado depois.

### Fluxo de dados

```text
FlowEditorPage
  ├─ useFlowGraph(id)
  │    └─ supabase.from('flows').select().eq('id', id)
  │       → parse + sanitize graph → ensureStartNode → estado React
  │
  ├─ EditorTopBar (status, save manual)
  │
  └─ FlowCanvas
       ├─ ReactFlowProvider
       ├─ onNodesChange / onEdgesChange (validações)
       ├─ onConnect (regras de validade)
       ├─ onSelectionChange → MiniInspector
       └─ NodePalette → addNode(kind) → setNodes
            │
            └─ useGraphAutosave (debounce 800ms)
                 └─ update flows.graph + updated_at
```

### Persistência (`flows.graph` JSONB)

```json
{
  "nodes": [
    { "id": "start", "type": "start", "position": {"x":120,"y":160},
      "data": { "label": "Bloco Inicial", "description": "..." } }
  ],
  "edges": [
    { "id": "e1", "source": "start", "target": "n2",
      "sourceHandle": "out", "data": {} }
  ],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```

Para `menu`, edges carregam `sourceHandle = "opt-<optionId>"`. Para `condition`, `sourceHandle = "true" | "false"`. Para `random`, `sourceHandle = "opt-a" | "opt-b" | ...`.

### Comportamento crítico

1. **Carregamento**: skeleton enquanto busca; se RLS/404 → tela de erro com "Voltar para fluxos"; se graph vazio/ inválido → seed com bloco start.
2. **Bloco inicial**: garantido exatamente 1. Tentativa de delete via Backspace ou menu é bloqueada com toast. NodePalette esconde a opção "start".
3. **Conexões válidas**:
   - source ≠ target (sem self-loop);
   - `target` precisa ser handle de entrada existente; `source` precisa ser handle de saída existente;
   - blocos sem entrada (start) rejeitam target; blocos sem saída (end) rejeitam source;
   - duplicar mesma conexão é ignorado.
4. **Status do salvamento** (máquina de estados):
   - `idle` → "Salvo"
   - `dirty` → "Alterações não salvas"
   - `saving` → "Salvando..."
   - `error` → "Erro ao salvar" + retry
5. **Autosave**: debounce 800ms após qualquer change; cancela quando navegação ocorre e força flush final via `beforeunload` + cleanup do hook. Nunca envia graph vazio: validação `ensureStartNode` antes do upsert.
6. **Validação antes de salvar** (`graphSchema.ts` com zod):
   - exatamente 1 node `start`;
   - todo node tem `id`, `type`, `position {x,y}`, `data`;
   - edges com `source` e `target` que existem no array de nodes;
   - se inválido → status `error`, toast detalhando o motivo, NÃO persiste.
7. **Blocos desconectados**: marcador visual sutil (badge âmbar "desconectado") no NodeCard, não bloqueia salvar.
8. **Atalhos**: Delete/Backspace remove seleção (nodes/edges), exceto start; Ctrl+S força save.
9. **MiniInspector**: Sheet/painel direito mostra `Tipo • Nome • ID` + aviso "Inspector completo na próxima etapa". Permite renomear o `label` apenas (única edição básica), pois isso já vai pro `data` corretamente.
10. **Menu contextual** no node: Duplicar, Excluir (desabilitado em start).

### Design dos nós

`BaseNode` define o card padrão:
- Largura ~240px, fundo `bg-card`, borda 1px com `border-l-4` colorida pelo tipo.
- Header: ícone Lucide + label + chip do tipo.
- Body: descrição curta (1-2 linhas, truncate).
- Handles: 12px círculo, hover destaca, cor herda do tipo.
- Selecionado: `ring-2 ring-primary/60` + glow sutil (`shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]`).
- Desconectado: badge âmbar canto inferior direito.

Cores via tokens já existentes em `index.css` (`--node-start`, `--node-content`, etc.). Se algum token faltar, será adicionado no `index.css` + `tailwind.config.ts` em HSL semântico (sem cores hardcoded).

### Topbar

```text
[← Voltar] | Nome do fluxo  • [chip status]    [Salvar] [Testar*] [⧉ Link] [⋯]
```
- Nome: input inline editável (debounce salva no campo `flows.name`).
- Status chip muda cor: cinza (Salvo), âmbar (Dirty), azul pulsante (Salvando), vermelho (Erro).
- "Testar" → toast: "Simulador disponível na próxima etapa".
- "Copiar link interno" → `${window.location.origin}/flows/:id` para clipboard.
- Menu ⋯: Duplicar fluxo, Renomear, Excluir (reaproveita mutações da Etapa 2).

### Critérios de aceite (validação manual)

1. Abrir `/flows/:id` carrega skeleton, depois canvas com start ou graph existente.
2. Adicionar Content/Menu/Condition via paleta; arrastar; conectar saídas distintas.
3. Menu com 3 opções gera 3 handles e cada um conecta em destinos diferentes; edge guarda `sourceHandle`.
4. Condition gera duas saídas rotuladas "verdadeira"/"falsa" e conectam separadamente.
5. Excluir bloco normal funciona; tentar excluir start mostra toast e mantém.
6. Excluir edge por Delete/Backspace.
7. Status muda para "Salvando..." e depois "Salvo" automaticamente em <2s após mudança.
8. F5 ou navegar e voltar restaura nodes, edges e viewport idênticos.
9. Erro de rede → status "Erro ao salvar" + toast + retry no botão.
10. Validação de graph inválido bloqueia salvar sem corromper dado existente.

### Fora do escopo desta etapa

- Inspector completo (Etapa 4): apenas MiniInspector com label.
- Engine/simulador (Etapa 5): botão Testar mostra toast.
- WhatsApp real, inbox real, webhooks reais, broadcast.
- Edição avançada de opções de menu / regras de condição via UI (vão no inspector).

### Itens técnicos

- Reaproveita `useFlows`, `useUpdateFlow` quando aplicável; cria `useGraphAutosave` específico para evitar invalidations agressivas durante edição.
- `nodeFactory.ts` centraliza data inicial exato pedido no brief (mensagens, opções, métodos).
- IDs de node via `nanoid(8)` para evitar colisões.
- Estado local controlado (`useNodesState`/`useEdgesState` do reactflow) + sincronização com store de autosave por `useEffect`.
- Não chamar `invalidateQueries(['flows'])` durante autosave — atualiza só cache do flow específico para não causar re-render do canvas.

Aprovação para executar?
