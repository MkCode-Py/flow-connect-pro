/** Tipos do editor visual de fluxos. */
import type { Node, Edge, Viewport } from "reactflow";

export type NodeKind =
  | "start" | "content" | "action" | "condition" | "menu"
  | "question" | "flowlink" | "random" | "webhook" | "end";

export type FlowStatus = "idle" | "dirty" | "saving" | "error";

export type HandleSpec = { id: string; label?: string };

export type StartData = { label: string; description?: string };

export type ContentData = {
  label: string;
  message: string;
  typingDelay: number;
  enableTyping: boolean;
};

export type ActionData = {
  label: string;
  actionType: "add_tag" | "remove_tag" | "transfer" | "pause_bot";
  value?: string;
};

export type ConditionRule = { field: string; op: "is" | "contains" | "is_not"; value: string };
export type ConditionData = {
  label: string;
  mode: "any" | "all";
  rules: ConditionRule[];
};

export type MenuOption = { id: string; label: string };
export type MenuData = {
  label: string;
  question: string;
  options: MenuOption[];
};

export type QuestionData = {
  label: string;
  question: string;
  saveTo: string;
  timeoutMinutes?: number;
};

export type FlowLinkData = { label: string; targetFlowId: string | null };

export type RandomBranch = { id: string; label: string };
export type RandomData = { label: string; mode: "random" | "sequential"; branches: RandomBranch[] };

export type WebhookData = {
  label: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  headers?: string;
  body?: string;
};

export type EndData = { label: string; markResolved: boolean };

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
