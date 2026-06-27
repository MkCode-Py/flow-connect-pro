/** Avalia regras de blocos de Condição. */
import type { ConditionData, ConditionRule } from "../editor/types";
import type { SimulationContact } from "./types";
import { normalize } from "./menuMatcher";

export type EvalInput = {
  contact: SimulationContact;
  lastUserMessage: string;
  /** Tags disponíveis no projeto, para comparar por id quando rule.value for um id. */
  tagsById?: Record<string, string>;
};

export type RuleEvaluation = {
  rule: ConditionRule;
  fieldValue: string;
  pass: boolean;
};

function resolveFieldValue(rule: ConditionRule, ctx: EvalInput): string {
  switch (rule.field) {
    case "tag":
      return ctx.contact.tags.join(",");
    case "contact_name":
      return ctx.contact.name;
    case "contact_phone":
      return ctx.contact.phone;
    case "custom_field":
      return ctx.contact.customFields[rule.fieldKey ?? ""] ?? "";
    case "last_message":
      return ctx.lastUserMessage;
    case "current_time":
      return new Date().getHours().toString();
    case "bot_paused":
      return ctx.contact.automationPaused ? "true" : "false";
    case "conversation_status":
      return ctx.contact.conversationStatus;
    default:
      return "";
  }
}

function compare(rule: ConditionRule, fieldValue: string, ctx: EvalInput): boolean {
  const a = normalize(fieldValue);
  const b = normalize(rule.value ?? "");

  // Tag: comparar contra lista do contato (suporta nome ou id).
  if (rule.field === "tag") {
    const tagNames = ctx.contact.tags.map(normalize);
    const tagFromId = ctx.tagsById?.[rule.value ?? ""] ?? rule.value ?? "";
    const target = normalize(tagFromId);
    const has = tagNames.includes(target);
    if (rule.operator === "is") return has;
    if (rule.operator === "is_not") return !has;
    if (rule.operator === "is_empty") return ctx.contact.tags.length === 0;
    if (rule.operator === "is_not_empty") return ctx.contact.tags.length > 0;
    if (rule.operator === "contains") return tagNames.some((t) => t.includes(target));
    return false;
  }

  switch (rule.operator) {
    case "is": return a === b;
    case "is_not": return a !== b;
    case "contains": return !!b && a.includes(b);
    case "not_contains": return !b || !a.includes(b);
    case "starts_with": return !!b && a.startsWith(b);
    case "ends_with": return !!b && a.endsWith(b);
    case "is_empty": return a.length === 0;
    case "is_not_empty": return a.length > 0;
    case "between": {
      const n = Number(fieldValue);
      const min = Number(rule.value);
      const max = Number(rule.valueEnd);
      if (Number.isNaN(n) || Number.isNaN(min) || Number.isNaN(max)) return false;
      return n >= min && n <= max;
    }
    default: return false;
  }
}

export function evaluateCondition(
  data: ConditionData,
  ctx: EvalInput,
): { result: boolean; evaluations: RuleEvaluation[] } {
  const rules = data.rules ?? [];
  const evaluations: RuleEvaluation[] = rules.map((rule) => {
    const fieldValue = resolveFieldValue(rule, ctx);
    return { rule, fieldValue, pass: compare(rule, fieldValue, ctx) };
  });
  if (!evaluations.length) return { result: false, evaluations };
  const result =
    data.mode === "all"
      ? evaluations.every((e) => e.pass)
      : evaluations.some((e) => e.pass);
  return { result, evaluations };
}
