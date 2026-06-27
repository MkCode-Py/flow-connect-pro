## Problema

O `InspectorPanel` (desktop) está sempre visível ocupando 380px à direita do canvas, mesmo sem bloco selecionado — mostrando o estado vazio "✦ Selecione um bloco…". Isso reduz a área útil do editor e, dependendo da largura, cobre/comprime o canvas onde se cria e edita o fluxo.

## Solução

Tornar o painel lateral **condicional à seleção de um bloco** em todas as larguras, mantendo o comportamento atual em mobile.

### Mudanças

**Arquivo:** `src/features/flows/editor/components/InspectorPanel.tsx`

1. Remover o estado vazio "Selecione um bloco…" — ele deixa de fazer sentido, já que o painel só aparece quando há nó.
2. No desktop (`lg:`), renderizar a `<aside>` **somente quando `props.node` existir**. Quando não há nó, o canvas ocupa 100% da largura.
3. Manter a animação `slide-in-from-right` ao abrir e adicionar um leve `slide-out` ao fechar para sensação polida.
4. Mobile continua igual: overlay/sheet quando há nó selecionado.
5. Botão "X" (fechar) e tecla `Esc` continuam funcionando para deselecionar — comportamento já existente via `onClose` em `FlowEditorPage`.

### Resultado visual

```text
Sem bloco selecionado:
┌─────────────────────────────────────────────┐
│ TopBar                                      │
├─────────────────────────────────────────────┤
│                                             │
│              Canvas (100%)                  │
│                                             │
└─────────────────────────────────────────────┘

Com bloco selecionado:
┌─────────────────────────────────────────────┐
│ TopBar                                      │
├──────────────────────────────┬──────────────┤
│                              │  Inspector   │
│        Canvas                │   (380px)    │
│                              │              │
└──────────────────────────────┴──────────────┘
```

### Fora do escopo

- Não altero lógica de seleção, autosave, validação ou sub-inspectors.
- Não mexo no simulador nem no `FlowCanvas`.
