/** Resolve variáveis {{nome}}, {{primeiro_nome}}, {{campo.X}}, {{resposta.X}}. */
import type { SimulationContact } from "./types";

export type VariableContext = {
  contact: SimulationContact;
  variables: Record<string, string>;
};

const PLACEHOLDER = /\{\{\s*([\w.]+)\s*\}\}/g;

export function getVariableValue(
  key: string,
  ctx: VariableContext,
): string | undefined {
  const k = key.trim();
  switch (k) {
    case "nome":
    case "name":
      return ctx.contact.name;
    case "primeiro_nome":
    case "first_name":
      return ctx.contact.firstName;
    case "telefone":
    case "phone":
      return ctx.contact.phone;
    case "email":
      return ctx.contact.email;
    case "empresa":
    case "company":
      return ctx.contact.company;
  }
  if (k.startsWith("campo.")) {
    return ctx.contact.customFields[k.slice(6)];
  }
  if (k.startsWith("resposta.")) {
    return ctx.variables[`resposta.${k.slice(9)}`] ?? ctx.variables[k.slice(9)];
  }
  return ctx.variables[k];
}

export type ResolveResult = {
  text: string;
  missing: string[];
};

export function resolveText(text: string, ctx: VariableContext): ResolveResult {
  const missing: string[] = [];
  if (!text) return { text: "", missing };
  const out = text.replace(PLACEHOLDER, (_, key: string) => {
    const v = getVariableValue(key, ctx);
    if (v == null || v === "") {
      missing.push(key.trim());
      return "";
    }
    return v;
  });
  return { text: out, missing };
}

/** Lista todas as variáveis padrão + custom + capturadas para exibir na UI. */
export function collectAllVariables(ctx: VariableContext): { key: string; value: string }[] {
  const list: { key: string; value: string }[] = [
    { key: "primeiro_nome", value: ctx.contact.firstName },
    { key: "nome", value: ctx.contact.name },
    { key: "telefone", value: ctx.contact.phone },
    { key: "email", value: ctx.contact.email },
    { key: "empresa", value: ctx.contact.company },
  ];
  for (const [k, v] of Object.entries(ctx.contact.customFields)) {
    list.push({ key: `campo.${k}`, value: v });
  }
  for (const [k, v] of Object.entries(ctx.variables)) {
    list.push({ key: k, value: v });
  }
  return list;
}
