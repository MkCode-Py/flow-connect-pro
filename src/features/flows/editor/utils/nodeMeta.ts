/** Metadados de todos os tipos de bloco — fonte única de verdade. */
import {
  Rocket, MessageCircle, Zap, GitBranch, ListChecks, HelpCircle,
  Link2, Shuffle, Webhook, Square, type LucideIcon,
} from "lucide-react";
import type {
  AnyNodeData, HandleSpec, MenuData, NodeDataByKind, NodeKind, RandomData,
} from "../types";

export type NodeMeta<K extends NodeKind = NodeKind> = {
  kind: K;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  /** chave do token de cor: text-node-<tone>, bg-node-<tone> */
  tone: string;
  description: string;
  defaultData: NodeDataByKind[K];
  inputs: HandleSpec[];
  /** lista estática OU função que deriva dos dados (menu/random). */
  outputs: HandleSpec[] | ((data: NodeDataByKind[K]) => HandleSpec[]);
  /** Se o bloco é deletável manualmente. */
  deletable: boolean;
  /** Se pode existir mais de um no fluxo. */
  unique: boolean;
};

const IN: HandleSpec[] = [{ id: "in" }];
const OUT: HandleSpec[] = [{ id: "out" }];

export const NODE_META: { [K in NodeKind]: NodeMeta<K> } = {
  start: {
    kind: "start",
    label: "Bloco Inicial",
    shortLabel: "Início",
    icon: Rocket,
    tone: "start",
    description: "Seu fluxo começa por este bloco. Conecte-o com outro bloco.",
    defaultData: {
      label: "Bloco Inicial",
      description: "Seu fluxo começa por este bloco. Conecte-o com outro bloco.",
    },
    inputs: [],
    outputs: OUT,
    deletable: false,
    unique: true,
  },
  content: {
    kind: "content",
    label: "Conteúdo",
    shortLabel: "Conteúdo",
    icon: MessageCircle,
    tone: "content",
    description: "Envia uma mensagem ao contato.",
    defaultData: {
      label: "Conteúdo",
      message: "Digite sua mensagem aqui...",
      typingDelay: 1,
      enableTyping: true,
    },
    inputs: IN,
    outputs: OUT,
    deletable: true,
    unique: false,
  },
  action: {
    kind: "action",
    label: "Ação",
    shortLabel: "Ação",
    icon: Zap,
    tone: "action",
    description: "Executa uma ação interna na conversa.",
    defaultData: { label: "Ação", actionType: "add_tag", value: "" },
    inputs: IN,
    outputs: OUT,
    deletable: true,
    unique: false,
  },
  condition: {
    kind: "condition",
    label: "Condição",
    shortLabel: "Condição",
    icon: GitBranch,
    tone: "condition",
    description: "Direciona o fluxo conforme regras.",
    defaultData: {
      label: "Condição",
      mode: "any",
      rules: [{ field: "tag", op: "is", value: "" }],
    },
    inputs: IN,
    outputs: [
      { id: "true", label: "Condição verdadeira" },
      { id: "false", label: "Condição falsa" },
    ],
    deletable: true,
    unique: false,
  },
  menu: {
    kind: "menu",
    label: "Menu",
    shortLabel: "Menu",
    icon: ListChecks,
    tone: "menu",
    description: "Apresenta opções clicáveis para o contato.",
    defaultData: {
      label: "Menu",
      question: "Escolha uma opção:",
      options: [
        { id: "opt-1", label: "1 - Ver preços" },
        { id: "opt-2", label: "2 - Fazer pedido" },
        { id: "opt-3", label: "3 - Falar com atendente" },
      ],
    },
    inputs: IN,
    outputs: (data: MenuData) =>
      (data?.options ?? []).map((o) => ({ id: `opt-${o.id}`, label: o.label })),
    deletable: true,
    unique: false,
  },
  question: {
    kind: "question",
    label: "Pergunta",
    shortLabel: "Pergunta",
    icon: HelpCircle,
    tone: "question",
    description: "Faz uma pergunta e salva a resposta.",
    defaultData: { label: "Pergunta", question: "Qual é o seu nome?", saveTo: "nome" },
    inputs: IN,
    outputs: [
      { id: "valid", label: "Resposta válida" },
      { id: "timeout", label: "Sem resposta" },
    ],
    deletable: true,
    unique: false,
  },
  flowlink: {
    kind: "flowlink",
    label: "Conexão de Fluxo",
    shortLabel: "Conexão",
    icon: Link2,
    tone: "flowlink",
    description: "Envia o contato para outro fluxo.",
    defaultData: { label: "Enviar para outro fluxo", targetFlowId: null },
    inputs: IN,
    outputs: OUT,
    deletable: true,
    unique: false,
  },
  random: {
    kind: "random",
    label: "Randomizador",
    shortLabel: "Random",
    icon: Shuffle,
    tone: "random",
    description: "Distribui contatos entre saídas (aleatório ou sequencial).",
    defaultData: {
      label: "Randomizador",
      mode: "random",
      branches: [
        { id: "a", label: "Opção A" },
        { id: "b", label: "Opção B" },
      ],
    },
    inputs: IN,
    outputs: (data: RandomData) =>
      (data?.branches ?? []).map((b) => ({ id: `opt-${b.id}`, label: b.label })),
    deletable: true,
    unique: false,
  },
  webhook: {
    kind: "webhook",
    label: "Webhook",
    shortLabel: "Webhook",
    icon: Webhook,
    tone: "webhook",
    description: "Chama uma URL externa.",
    defaultData: { label: "Webhook", method: "POST", url: "" },
    inputs: IN,
    outputs: OUT,
    deletable: true,
    unique: false,
  },
  end: {
    kind: "end",
    label: "Encerrar fluxo",
    shortLabel: "Encerrar",
    icon: Square,
    tone: "end",
    description: "Finaliza a automação.",
    defaultData: { label: "Encerrar fluxo", markResolved: false },
    inputs: IN,
    outputs: [],
    deletable: true,
    unique: false,
  },
};

export const NODE_KINDS: NodeKind[] = [
  "start", "content", "action", "condition", "menu",
  "question", "flowlink", "random", "webhook", "end",
];

/** Kinds disponíveis na paleta (start é único e auto-criado). */
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
