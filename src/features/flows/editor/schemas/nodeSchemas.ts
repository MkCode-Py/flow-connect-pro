/** Schemas zod por tipo de bloco. */
import { z } from "zod";

const baseFields = {
  label: z.string().trim().min(1, "Nome do bloco é obrigatório").max(80, "Máximo 80 caracteres"),
  description: z.string().max(280).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
};

export const startSchema = z.object({
  ...baseFields,
});

export const contentSchema = z.object({
  ...baseFields,
  contentType: z.enum(["text", "image", "video", "audio", "file", "contact"]),
  message: z.string().max(4000).default(""),
  mediaUrl: z.string().max(500).optional().or(z.literal("")),
  mediaCaption: z.string().max(500).optional().or(z.literal("")),
  contactName: z.string().max(120).optional().or(z.literal("")),
  contactPhone: z.string().max(40).optional().or(z.literal("")),
  enableTyping: z.boolean(),
  typingDelay: z.number().min(0, "Não pode ser negativo").max(60),
  nextDelay: z.number().min(0, "Não pode ser negativo").max(120),
}).superRefine((d, ctx) => {
  if (d.contentType === "text" && !d.message.trim()) {
    ctx.addIssue({ code: "custom", path: ["message"], message: "Digite a mensagem que será enviada" });
  }
});

export const actionSchema = z.object({
  ...baseFields,
  actionType: z.enum([
    "add_tag", "remove_tag", "pause_bot", "resume_bot",
    "transfer_human", "mark_resolved", "update_field",
  ]),
  tagIds: z.array(z.string()),
  customFieldKey: z.string().default(""),
  customFieldValue: z.string().default(""),
}).superRefine((d, ctx) => {
  if ((d.actionType === "add_tag" || d.actionType === "remove_tag") && d.tagIds.length === 0) {
    ctx.addIssue({ code: "custom", path: ["tagIds"], message: "Selecione ao menos uma etiqueta" });
  }
  if (d.actionType === "update_field" && !d.customFieldKey) {
    ctx.addIssue({ code: "custom", path: ["customFieldKey"], message: "Escolha um campo personalizado" });
  }
});

export const conditionRuleSchema = z.object({
  id: z.string(),
  field: z.enum([
    "tag", "contact_name", "contact_phone", "custom_field",
    "last_message", "current_time", "bot_paused", "conversation_status",
  ]),
  fieldKey: z.string().optional(),
  operator: z.enum([
    "is", "is_not", "contains", "not_contains",
    "starts_with", "ends_with", "is_empty", "is_not_empty", "between",
  ]),
  value: z.string(),
  valueEnd: z.string().optional(),
}).superRefine((r, ctx) => {
  const requiresValue = r.operator !== "is_empty" && r.operator !== "is_not_empty";
  if (requiresValue && !r.value.trim()) {
    ctx.addIssue({ code: "custom", path: ["value"], message: "Informe o valor de comparação" });
  }
  if (r.operator === "between" && !r.valueEnd?.trim()) {
    ctx.addIssue({ code: "custom", path: ["valueEnd"], message: "Informe o limite superior" });
  }
  if (r.field === "custom_field" && !r.fieldKey?.trim()) {
    ctx.addIssue({ code: "custom", path: ["fieldKey"], message: "Escolha o campo personalizado" });
  }
});

export const conditionSchema = z.object({
  ...baseFields,
  mode: z.enum(["all", "any"]),
  rules: z.array(conditionRuleSchema).min(1, "Adicione pelo menos uma condição"),
});

export const menuOptionSchema = z.object({
  id: z.string(),
  shortcut: z.string().trim().min(1, "Atalho obrigatório").max(8),
  title: z.string().trim().min(1, "Título obrigatório").max(80),
  description: z.string().max(160).optional().or(z.literal("")),
  acceptedValues: z.array(z.string().trim().min(1)).optional().default([]),
});

export const menuSchema = z.object({
  ...baseFields,
  question: z.string().trim().min(1, "Texto do menu é obrigatório").max(1000),
  helperText: z.string().max(400).optional().or(z.literal("")),
  inputMode: z.enum(["buttons", "numeric"]).default("buttons"),
  options: z.array(menuOptionSchema).min(1, "Adicione pelo menos uma opção").max(10, "Máximo de 10 opções"),
  invalidReplyMessage: z.string().max(500).default(""),
  timeoutMinutes: z.number().min(0, "Não pode ser negativo").max(10080),
  timeoutMessage: z.string().max(500).default(""),
});


export const questionSchema = z.object({
  ...baseFields,
  question: z.string().trim().min(1, "Texto da pergunta é obrigatório").max(1000),
  saveTo: z.enum(["nome", "telefone", "email", "empresa", "custom_field"]),
  customFieldKey: z.string().optional(),
  validationType: z.enum(["text", "email", "phone", "number", "yes_no", "cpf_cnpj"]),
  invalidMessage: z.string().max(500).default(""),
  timeoutMinutes: z.number().min(0).max(10080),
  timeoutMessage: z.string().max(500).default(""),
}).superRefine((d, ctx) => {
  if (d.saveTo === "custom_field" && !d.customFieldKey?.trim()) {
    ctx.addIssue({ code: "custom", path: ["customFieldKey"], message: "Escolha o campo personalizado" });
  }
});

export const flowLinkSchema = z.object({
  ...baseFields,
  targetFlowId: z.string().nullable(),
  endCurrentFlow: z.boolean(),
  preserveContext: z.boolean(),
});

export const randomOutputSchema = z.object({
  id: z.string(),
  label: z.string().trim().min(1, "Nome obrigatório").max(60),
});

export const randomSchema = z.object({
  ...baseFields,
  mode: z.enum(["random", "sequential"]),
  outputs: z.array(randomOutputSchema).min(2, "Mínimo de 2 saídas"),
});

const headerSchema = z.object({
  id: z.string(),
  key: z.string().trim().max(120),
  value: z.string().max(500),
});

export const webhookSchema = z.object({
  ...baseFields,
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  url: z.string().max(2000),
  headers: z.array(headerSchema),
  body: z.string().max(20000),
  saveResponseTo: z.string().max(120).optional().or(z.literal("")),
  timeoutSeconds: z.number().min(1, "Mínimo 1s").max(120, "Máximo 120s"),
  mockMode: z.boolean(),
}).superRefine((d, ctx) => {
  if (!d.mockMode) {
    try {
      const u = new URL(d.url);
      if (!u.protocol.startsWith("http")) throw new Error();
    } catch {
      ctx.addIssue({ code: "custom", path: ["url"], message: "Informe uma URL http(s) válida" });
    }
  }
  if (d.body.trim()) {
    try { JSON.parse(d.body); }
    catch { ctx.addIssue({ code: "custom", path: ["body"], message: "JSON inválido" }); }
  }
});

export const endSchema = z.object({
  ...baseFields,
  finalMessage: z.string().max(1000).default(""),
  markResolved: z.boolean(),
  removeTemporaryTags: z.boolean(),
  pauseAutomation: z.boolean(),
});

import type { NodeKind } from "../types";

export const SCHEMA_BY_KIND = {
  start: startSchema,
  content: contentSchema,
  action: actionSchema,
  condition: conditionSchema,
  menu: menuSchema,
  question: questionSchema,
  flowlink: flowLinkSchema,
  random: randomSchema,
  webhook: webhookSchema,
  end: endSchema,
} as const;

export function nodeSchemaFor(kind: NodeKind) {
  return SCHEMA_BY_KIND[kind];
}

export type FieldErrors = Record<string, string>;

/** Valida dados e retorna um mapa { caminho: mensagem } amigável. */
export function validateNodeData(kind: NodeKind, data: unknown): {
  ok: boolean; errors: FieldErrors;
} {
  const schema = nodeSchemaFor(kind);
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, errors: {} };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_root";
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}
