/** Tipos do editor visual de fluxos. Fonte única de verdade do shape de cada bloco. */
import type { Node, Edge, Viewport } from "reactflow";

export type NodeKind =
  | "start" | "content" | "action" | "condition" | "menu"
  | "question" | "flowlink" | "random" | "webhook" | "end";

export type FlowStatus = "idle" | "dirty" | "saving" | "error";

export type HandleSpec = { id: string; label?: string };

/* ============== Start ============== */
export type StartData = {
  label: string;
  description?: string;
  notes?: string;
};

/* ============== Content ============== */
export type ContentType = "text" | "image" | "video" | "audio" | "file" | "contact";

export type ContentData = {
  label: string;
  description?: string;
  notes?: string;
  contentType: ContentType;
  /** Texto da mensagem (usado quando contentType === "text"). */
  message: string;
  /** URL/placeholder para tipos de mídia (preparado, sem envio real ainda). */
  mediaUrl?: string;
  mediaCaption?: string;
  contactName?: string;
  contactPhone?: string;
  enableTyping: boolean;
  /** Segundos exibindo "digitando..." antes de enviar. */
  typingDelay: number;
  /** Segundos de espera após enviar antes de seguir. */
  nextDelay: number;
};

/* ============== Action ============== */
export type ActionType =
  | "add_tag"
  | "remove_tag"
  | "pause_bot"
  | "resume_bot"
  | "transfer_human"
  | "mark_resolved"
  | "update_field";

export type ActionData = {
  label: string;
  description?: string;
  notes?: string;
  actionType: ActionType;
  /** IDs de etiquetas para add_tag/remove_tag. */
  tagIds: string[];
  /** Chave do custom_field para update_field. */
  customFieldKey: string;
  /** Valor (texto, pode conter variáveis). */
  customFieldValue: string;
};

/* ============== Condition ============== */
export type ConditionField =
  | "tag"
  | "contact_name"
  | "contact_phone"
  | "custom_field"
  | "last_message"
  | "current_time"
  | "bot_paused"
  | "conversation_status";

export type ConditionOperator =
  | "is"
  | "is_not"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty"
  | "between";

export type ConditionRule = {
  id: string;
  field: ConditionField;
  /** Quando field === "custom_field", chave do campo a comparar. */
  fieldKey?: string;
  operator: ConditionOperator;
  value: string;
  /** Segundo valor para operator === "between". */
  valueEnd?: string;
};

export type ConditionData = {
  label: string;
  description?: string;
  notes?: string;
  mode: "all" | "any";
  rules: ConditionRule[];
};

/* ============== Menu ============== */
export type MenuInputMode = "buttons" | "numeric";

export type MenuOption = {
  id: string;
  shortcut: string;
  title: string;
  description?: string;
  /** Mantido para compatibilidade com fluxos antigos; não é mais editável na UI. */
  acceptedValues?: string[];
};

export type MenuData = {
  label: string;
  description?: string;
  notes?: string;
  question: string;
  helperText?: string;
  inputMode: MenuInputMode;
  options: MenuOption[];
  invalidReplyMessage: string;
  timeoutMinutes: number;
  timeoutMessage: string;
};


/* ============== Question ============== */
export type QuestionSaveTo = "nome" | "telefone" | "email" | "empresa" | "custom_field";
export type ValidationType = "text" | "email" | "phone" | "number" | "yes_no" | "cpf_cnpj";

export type QuestionData = {
  label: string;
  description?: string;
  notes?: string;
  question: string;
  saveTo: QuestionSaveTo;
  /** Chave do custom_field quando saveTo === "custom_field". */
  customFieldKey?: string;
  validationType: ValidationType;
  invalidMessage: string;
  timeoutMinutes: number;
  timeoutMessage: string;
};

/* ============== Flow Link ============== */
export type FlowLinkData = {
  label: string;
  description?: string;
  notes?: string;
  targetFlowId: string | null;
  endCurrentFlow: boolean;
  preserveContext: boolean;
};

/* ============== Random ============== */
export type RandomOutput = { id: string; label: string };

export type RandomData = {
  label: string;
  description?: string;
  notes?: string;
  mode: "random" | "sequential";
  outputs: RandomOutput[];
};

/* ============== Webhook ============== */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type WebhookHeader = { id: string; key: string; value: string };

export type WebhookData = {
  label: string;
  description?: string;
  notes?: string;
  method: HttpMethod;
  url: string;
  headers: WebhookHeader[];
  /** Corpo serializado em JSON (string editável pelo usuário). */
  body: string;
  saveResponseTo: string;
  timeoutSeconds: number;
  mockMode: boolean;
};

/* ============== End ============== */
export type EndData = {
  label: string;
  description?: string;
  notes?: string;
  finalMessage: string;
  markResolved: boolean;
  removeTemporaryTags: boolean;
  pauseAutomation: boolean;
};

export type NodeDataByKind = {
  start: StartData;
  content: ContentData;
  action: ActionData;
  condition: ConditionData;
  menu: MenuData;
  question: QuestionData;
  flowlink: FlowLinkData;
  random: RandomData;
  webhook: WebhookData;
  end: EndData;
};

export type AnyNodeData = NodeDataByKind[NodeKind];

export type FlowNode<K extends NodeKind = NodeKind> = Node<NodeDataByKind[K]> & { type: K };

export type FlowGraph = {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
};

export const EMPTY_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };
