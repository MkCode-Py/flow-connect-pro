# Banco de dados — MK Flow WhatsApp

Schema completo em [`supabase/migrations/`](../supabase/migrations/). Todas as tabelas vivem em `public`, têm RLS habilitado e seguem o padrão `owner_id = auth.uid()`.

---

## Como aplicar as migrations num projeto novo

### Opção A — Supabase CLI (recomendado)

```bash
npm install -g supabase
supabase login
supabase link --project-ref <seu-project-ref>
supabase db push
```

### Opção B — manual

Abra o **SQL Editor** do Supabase, cole o conteúdo de cada arquivo em `supabase/migrations/` na ordem cronológica (nome começa com timestamp) e execute.

### Verificação

Após aplicar, rode no SQL Editor:

```sql
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```

Deve retornar pelo menos: `companies`, `company_settings`, `contact_tags`, `contacts`, `conversations`, `custom_fields`, `flow_folders`, `flows`, `keyword_rules`, `messages`, `profiles`, `quick_replies`, `sequences`, `tags`, `user_roles`, `webhooks`, `whatsapp_instances`.

---

## Tabelas principais

### Identidade

| Tabela | Colunas-chave | Notas |
|---|---|---|
| `profiles` | `id` (= `auth.users.id`), `full_name`, `avatar_url` | Trigger `handle_new_user` cria automaticamente no signup |
| `user_roles` | `user_id`, `role` (`admin` / `member`) | **Nunca** mover papéis para `profiles` — risco de escalada de privilégio |
| `companies` | `id`, `owner_id`, `name` | Uma empresa por usuário no MVP; multi-tenant pronto |
| `company_settings` | `company_id`, `service_hours`, `automation_*` | Configurações operacionais |

### Fluxos e automação

| Tabela | Função |
|---|---|
| `flow_folders` | Pastas para organizar fluxos |
| `flows` | `name`, `folder_id`, `graph` (jsonb), `status` (`draft` / `published`) |
| `keyword_rules` | Disparadores reativos: `pattern`, `match_mode`, `priority`, `target_flow_id` |
| `sequences` | CRUD mockado; scheduler real no backend |
| `webhooks` | CRUD mockado; HTTP real no backend |

### CRM / Atendimento

| Tabela | Função |
|---|---|
| `contacts` | `name`, `phone`, `email`, `custom_fields` (jsonb) |
| `tags` | Etiquetas reutilizáveis |
| `contact_tags` | N:N entre `contacts` e `tags` |
| `custom_fields` | Campos personalizados definidos por empresa |
| `conversations` | `contact_id`, `status` (`open` / `pending` / `resolved`), `automation_paused` |
| `messages` | `conversation_id`, `direction`, `body`, `kind` (`text` / `image` / etc.) |
| `quick_replies` | `shortcut`, `body` com variáveis |

### Conexões

| Tabela | Função |
|---|---|
| `whatsapp_instances` | `name`, `status` (`pending` / `connecting` / `connected` / `disconnected`), `phone` |

---

## RLS — padrão geral

```sql
-- Todas as tabelas user-facing seguem este padrão:
alter table public.<tabela> enable row level security;

create policy "Owner CRUD"
on public.<tabela> for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- E todas têm GRANT explícito:
grant select, insert, update, delete on public.<tabela> to authenticated;
grant all on public.<tabela> to service_role;
```

`user_roles` é exceção: leitura só pela função `has_role` (security definer). Não há grant para `anon`.

---

## Triggers e funções

| Nome | Quando dispara | O que faz |
|---|---|---|
| `handle_new_user` | `auth.users` (after insert) | Cria `profiles`, atribui `role = 'admin'` ao primeiro usuário, semeia `companies` + `company_settings` |
| `seed_default_flows` | primeira leitura de `flows` por usuário sem fluxos | Cria 3 fluxos-template (Boas-vindas, Mídia, Pix) |
| `set_updated_at` | before update genérico | Atualiza `updated_at = now()` |
| `has_role(uuid, app_role)` | function | Checa role sem causar recursão de RLS |

Todas as funções são `SECURITY DEFINER` com `set search_path = public` para evitar ataques de injeção via `search_path`.

---

## Backups e exportação

- **Lovable Cloud:** exportação por tabela em CSV pelo dashboard Cloud → Database → Tables.
- **Supabase próprio:** `pg_dump` direto na database URL, ou Database → Backups.
- **CI/CD:** versionar `supabase/migrations/` no git já é suficiente para recriar o schema do zero em qualquer ambiente.

---

## Como adicionar uma nova tabela (checklist)

1. Criar migration em `supabase/migrations/<timestamp>_<descricao>.sql`.
2. `CREATE TABLE public.<nome>` com `owner_id uuid not null references auth.users(id)`.
3. **GRANT** explícito para `authenticated` e `service_role` (Postgrest não dá grants por padrão).
4. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
5. `CREATE POLICY` com `owner_id = auth.uid()`.
6. Regenerar tipos: o cliente em `src/integrations/supabase/types.ts` é auto-gerado pelo Lovable Cloud — em projetos próprios use `supabase gen types typescript`.
7. Criar hook em `src/features/<dominio>/hooks/use<Nome>.ts` com TanStack Query.
