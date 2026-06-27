import type { Connection, Edge, Node } from "reactflow";
import { EMPTY_VIEWPORT, type FlowGraph, type NodeKind } from "../types";
import { NODE_META, getInputs, getOutputs } from "./nodeMeta";
import { createStartNode } from "./nodeFactory";
import { migrateNodeData } from "./nodeDataDefaults";


/** Garante que exista exatamente 1 bloco start; nunca remove dados existentes. */
export function ensureStartNode(nodes: Node[]): Node[] {
  const starts = nodes.filter((n) => n.type === "start");
  if (starts.length === 1) {
    return nodes.map((n) =>
      n.type === "start" ? { ...n, deletable: false, id: "start" } : n,
    );
  }
  if (starts.length === 0) {
    return [createStartNode(), ...nodes];
  }
  // mantém o primeiro, descarta os demais
  const [keep, ...rest] = starts;
  const removedIds = new Set(rest.map((r) => r.id));
  return nodes
    .filter((n) => !removedIds.has(n.id))
    .map((n) => (n.id === keep.id ? { ...n, id: "start", deletable: false } : n));
}

/** Saneia um graph vindo do banco (JSONB) para um FlowGraph confiável. */
export function sanitizeGraph(raw: unknown): FlowGraph {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Partial<FlowGraph>;
  const nodes = Array.isArray(obj.nodes) ? (obj.nodes as Node[]) : [];
  const edges = Array.isArray(obj.edges) ? (obj.edges as Edge[]) : [];
  const viewport = obj.viewport && typeof obj.viewport === "object"
    ? { x: Number((obj.viewport as { x?: number }).x ?? 0),
        y: Number((obj.viewport as { y?: number }).y ?? 0),
        zoom: Number((obj.viewport as { zoom?: number }).zoom ?? 1) }
    : EMPTY_VIEWPORT;

  const safeNodes = ensureStartNode(
    nodes
      .filter((n) => n && typeof n.id === "string" && typeof n.type === "string")
      .filter((n) => (NODE_META as Record<string, unknown>)[n.type as string])
      .map((n) => ({
        ...n,
        position: {
          x: Number(n.position?.x ?? 0),
          y: Number(n.position?.y ?? 0),
        },
        data: migrateNodeData(n.type as NodeKind, n.data),
        deletable: NODE_META[n.type as NodeKind].deletable,
      })),
  );


  const nodeIds = new Set(safeNodes.map((n) => n.id));
  const safeEdges = edges
    .filter((e) => e && typeof e.source === "string" && typeof e.target === "string")
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map((e, i) => ({
      ...e,
      id: e.id ?? `e_${i}_${e.source}_${e.target}`,
    }));

  return { nodes: safeNodes, edges: safeEdges, viewport };
}

export type ValidationResult = { ok: boolean; errors: string[] };

export function validateGraph(graph: FlowGraph): ValidationResult {
  const errors: string[] = [];
  const starts = graph.nodes.filter((n) => n.type === "start");
  if (starts.length !== 1) errors.push("Deve existir exatamente um bloco inicial.");

  for (const n of graph.nodes) {
    if (!n.id || !n.type) errors.push(`Bloco sem id/tipo.`);
    if (!n.position || typeof n.position.x !== "number" || typeof n.position.y !== "number") {
      errors.push(`Bloco ${n.id} sem posição válida.`);
    }
    if (!n.data || typeof n.data !== "object") {
      errors.push(`Bloco ${n.id} sem dados.`);
    }
  }

  const ids = new Set(graph.nodes.map((n) => n.id));
  for (const e of graph.edges) {
    if (!e.source || !e.target) errors.push(`Conexão sem origem/destino.`);
    if (!ids.has(e.source)) errors.push(`Conexão aponta para bloco inexistente (${e.source}).`);
    if (!ids.has(e.target)) errors.push(`Conexão aponta para bloco inexistente (${e.target}).`);
  }

  return { ok: errors.length === 0, errors };
}

/** Regras de conexão: chamadas pelo ReactFlow em isValidConnection. */
export function isValidConnection(c: Connection, nodes: Node[]): boolean {
  if (!c.source || !c.target) return false;
  if (c.source === c.target) return false; // sem self-loop
  const src = nodes.find((n) => n.id === c.source);
  const tgt = nodes.find((n) => n.id === c.target);
  if (!src || !tgt) return false;
  const srcKind = src.type as NodeKind | undefined;
  const tgtKind = tgt.type as NodeKind | undefined;
  if (!srcKind || !tgtKind) return false;

  const outs = getOutputs(srcKind, (src.data ?? {}) as never);
  const ins = getInputs(tgtKind);
  if (outs.length === 0) return false;
  if (ins.length === 0) return false;

  // sourceHandle precisa existir
  if (c.sourceHandle && !outs.some((h) => h.id === c.sourceHandle)) return false;
  // se source tem múltiplas saídas, sourceHandle é obrigatório
  if (outs.length > 1 && !c.sourceHandle) return false;

  return true;
}

/** Calcula nodes desconectados (sem nenhuma edge entrando ou saindo). */
export function getDisconnectedIds(nodes: Node[], edges: Edge[]): Set<string> {
  const connected = new Set<string>();
  edges.forEach((e) => {
    connected.add(e.source);
    connected.add(e.target);
  });
  return new Set(
    nodes
      .filter((n) => n.type !== "start" && !connected.has(n.id))
      .map((n) => n.id),
  );
}

/** Centro visível usado para posicionar novos blocos. */
export function pickInsertPosition(
  existing: Node[],
  bounds?: { x: number; y: number },
) {
  if (bounds) return bounds;
  if (!existing.length) return { x: 320, y: 200 };
  const last = existing[existing.length - 1];
  return { x: last.position.x + 280, y: last.position.y };
}
