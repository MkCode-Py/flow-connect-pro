/** Metadados de todos os tipos de bloco do editor. */
import {
  Rocket, MessageCircle, Zap, GitBranch, ListChecks, HelpCircle,
  Link2, Shuffle, Webhook, Square, type LucideIcon,
} from "lucide-react";

export type NodeKind =
  | "start" | "content" | "action" | "condition" | "menu"
  | "question" | "flowlink" | "random" | "webhook" | "end";

export type NodeDef = {
  kind: NodeKind;
  label: string;
  icon: LucideIcon;
  /** classe tailwind do "tema" (border/bg/text) */
  tone: string;
  description: string;
  defaultData: Record<string, unknown>;
  /** quantos handles de saída esse bloco tem ("dynamic" = depende dos dados) */
  outputs: number | "dynamic";
  /** se aceita handle de entrada */
  hasInput: boolean;
  /** se pode existir mais de um no fluxo */
  unique?: boolean;
};

export const NODE_DEFS: Record<NodeKind, NodeDef> = {
  start: {
    kind: "start", label: "Bloco Inicial", icon: Rocket, tone: "start",
    description: "Seu fluxo começa por este bloco. Conecte-o com outro bloco.",
    defaultData: {}, outputs: 1, hasInput: false, unique: true,
  },
  content: {
    kind: "content", label: "Conteúdo", icon: MessageCircle, tone: "content",
    description: "Envia uma mensagem para o contato.",
    defaultData: { mediaType: "text", text: "Escreva sua mensagem aqui...", delay: 1, typing: true },
    outputs: 1, hasInput: true,
  },
  action: {
    kind: "action", label: "Ação", icon: Zap, tone: "action",
    description: "Executa uma ação interna na conversa.",
    defaultData: { action: "add_tag", value: "" },
    outputs: 1, hasInput: true,
  },
  condition: {
    kind: "condition", label: "Condição", icon: GitBranch, tone: "condition",
    description: "Direciona o fluxo conforme regras.",
    defaultData: { logic: "any", rules: [{ field: "tag", op: "is", value: "" }] },
    outputs: 2, hasInput: true,
  },
  menu: {
    kind: "menu", label: "Menu", icon: ListChecks, tone: "menu",
    description: "Apresenta opções clicáveis para o contato.",
    defaultData: {
      question: "Como posso ajudar você?",
      options: [{ id: "1", label: "Ver preços" }, { id: "2", label: "Falar com atendente" }],
      fallbackEnabled: true, fallbackWaitMinutes: 60,
    },
    outputs: "dynamic", hasInput: true,
  },
  question: {
    kind: "question", label: "Pergunta", icon: HelpCircle, tone: "question",
    description: "Faz uma pergunta e salva a resposta.",
    defaultData: { question: "Qual é seu nome?", saveAs: "first_name" },
    outputs: 2, hasInput: true,
  },
  flowlink: {
    kind: "flowlink", label: "Conexão de Fluxo", icon: Link2, tone: "flowlink",
    description: "Envia o contato para outro fluxo.",
    defaultData: { targetFlowId: "" },
    outputs: 0, hasInput: true,
  },
  random: {
    kind: "random", label: "Randomizador", icon: Shuffle, tone: "random",
    description: "Escolhe uma saída aleatória ou sequencial.",
    defaultData: { mode: "random", branches: [{ id: "a", label: "A" }, { id: "b", label: "B" }] },
    outputs: "dynamic", hasInput: true,
  },
  webhook: {
    kind: "webhook", label: "Webhook", icon: Webhook, tone: "webhook",
    description: "Chama uma URL externa (mock no MVP).",
    defaultData: { method: "POST", url: "", headers: "{}", body: "{}", saveAs: "" },
    outputs: 1, hasInput: true,
  },
  end: {
    kind: "end", label: "Encerrar Fluxo", icon: Square, tone: "end",
    description: "Finaliza a automação.",
    defaultData: { markResolved: false },
    outputs: 0, hasInput: true,
  },
};

export const NODE_KINDS: NodeKind[] = ["content", "menu", "condition", "action", "question", "flowlink", "random", "webhook", "end"];

export function toneClasses(tone: string) {
  return {
    bar: `bg-node-${tone}`,
    icon: `text-node-${tone}-fg bg-node-${tone}`,
    ring: `data-[selected=true]:ring-2 data-[selected=true]:ring-node-${tone}`,
  };
}
