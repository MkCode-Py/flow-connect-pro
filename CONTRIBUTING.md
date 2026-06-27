# Contribuindo

Este projeto começou no Lovable e tem **sincronização bidirecional com GitHub**: mudanças num lado aparecem no outro automaticamente.

---

## Fluxo de trabalho

### Trabalhando localmente

```bash
git clone <repo>
cd mk-flow-whatsapp
npm install
cp .env.example .env   # preencher com credenciais reais
npm run dev
```

Faça commits normalmente. Ao dar `git push`, o Lovable detecta e atualiza o preview.

### Trabalhando no Lovable

Cada mensagem que faz alterações vira um commit automático no GitHub. Nada a fazer manualmente.

---

## Convenções

### Commits

Recomendado [Conventional Commits](https://www.conventionalcommits.org/pt-br/):

```
feat(flows): adiciona suporte a botões interativos no menu
fix(inbox): corrige scroll infinito quando há +200 mensagens
docs(readme): atualiza roteiro de hand-off
refactor(engine): extrai resolveText para módulo próprio
```

### Branches

- `main` — versão atual em produção (sincronizada com Lovable).
- `feat/<nome>` — novas features.
- `fix/<nome>` — correções.

### Code style

- TypeScript estrito, **sem `any`**.
- Componentes funcionais + hooks.
- Hooks de dados via **TanStack Query** (nunca `useEffect + fetch`).
- Tokens semânticos do `index.css` — nunca `text-white`, `bg-[#xxx]` direto.
- Mensagens de erro voltadas ao usuário em **PT-BR**; logs internos em inglês.
- Antes de subir: `npm run lint` e `npm run test`.

---

## Adicionando uma feature nova

1. Crie a pasta em `src/features/<dominio>/` com `components/`, `hooks/`, `types.ts`, `pages/`.
2. Se precisar de banco: nova migration em `supabase/migrations/` seguindo o checklist de [`docs/DATABASE.md`](./docs/DATABASE.md).
3. Hooks de dados em `hooks/use<Algo>.ts` com TanStack Query e invalidações explícitas.
4. Validação com Zod (`schemas.ts` da feature).
5. Se for um bloco novo do editor de fluxos: ver `src/features/flows/editor/` (nodes, schemas, inspector, engine).
6. Atualize `CHANGELOG.md` na seção `[Unreleased]`.

---

## Segurança

- **Nunca** commite `.env` ou chaves.
- **Nunca** mova roles de `user_roles` para `profiles`.
- Toda nova tabela `public` precisa de `GRANT` + RLS + policies (checklist em `docs/DATABASE.md`).
- `service_role` key só no backend Node.js — nunca no Vite.
