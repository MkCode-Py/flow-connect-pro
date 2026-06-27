## Etapa 4 — Inspector lateral completo dos blocos

Esta etapa transforma os blocos do canvas em elementos realmente editáveis, com formulários específicos por tipo, validação Zod, sincronização ao vivo com o graph e persistência via autosave existente.

Escopo restrito: somente Inspector, edição de blocos, validação, persistência e manipulação segura de saídas dinâmicas. Engine, simulador, Baileys, inbox, webhooks reais e broadcast continuam fora.

---

### 1. Tipos e defaults — fonte única de verdade

Atualizar `src/features/flows/editor/types/index.ts` para refletir exatamente o schema solicitado pelo usuário (campos como `contentType`, `nextDelay`, `actionType` expandido, `ConditionRule` com mais operadores e campos, `MenuOption` com `shortcut/title/description/acceptedValues`, `QuestionData` com `validationType/invalidMessage/timeoutMessage`, `FlowLinkData` com `endCurrentFlow/preserveContext`, `RandomData.outputs`, `WebhookData` com `headers[]/body/saveResponseTo/timeoutSeconds/mockMode`, `EndData` com `finalMessage/removeTemporaryTags/pauseAutomation`).

Criar `utils/nodeDataDefaults.ts` exportando `defaultDataFor(kind)` — usado pelo `nodeFactory` e pelo Inspector para preencher campos faltantes em fluxos antigos sem perder dados (merge superficial com defaults).

### 2. Validação Zod

`schemas/nodeSchemas.ts` — um schema por tipo, mais `nodeSchemaFor(kind)`. Regras:
- `label` mínimo 1 char em todos.
- Content/text: `message` obrigatório quando `contentType === "text"`; `typingDelay/nextDelay ≥ 0`.
- Action: validar `tagIds.length ≥ 1` para add/remove_tag; `customFieldKey` obrigatório para `update_field`.
- Condition: `rules.length ≥ 1`; cada regra exige `field` e `operator`; `value` exigido salvo operadores `is_empty/is_not_empty`.
- Menu: `question` obrigatório; `options.length ≥ 1`; cada opção exige `shortcut` e `title`; `timeoutMinutes ≥ 0`.
- Question: `question` e `saveTo` obrigatórios; `validationType` em enum.
- FlowLink: `targetFlowId` pode ser null (aviso visual, não erro).
- Random: `outputs.length ≥ 2`, cada `label` não vazio.
- Webhook: `url` URL válida se `mockMode === false`; `body` parseável como JSON (string aceita); `timeoutSeconds 1–120`.
- End: tudo opcional além de label.

### 3. Inspector — arquitetura

Substituir `MiniInspector.tsx` por `InspectorPanel.tsx` em `components/`, com sub-inspectors em `components/inspector/<Kind>Inspector.tsx`. Cada sub-inspector recebe `(node, onChange, errors)` e é controlado pelo `InspectorPanel`.

`InspectorPanel` é responsável por:
- Layout responsivo: `lg+` painel fixo `w-96` à direita; abaixo de `lg` Sheet (shadcn) acionado pela seleção.
- Cabeçalho: ícone+cor do tipo (de `nodeMeta`), nome editável inline, descrição curta, badge "Desconectado" quando aplicável.
- Estado de rascunho local (`draft` + `dirty`), botões **Salvar** e **Cancelar** fixos no rodapé. Salvar valida com Zod, propaga `onCommit(nodeId, data)` para o page, mostra toast, mantém painel aberto. Cancelar restaura `node.data` original.
- Atalho `Ctrl/Cmd+Enter` salva; `Esc` cancela quando há rascunho.
- Ações secundárias no cabeçalho: Duplicar, Excluir (oculta para start), Fechar.
- Accordion "Avançado": ID técnico, tipo, preview JSON do data, botão "Copiar JSON".
- Estado vazio quando `selectedNode === null`.

### 4. Sincronização com o canvas

Novo util `utils/updateNodeData.ts`:
- `applyNodeData(nodes, id, partial)` — merge imutável preservando `position/type/id`.
- `syncDynamicHandles(node)` — para `menu` e `random`, garante que cada opção/saída tem `id` estável (gerado com `crypto.randomUUID()` se ausente). Não toca em edges.

Novo util `utils/edgeCleanup.ts`:
- `findEdgesForHandle(edges, nodeId, handleId)`
- `removeHandle(nodes, edges, nodeId, handleId)` retorna `{ nodes, edges, removedEdges }` para uso pós-confirmação.
- Para `condition`/`question`, as saídas fixas (`true/false`, `valid/timeout`) ficam codificadas em `nodeMeta` e **não** são removíveis.

`BaseNode` já lê handles dinâmicos via `nodeMeta`; vamos estender `nodeMeta.handlesFor(node)` para derivar handles de `data.options` (menu) e `data.outputs` (random), preservando os fixos para condition/question. Assim, ao adicionar/remover opção no Inspector, o canvas atualiza imediatamente os handles sem código extra no canvas.

### 5. Fluxo de commit

`FlowEditorPage` ganha `handleCommitNodeData(nodeId, data)`:
1. `setNodes(applyNodeData(...))`
2. Para menu/random, roda `syncDynamicHandles`.
3. `autosave.markDirty()` já dispara pelo efeito existente; nada mais a fazer.
4. Atualiza `selectedNode` derivado dos `nodes`.

Para remoção de opção/saída com edge conectado, o sub-inspector chama `requestRemoveHandle(handleId)` exposto pelo page; o page abre um `AlertDialog` ("Esta opção possui uma conexão. Remover opção e conexão?"). Confirmação aplica `removeHandle` e atualiza rascunho do Inspector.

### 6. Sub-inspectors por tipo

Cada arquivo cobre exatamente os campos do briefing. Destaques de implementação:

- **StartInspector** — apenas label/descrição, aviso fixo, sem excluir/duplicar.
- **ContentInspector** — Tabs (Texto/Imagem/Vídeo/Áudio/Arquivo/Contato). Texto: `Textarea` grande + `VariableMenu` + autocomplete `{{` (popover ao detectar dígrafo via posição do cursor). Outras abas: campos preparados desabilitados com `Alert` "envio real de mídia será implementado depois".
- **ActionInspector** — Select de `actionType`. Para tags: `Combobox` multi (carrega `tags` do owner via `useTags` hook novo) + botão "Criar etiqueta" que abre dialog leve e chama `supabase.from('tags').insert(...)`. Para `update_field`: select de `custom_fields` + input de valor com variáveis.
- **ConditionInspector** — Toggle `mode`. Lista `rules` com `field/operator/value`, valor renderizado conforme tipo de campo (input texto, select etiqueta, select status, time input). Botões Adicionar/Remover/Duplicar regra. Aviso de saídas fixas true/false.
- **MenuInspector** — Campos do menu, lista de opções drag-and-drop (`@dnd-kit/core` se já instalado; caso contrário botões ↑/↓ — checar antes). Cada opção edita shortcut/title/description/acceptedValues (chips). Remover opção conectada dispara confirmação.
- **QuestionInspector** — Campos descritos, select `saveTo` com opção "+ novo campo personalizado" (dialog cria em `custom_fields`).
- **FlowLinkInspector** — Combobox de fluxos (`useFlows`), mostra nome da pasta. Aviso amarelo quando vazio. Toggles.
- **RandomInspector** — Toggle modo + lista outputs (mínimo 2 enforced no Zod e UI). Remover com edge conectado pede confirmação.
- **WebhookInspector** — Method/URL/Timeout/SaveTo, editor de headers key/value, `Textarea` body JSON com validação inline (mostra erro de parse), toggle "Mock", `Alert` "Execução real será implementada depois".
- **EndInspector** — Campos e toggles do briefing.

### 7. Variáveis

`utils/variableHelpers.ts`:
- `DEFAULT_VARIABLES = ["primeiro_nome","nome","telefone","empresa"]`
- `insertAtCursor(input, token)` helper para `Textarea/Input` com `ref`.
- `VariableMenu` componente shadcn `DropdownMenu` reutilizável: dropdown com variáveis padrão + custom fields do owner; ao clicar insere `{{var}}` no campo focado.
- `VariableAutocomplete` hook: detecta `{{` antes do cursor e abre `Popover` com sugestões filtradas (mesma lista).
- Preview opcional abaixo de textareas longos: substitui `{{nome}}→João`, `{{primeiro_nome}}→João`, etc., com valores fake.

### 8. Limpeza e ajustes finos

- Remover `MiniInspector.tsx`.
- `EditorTopBar` já mostra status — sem mudanças.
- `nodeFactory.createNode` passa a usar `defaultDataFor`.
- Hooks novos: `useTags`, `useCustomFields` (`hooks/useTaxonomy.ts`), `useFlowsList` light reutilizando query existente.
- Garantir que `selectedNode` se atualiza após commit (já tratado pelo efeito em `nodes`).

### Critério de sucesso (verificação manual)

Após implementar, validar com Playwright headless: abrir um fluxo, selecionar bloco content → editar mensagem → ver toast "Salvo" → recarregar → mensagem persistida. Verificar menu (adicionar/remover opção atualizando handles), condition (saídas fixas), random (mínimo 2), webhook (validação JSON), duplicar/excluir bloco, e estado "Alterações não salvas" no topo.

---

### Notas técnicas (resumo de arquivos)

```text
src/features/flows/editor/
  types/index.ts                       (atualizado)
  schemas/nodeSchemas.ts               (novo)
  components/
    InspectorPanel.tsx                 (novo, substitui MiniInspector)
    inspector/
      StartInspector.tsx
      ContentInspector.tsx
      ActionInspector.tsx
      ConditionInspector.tsx
      MenuInspector.tsx
      QuestionInspector.tsx
      FlowLinkInspector.tsx
      RandomInspector.tsx
      WebhookInspector.tsx
      EndInspector.tsx
      shared/
        VariableMenu.tsx
        AdvancedSection.tsx
        FieldError.tsx
  utils/
    nodeDataDefaults.ts                (novo)
    updateNodeData.ts                  (novo)
    edgeCleanup.ts                     (novo)
    variableHelpers.ts                 (novo)
    nodeMeta.ts                        (estendido: handlesFor(node))
  hooks/
    useTaxonomy.ts                     (novo: useTags + useCustomFields)
  FlowEditorPage.tsx                   (integra InspectorPanel + commit + confirm dialogs)
```

Sem mudanças de schema no banco — graph continua em `flows.graph` JSONB. Sem novas dependências obrigatórias (verificar `@dnd-kit/core`; se ausente, uso de setas no menu).
