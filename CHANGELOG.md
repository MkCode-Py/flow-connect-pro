# Changelog

Todos os marcos relevantes do MK Flow WhatsApp.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento [SemVer](https://semver.org/lang/pt-BR/).

---

## [0.1.0] — 2026-06-27 — MVP funcional

Primeira versão fechada. Tudo funciona em modo mock; backend Baileys fica como hand-off.

### Adicionado
- Autenticação email/senha + Google OAuth.
- Schema completo do banco com RLS (17 tabelas).
- Gestão de fluxos com pastas, templates e CRUD.
- Editor visual React Flow com 10 tipos de bloco, autosave debounced e validação Zod.
- Inspector lateral condicional por tipo de bloco, com suporte a variáveis `{{nome}}`.
- Engine de automação em TypeScript puro, reutilizável pelo backend.
- Simulador de fluxo dentro do editor — chat WhatsApp-like com botões interativos para menus, logs estruturados, edição de contato simulado e variáveis ao vivo.
- Palavras-chave com prioridade, normalização e testador.
- Sequências e webhooks (CRUD mockado).
- Inbox de 3 colunas estilo WhatsApp Web, composer com atalhos `/`, pausa de automação.
- Contatos, tags, respostas rápidas, campos personalizados.
- Configurações completas (perfil, empresa, atendimento, automação, segurança, aparência).
- Conexões: CRUD de instâncias + QR Code mockado.
- Dashboard com KPIs reais.
- PWA instalável (manifest + ícones + favicon).
- Documentação `/dev-notes` interna + `docs/` para hand-off externo.

### Decisões de produto
- Sem broadcast / disparo em massa. Toda automação é reativa.
- Roles em tabela separada (`user_roles`), nunca em `profiles`.
- `MockWhatsAppAdapter` no frontend; integração real fica num backend Node.js separado.
