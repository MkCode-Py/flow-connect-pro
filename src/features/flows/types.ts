/** Tipos compartilhados do domínio de fluxos. */
import type { Node, Edge, Viewport } from "reactflow";

export type FlowKind = "custom" | "welcome" | "default_reply" | "media_default" | "post_service";

export type FlowGraph = {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
};

export const EMPTY_GRAPH: FlowGraph = {
  nodes: [
    {
      id: "start",
      type: "start",
      position: { x: 80, y: 200 },
      data: { label: "Bloco Inicial" },
    },
  ],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

export const FLOW_KIND_LABEL: Record<FlowKind, string> = {
  custom: "Fluxo",
  welcome: "Fluxo de boas-vindas",
  default_reply: "Fluxo de resposta padrão",
  media_default: "Fluxo padrão para mídia",
  post_service: "Fluxo pós-atendimento",
};
