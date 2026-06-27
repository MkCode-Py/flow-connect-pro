/** Estado interno e factories para a simulação. */
import type {
  BotOutput, AutomationLog, EngineSnapshot, EngineStatus,
  PendingMenu, PendingQuestion, SimulationContact,
} from "./types";
import { defaultSimulationContact } from "./types";

export type EngineState = {
  status: EngineStatus;
  currentNodeId: string | null;
  pendingMenu: PendingMenu | null;
  pendingQuestion: PendingQuestion | null;
  visitedNodeIds: string[];
  executedEdgeIds: string[];
  variables: Record<string, string>;
  contact: SimulationContact;
  lastUserMessage: string;
  outputs: BotOutput[];
  logs: AutomationLog[];
  /** Contadores para randomizador sequencial. */
  sequentialCursors: Record<string, number>;
  /** Profundidade de execução automática desde a última pausa, para anti-loop. */
  autoStepsSincePause: number;
};

export function createInitialState(contact?: Partial<SimulationContact>): EngineState {
  const base = defaultSimulationContact();
  return {
    status: "idle",
    currentNodeId: null,
    pendingMenu: null,
    pendingQuestion: null,
    visitedNodeIds: [],
    executedEdgeIds: [],
    variables: {},
    contact: { ...base, ...contact, tags: [...(contact?.tags ?? base.tags)], customFields: { ...(contact?.customFields ?? base.customFields) } },
    lastUserMessage: "",
    outputs: [],
    logs: [],
    sequentialCursors: {},
    autoStepsSincePause: 0,
  };
}

export function snapshot(state: EngineState): EngineSnapshot {
  return {
    status: state.status,
    currentNodeId: state.currentNodeId,
    pendingMenu: state.pendingMenu,
    pendingQuestion: state.pendingQuestion,
    visitedNodeIds: [...state.visitedNodeIds],
    executedEdgeIds: [...state.executedEdgeIds],
    variables: { ...state.variables },
    contact: { ...state.contact, tags: [...state.contact.tags], customFields: { ...state.contact.customFields } },
    outputs: [...state.outputs],
    logs: [...state.logs],
  };
}
