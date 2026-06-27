/**
 * Resolve variáveis de contato em strings de respostas rápidas e mensagens.
 * Tokens suportados:
 *   {{nome}}            -> contact.name
 *   {{primeiro_nome}}   -> primeiro token de contact.name
 *   {{telefone}}        -> contact.phone
 *   {{email}}           -> contact.email
 *   {{empresa}}         -> contact.company
 *   {{campo.<chave>}}   -> contact.custom_fields[<chave>]
 *
 * Tokens não resolvidos permanecem como estão (útil para o atendente notar).
 */
export type VariableContact = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  custom_fields?: Record<string, unknown> | null;
};

const TOKEN_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

export function resolveContactVariables(template: string, contact: VariableContact | null | undefined): string {
  if (!template) return template;
  if (!contact) return template;
  return template.replace(TOKEN_RE, (match, raw: string) => {
    const key = raw.trim().toLowerCase();
    if (key === "nome") return contact.name ?? match;
    if (key === "primeiro_nome") return (contact.name?.split(/\s+/)[0]) ?? match;
    if (key === "telefone") return contact.phone ?? match;
    if (key === "email") return contact.email ?? match;
    if (key === "empresa") return contact.company ?? match;
    if (key.startsWith("campo.")) {
      const fieldKey = key.slice("campo.".length);
      const value = contact.custom_fields?.[fieldKey];
      if (value === undefined || value === null) return match;
      return String(value);
    }
    return match;
  });
}

export const AVAILABLE_VARIABLES = [
  { token: "{{nome}}", label: "Nome completo" },
  { token: "{{primeiro_nome}}", label: "Primeiro nome" },
  { token: "{{telefone}}", label: "Telefone" },
  { token: "{{email}}", label: "E-mail" },
  { token: "{{empresa}}", label: "Empresa" },
  { token: "{{campo.chave}}", label: "Campo personalizado" },
];
