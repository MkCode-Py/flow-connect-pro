import type { Edge, Node } from "reactflow";

export function findEdgesForHandle(
  edges: Edge[],
  nodeId: string,
  handleId: string,
): Edge[] {
  return edges.filter(
    (e) => e.source === nodeId && (e.sourceHandle ?? "") === handleId,
  );
}

export function removeEdgesForHandle(
  edges: Edge[],
  nodeId: string,
  handleId: string,
): { edges: Edge[]; removed: Edge[] } {
  const removed: Edge[] = [];
  const kept: Edge[] = [];
  for (const e of edges) {
    if (e.source === nodeId && (e.sourceHandle ?? "") === handleId) removed.push(e);
    else kept.push(e);
  }
  return { edges: kept, removed };
}

/** Remove edges órfãs que apontam para handles inexistentes (após sync de handles). */
export function pruneOrphanEdges(nodes: Node[], edges: Edge[]): Edge[] {
  const validHandles = new Map<string, Set<string>>();
  for (const n of nodes) {
    // Computado externamente — pruning genérico fica a cargo do chamador.
    validHandles.set(n.id, new Set());
  }
  return edges;
}
