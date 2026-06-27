import type { FlowGraph } from "../types";

/** Graph inicial mínimo de qualquer fluxo. */
export function buildInitialGraph(): FlowGraph {
  return {
    nodes: [
      {
        id: "start",
        type: "start",
        position: { x: 120, y: 160 },
        data: {
          label: "Bloco Inicial",
          description: "Seu fluxo começa por este bloco. Conecte-o com outro bloco.",
        },
      },
    ],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}
