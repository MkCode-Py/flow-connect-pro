/** Defaults canônicos por tipo de bloco + merge tolerante para fluxos legados. */
import type {
  ActionData, ConditionData, ContentData, EndData, FlowLinkData,
  MenuData, MenuOption, NodeDataByKind, NodeKind, QuestionData,
  RandomData, RandomOutput, StartData, WebhookData, AnyNodeData,
} from "../types";

export function genId(prefix = "id"): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}

const startDefault = (): StartData => ({
  label: "Bloco Inicial",
  description: "Seu fluxo começa por este bloco. Conecte-o com outro bloco.",
});

const contentDefault = (): ContentData => ({
  label: "Conteúdo",
  contentType: "text",
  message: "Olá! Digite sua mensagem aqui.",
  enableTyping: true,
  typingDelay: 1,
  nextDelay: 0,
});

const actionDefault = (): ActionData => ({
  label: "Ação",
  actionType: "add_tag",
  tagIds: [],
  customFieldKey: "",
  customFieldValue: "",
});

const conditionDefault = (): ConditionData => ({
  label: "Condição",
  mode: "any",
  rules: [
    { id: genId("rule"), field: "last_message", operator: "contains", value: "" },
  ],
});

const menuDefault = (): MenuData => ({
  label: "Menu",
  question: "Escolha uma opção:",
  helperText: "",
  options: [
    { id: genId("opt"), shortcut: "1", title: "Opção 1", description: "", acceptedValues: ["1"] },
    { id: genId("opt"), shortcut: "2", title: "Opção 2", description: "", acceptedValues: ["2"] },
  ],
  invalidReplyMessage: "Não entendi. Escolha uma das opções acima.",
  timeoutMinutes: 60,
  timeoutMessage: "Como não recebi resposta, vou encerrar por enquanto.",
});

const questionDefault = (): QuestionData => ({
  label: "Pergunta",
  question: "Qual é o seu nome?",
  saveTo: "nome",
  validationType: "text",
  invalidMessage: "Resposta inválida. Tente novamente.",
  timeoutMinutes: 60,
  timeoutMessage: "Não recebi sua resposta.",
});

const flowlinkDefault = (): FlowLinkData => ({
  label: "Enviar para outro fluxo",
  targetFlowId: null,
  endCurrentFlow: true,
  preserveContext: true,
});

const randomDefault = (): RandomData => ({
  label: "Randomizador",
  mode: "random",
  outputs: [
    { id: genId("out"), label: "Opção A" },
    { id: genId("out"), label: "Opção B" },
  ],
});

const webhookDefault = (): WebhookData => ({
  label: "Webhook",
  method: "POST",
  url: "",
  headers: [],
  body: "",
  saveResponseTo: "",
  timeoutSeconds: 15,
  mockMode: true,
});

const endDefault = (): EndData => ({
  label: "Encerrar fluxo",
  finalMessage: "",
  markResolved: false,
  removeTemporaryTags: false,
  pauseAutomation: false,
});

const DEFAULTS: { [K in NodeKind]: () => NodeDataByKind[K] } = {
  start: startDefault,
  content: contentDefault,
  action: actionDefault,
  condition: conditionDefault,
  menu: menuDefault,
  question: questionDefault,
  flowlink: flowlinkDefault,
  random: randomDefault,
  webhook: webhookDefault,
  end: endDefault,
};

export function defaultDataFor<K extends NodeKind>(kind: K): NodeDataByKind[K] {
  return DEFAULTS[kind]();
}

/* ---------- Migrações tolerantes para dados antigos ---------- */

function migrateMenuOption(raw: unknown, idx: number): MenuOption {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id ? o.id : genId("opt");
  const shortcut =
    typeof o.shortcut === "string" && o.shortcut
      ? o.shortcut
      : String(idx + 1);
  const title =
    typeof o.title === "string" && o.title
      ? o.title
      : typeof o.label === "string" && o.label
      ? String(o.label)
      : `Opção ${idx + 1}`;
  const description = typeof o.description === "string" ? o.description : "";
  const acceptedValues = Array.isArray(o.acceptedValues)
    ? (o.acceptedValues as unknown[]).map(String).filter(Boolean)
    : [shortcut];
  return { id, shortcut, title, description, acceptedValues };
}

function migrateRandomOutput(raw: unknown, idx: number): RandomOutput {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id ? o.id : genId("out");
  const label =
    typeof o.label === "string" && o.label
      ? o.label
      : `Saída ${String.fromCharCode(65 + idx)}`;
  return { id, label };
}

/** Faz merge com defaults preservando dados existentes; tolera shapes antigos. */
export function mergeNodeData<K extends NodeKind>(
  kind: K,
  raw: unknown,
): NodeDataByKind[K] {
  const base = defaultDataFor(kind);
  if (!raw || typeof raw !== "object") return base;
  const data = raw as Record<string, unknown>;

  switch (kind) {
    case "menu": {
      const d = data as Partial<MenuData> & { options?: unknown };
      const rawOpts = Array.isArray(d.options) ? (d.options as unknown[]) : [];
      const options = rawOpts.length
        ? rawOpts.map((o, i) => migrateMenuOption(o, i))
        : (base as MenuData).options;
      return { ...(base as MenuData), ...d, options } as NodeDataByKind[K];
    }
    case "random": {
      const d = data as Partial<RandomData> & { outputs?: unknown; branches?: unknown };
      const rawOuts = Array.isArray(d.outputs)
        ? (d.outputs as unknown[])
        : Array.isArray(d.branches)
        ? (d.branches as unknown[])
        : [];
      const outputs = rawOuts.length
        ? rawOuts.map((o, i) => migrateRandomOutput(o, i))
        : (base as RandomData).outputs;
      return { ...(base as RandomData), ...d, outputs } as NodeDataByKind[K];
    }
    case "condition": {
      const d = data as Partial<ConditionData> & { rules?: unknown };
      const rawRules = Array.isArray(d.rules) ? (d.rules as unknown[]) : [];
      const rules = rawRules.length
        ? rawRules.map((r) => {
            const x = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
            return {
              id: typeof x.id === "string" ? x.id : genId("rule"),
              field: (typeof x.field === "string" ? x.field : "last_message") as ConditionData["rules"][number]["field"],
              fieldKey: typeof x.fieldKey === "string" ? x.fieldKey : undefined,
              operator: (typeof x.operator === "string"
                ? x.operator
                : typeof x.op === "string"
                ? x.op
                : "contains") as ConditionData["rules"][number]["operator"],
              value: typeof x.value === "string" ? x.value : "",
              valueEnd: typeof x.valueEnd === "string" ? x.valueEnd : undefined,
            };
          })
        : (base as ConditionData).rules;
      return { ...(base as ConditionData), ...d, rules } as NodeDataByKind[K];
    }
    case "webhook": {
      const d = data as Partial<WebhookData> & { headers?: unknown; body?: unknown };
      const headers = Array.isArray(d.headers)
        ? (d.headers as unknown[]).map((h) => {
            const x = (h && typeof h === "object" ? h : {}) as Record<string, unknown>;
            return {
              id: typeof x.id === "string" ? x.id : genId("h"),
              key: typeof x.key === "string" ? x.key : "",
              value: typeof x.value === "string" ? x.value : "",
            };
          })
        : (base as WebhookData).headers;
      const body =
        typeof d.body === "string"
          ? d.body
          : d.body && typeof d.body === "object"
          ? JSON.stringify(d.body, null, 2)
          : (base as WebhookData).body;
      return { ...(base as WebhookData), ...d, headers, body } as NodeDataByKind[K];
    }
    case "action": {
      const d = data as Partial<ActionData> & { value?: unknown };
      const tagIds = Array.isArray(d.tagIds)
        ? (d.tagIds as unknown[]).map(String)
        : (base as ActionData).tagIds;
      return { ...(base as ActionData), ...d, tagIds } as NodeDataByKind[K];
    }
    default:
      return { ...base, ...(data as object) } as NodeDataByKind[K];
  }
}

/** Migra qualquer node.data legado para o shape atual. */
export function migrateNodeData(kind: NodeKind, data: unknown): AnyNodeData {
  return mergeNodeData(kind, data);
}
