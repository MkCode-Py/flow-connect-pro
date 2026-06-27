/** Navegação do graph: encontrar start, próximo nó por handle, blocos desconectados. */
import type { Edge, Node } from "reactflow";
import type { FlowGraph } from "./types";

export function findStartNode(graph: FlowGraph): Node | null {
  return graph.nodes.find((n) => n.type === "start") ?? null;
}

export function getNodeById(graph: FlowGraph, id: string | null | undefined): Node | null {
  if (!id) return null;
  return graph.nodes.find((n) => n.id === id) ?? null;
}

/** Edges saindo do nó atual, opcionalmente filtradas por sourceHandle. */
export function getOutgoingEdges(
  graph: FlowGraph,
  nodeId: string,
  sourceHandle?: string | null,
): Edge[] {
  return graph.edges.filter((e) => {
    if (e.source !== nodeId) return false;
    if (sourceHandle == null) return true;
    return (e.sourceHandle ?? null) === sourceHandle;
  });
}

/** Próximo nó conectado pela saída padrão ou por um handle específico. */
export function getNextNode(
  graph: FlowGraph,
  currentNodeId: string,
  sourceHandle?: string | null,
): { node: Node | null; edge: Edge | null } {
  const out = getOutgoingEdges(graph, currentNodeId, sourceHandle);
  // Para nós com saída única, ignorar sourceHandle ausente.
  const edge = out[0] ?? null;
  if (!edge) return { node: null, edge: null };
  const node = getNodeById(graph, edge.target);
  return { node, edge };
}

export function isStartConnected(graph: FlowGraph): boolean {
  const start = findStartNode(graph);
  if (!start) return false;
  return graph.edges.some((e) => e.source === start.id);
}
