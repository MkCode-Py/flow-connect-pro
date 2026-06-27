/**
 * Tipos públicos da engine de execução de fluxos.
 *
 * Esta engine roda em TypeScript puro, sem dependência de React. Ela é usada
 * agora pelo simulador no editor e poderá ser reutilizada pelo backend Node
 * (Baileys/whatsapp-web.js) sem alterações de assinatura.
 */
import type { Edge, Node, Viewport } from "reactflow";
import type { AnyNodeData, NodeKind } from "../editor/types";

export type FlowGraph = {
  nodes: Node[];
  edges: Edge[];
  viewport?: Viewport;
};

export type FlowNode<K extends NodeKind = NodeKind> = Node<AnyNodeData> & { type: K };
export type FlowEdge = Edge;

/** Status público da simulação. */
export type EngineStatus =
  | "idle"
  | "running"
  | "waiting_input"
  | "waiting_menu_reply"
  | "waiting_question_reply"
  | "transferred_to_human"
  | "finished"
  | "error";

/** Contato simulado — mutável durante a execução por blocos de Ação. */
export type SimulationContact = {
  id: string;
  name: string;
  firstName: string;
  phone: string;
  email: string;
  company: string;
  tags: string[];
  customFields: Record<string, string>;
  automationPaused: boolean;
  conversationStatus: "open" | "pending" | "resolved";
};

export function defaultSimulationContact(): SimulationContact {
  return {
    id: "sim_contact_1",
    name: "João Silva",
    firstName: "João",
    phone: "+55 11 99999-9999",
    email: "joao@email.com",
    company: "Empresa Exemplo",
    tags: [],
    customFields: {},
    automationPaused: false,
    conversationStatus: "open",
  };
}

/** Estados pendentes quando a engine pausa aguardando o usuário. */
export type PendingMenu = {
  nodeId: string;
  attempts: number;
};

export type PendingQuestion = {
  nodeId: string;
  attempts: number;
};

/** Saída visível do bot (renderizada no chat do simulador). */
export type BotOutput =
  | {
      kind: "text";
      id: string;
      nodeId: string;
      body: string;
      timestamp: number;
      typingMs: number;
      nextDelayMs: number;
    }
  | {
      kind: "media_mock";
      id: string;
      nodeId: string;
      mediaType: "image" | "video" | "audio" | "file" | "contact";
      body: string;
      timestamp: number;
      typingMs: number;
      nextDelayMs: number;
    }
  | {
      kind: "menu";
      id: string;
      nodeId: string;
      question: string;
      helper?: string;
      inputMode: "buttons" | "numeric";
      options: { id: string; shortcut: string; title: string }[];
      timestamp: number;
    }
  | {
      kind: "system";
      id: string;
      nodeId?: string;
      body: string;
      tone: "info" | "warning" | "error" | "success";
      timestamp: number;
    };

/** Evento estruturado para a aba "Logs". */
export type LogEvent =
  | "flow.started"
  | "flow.finished"
  | "flow.error"
  | "node.entered"
  | "node.completed"
  | "message.sent"
  | "menu.waiting_reply"
  | "menu.option_matched"
  | "menu.invalid_reply"
  | "menu.timeout"
  | "question.waiting_reply"
  | "question.answer_saved"
  | "question.invalid_reply"
  | "question.timeout"
  | "condition.evaluated"
  | "action.executed"
  | "webhook.mocked"
  | "flow_link.followed"
  | "flow_link.missing_target"
  | "random.selected"
  | "automation.paused"
  | "automation.resumed"
  | "human.transfer"
  | "variable.resolved"
  | "variable.missing"
  | "engine.warning";

export type AutomationLog = {
  id: string;
  timestamp: number;
  event: LogEvent;
  nodeId?: string;
  nodeType?: NodeKind;
  message: string;
  payload?: Record<string, unknown>;
};

/** Resultado de um ciclo de execução (start, sendUserMessage, simulateTimeout). */
export type EngineTickResult = {
  outputs: BotOutput[];
  logs: AutomationLog[];
  status: EngineStatus;
  currentNodeId: string | null;
  visitedNodeIds: string[];
  variables: Record<string, string>;
  contact: SimulationContact;
};

/** Snapshot completo do contexto, útil para a UI exibir variáveis/contato/logs. */
export type EngineSnapshot = {
  status: EngineStatus;
  currentNodeId: string | null;
  pendingMenu: PendingMenu | null;
  pendingQuestion: PendingQuestion | null;
  visitedNodeIds: string[];
  executedEdgeIds: string[];
  variables: Record<string, string>;
  contact: SimulationContact;
  outputs: BotOutput[];
  logs: AutomationLog[];
};

/** Opções de criação da engine. */
export type EngineOptions = {
  /** Limite duro para detectar loops sem entrada do usuário. */
  maxAutoSteps?: number;
  /** Resolve um graph remoto para Conexão de Fluxo (opcional). */
  resolveFlow?: (flowId: string) => Promise<{ name?: string; graph: FlowGraph } | null>;
  /** Permite injetar relógio para testes. */
  now?: () => number;
};
