/** Metadados de todos os tipos de bloco — fonte única de verdade. */
import {
  Rocket, MessageCircle, Zap, GitBranch, ListChecks, HelpCircle,
  Link2, Shuffle, Webhook, Square, type LucideIcon,
} from "lucide-react";
import type {
  AnyNodeData, HandleSpec, MenuData, NodeDataByKind, NodeKind, RandomData,
} from "../types";
import { defaultDataFor } from "./nodeDataDefaults";

export type NodeMeta<K extends NodeKind = NodeKind> = {
  kind: K;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  tone: string;
  description: string;
  inputs: HandleSpec[];
  outputs: HandleSpec[] | ((data: NodeDataByKind[K]) => HandleSpec[]);
  deletable: boolean;
  unique: boolean;
  /** Saídas fixas do bloco (true/false, valid/timeout) que não podem ser removidas. */
  fixedOutputs?: HandleSpec[];
};

const IN: HandleSpec[] = [{ id: "in" }];
const OUT: HandleSpec[] = [{ id: "out" }];

export const NODE_META: { [K in NodeKind]: NodeMeta<K> } = {
  start: {
    kind: "start", label: "Bloco Inicial", shortLabel: "Início",
    icon: Rocket, tone: "start",
    description: "Seu fluxo começa por este bloco. Conecte-o com outro bloco.",
    inputs: [], outputs: OUT, deletable: false, unique: true,
  },
  content: {
    kind: "content", label: "Conteúdo", shortLabel: "Conteúdo",
    icon: MessageCircle, tone: "content",
    description: "Envia uma mensagem ao contato.",
    inputs: IN, outputs: OUT, deletable: true, unique: false,
  },
  action: {
    kind: "action", label: "Ação", shortLabel: "Ação",
    icon: Zap, tone: "action",
    description: "Executa uma ação interna na conversa.",
    inputs: IN, outputs: OUT, deletable: true, unique: false,
  },
  condition: {
    kind: "condition", label: "Condição", shortLabel: "Condição",
    icon: GitBranch, tone: "condition",
    description: "Direciona o fluxo conforme regras.",
    inputs: IN,
    outputs: [
      { id: "true", label: "Condição verdadeira" },
      { id: "false", label: "Condição falsa" },
    ],
    fixedOutputs: [
      { id: "true", label: "Condição verdadeira" },
      { id: "false", label: "Condição falsa" },
    ],
    deletable: true, unique: false,
  },
  menu: {
    kind: "menu", label: "Menu", shortLabel: "Menu",
    icon: ListChecks, tone: "menu",
    description: "Apresenta opções clicáveis para o contato.",
    inputs: IN,
    outputs: (data: MenuData) =>
      (data?.options ?? []).map((o, i) => {
        const isNumeric = data?.inputMode === "numeric";
        const prefix = isNumeric ? `${i + 1}. ` : o.shortcut ? `${o.shortcut}. ` : "";
        return { id: `opt-${o.id}`, label: `${prefix}${o.title}` };
      }),

    deletable: true, unique: false,
  },
  question: {
    kind: "question", label: "Pergunta", shortLabel: "Pergunta",
    icon: HelpCircle, tone: "question",
    description: "Faz uma pergunta e salva a resposta.",
    inputs: IN,
    outputs: [
      { id: "valid", label: "Resposta válida" },
      { id: "timeout", label: "Sem resposta" },
    ],
    fixedOutputs: [
      { id: "valid", label: "Resposta válida" },
      { id: "timeout", label: "Sem resposta" },
    ],
    deletable: true, unique: false,
  },
  flowlink: {
    kind: "flowlink", label: "Conexão de Fluxo", shortLabel: "Conexão",
    icon: Link2, tone: "flowlink",
    description: "Envia o contato para outro fluxo.",
    inputs: IN, outputs: OUT, deletable: true, unique: false,
  },
  random: {
    kind: "random", label: "Randomizador", shortLabel: "Random",
    icon: Shuffle, tone: "random",
    description: "Distribui contatos entre saídas (aleatório ou sequencial).",
    inputs: IN,
    outputs: (data: RandomData) =>
      (data?.outputs ?? []).map((b) => ({ id: `opt-${b.id}`, label: b.label })),
    deletable: true, unique: false,
  },
  webhook: {
    kind: "webhook", label: "Webhook", shortLabel: "Webhook",
    icon: Webhook, tone: "webhook",
    description: "Chama uma URL externa.",
    inputs: IN, outputs: OUT, deletable: true, unique: false,
  },
  end: {
    kind: "end", label: "Encerrar fluxo", shortLabel: "Encerrar",
    icon: Square, tone: "end",
    description: "Finaliza a automação.",
    inputs: IN, outputs: [], deletable: true, unique: false,
  },
};

export const NODE_KINDS: NodeKind[] = [
  "start", "content", "action", "condition", "menu",
  "question", "flowlink", "random", "webhook", "end",
];

export const PALETTE_KINDS: NodeKind[] = [
  "content", "action", "condition", "menu", "question",
  "flowlink", "random", "webhook", "end",
];

export function getOutputs(kind: NodeKind, data: AnyNodeData): HandleSpec[] {
  const meta = NODE_META[kind] as NodeMeta;
  return typeof meta.outputs === "function" ? meta.outputs(data as never) : meta.outputs;
}

export function getInputs(kind: NodeKind): HandleSpec[] {
  return NODE_META[kind].inputs;
}

/** Retorna defaultData de um tipo (mantido por compatibilidade). */
export function getDefaultData<K extends NodeKind>(kind: K): NodeDataByKind[K] {
  return defaultDataFor(kind);
}
