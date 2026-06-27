import type { FlowGraph } from "../types";

export type FlowTemplateId = "support" | "payment" | "post_service";

export type FlowTemplate = {
  id: FlowTemplateId;
  name: string;
  description: string;
  graph: FlowGraph;
};

const startNode = {
  id: "start",
  type: "start",
  position: { x: 80, y: 200 },
  data: { label: "Bloco Inicial", description: "Início do fluxo." },
};

const supportGraph: FlowGraph = {
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [
    startNode,
    {
      id: "welcome",
      type: "content",
      position: { x: 360, y: 160 },
      data: {
        mediaType: "text",
        text: "Olá {{nome}}! 👋 Seja bem-vindo(a). Como podemos te ajudar hoje?",
        delay: 1,
        typing: true,
      },
    },
    {
      id: "menu",
      type: "menu",
      position: { x: 660, y: 140 },
      data: {
        question: "Escolha uma das opções abaixo:",
        options: [
          { id: "opt-prices", label: "1 - Ver preços" },
          { id: "opt-order", label: "2 - Fazer pedido" },
          { id: "opt-human", label: "3 - Falar com atendente" },
        ],
        fallbackEnabled: true,
        fallbackWaitMinutes: 60,
      },
    },
  ],
  edges: [
    { id: "e-start-welcome", source: "start", target: "welcome" },
    { id: "e-welcome-menu", source: "welcome", target: "menu" },
  ],
};

const paymentGraph: FlowGraph = {
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [
    startNode,
    {
      id: "info",
      type: "content",
      position: { x: 360, y: 160 },
      data: {
        mediaType: "text",
        text: "Você pode pagar via *Pix*, *cartão de crédito* ou *boleto*. Para o Pix, use a chave: contato@empresa.com",
        delay: 1,
        typing: true,
      },
    },
    {
      id: "confirm",
      type: "question",
      position: { x: 660, y: 140 },
      data: { question: "Você já realizou o pagamento?", saveAs: "payment_done" },
    },
    {
      id: "tag-paid",
      type: "action",
      position: { x: 960, y: 60 },
      data: { action: "add_tag", value: "Pagamento" },
    },
    {
      id: "tag-pending",
      type: "action",
      position: { x: 960, y: 240 },
      data: { action: "add_tag", value: "Pagamento pendente" },
    },
  ],
  edges: [
    { id: "e-start-info", source: "start", target: "info" },
    { id: "e-info-confirm", source: "info", target: "confirm" },
    { id: "e-confirm-yes", source: "confirm", target: "tag-paid", sourceHandle: "true" },
    { id: "e-confirm-no", source: "confirm", target: "tag-pending", sourceHandle: "false" },
  ],
};

const postServiceGraph: FlowGraph = {
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [
    startNode,
    {
      id: "thanks",
      type: "content",
      position: { x: 360, y: 160 },
      data: {
        mediaType: "text",
        text: "Obrigado pelo atendimento, {{nome}}! Esperamos ter ajudado. 💚",
        delay: 1,
        typing: true,
      },
    },
    {
      id: "csat",
      type: "question",
      position: { x: 660, y: 140 },
      data: {
        question: "De 1 a 5, como você avalia nosso atendimento?",
        saveAs: "csat_score",
      },
    },
    {
      id: "end",
      type: "end",
      position: { x: 960, y: 140 },
      data: { markResolved: true },
    },
  ],
  edges: [
    { id: "e-start-thanks", source: "start", target: "thanks" },
    { id: "e-thanks-csat", source: "thanks", target: "csat" },
    { id: "e-csat-end", source: "csat", target: "end" },
  ],
};

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: "support",
    name: "Atendimento básico",
    description: "Boas-vindas com menu de 3 opções: preços, pedido e atendente.",
    graph: supportGraph,
  },
  {
    id: "payment",
    name: "Pagamento / Pix",
    description: "Explica formas de pagamento e marca etiqueta conforme resposta.",
    graph: paymentGraph,
  },
  {
    id: "post_service",
    name: "Pós-atendimento",
    description: "Agradece, mede satisfação (1-5) e encerra a conversa.",
    graph: postServiceGraph,
  },
];

export function getTemplateGraph(id: FlowTemplateId): FlowGraph {
  return FLOW_TEMPLATES.find((t) => t.id === id)!.graph;
}
