import type { Node } from "reactflow";
import type { AnyNodeData, NodeKind } from "../types";

/** Merge imutável de data preservando id/type/position do node. */
export function applyNodeData(
  nodes: Node[],
  id: string,
  data: AnyNodeData,
): Node[] {
  return nodes.map((n) =>
    n.id === id ? { ...n, data } : n,
  );
}

/** Para menu/random, garante ids estáveis nas opções/saídas (gera se faltar). */
export function syncDynamicHandles(kind: NodeKind, data: AnyNodeData): AnyNodeData {
  if (kind === "menu") {
    const d = data as { options?: { id?: string }[] };
    if (!d.options) return data;
    const options = d.options.map((o) => ({
      ...(o as object),
      id: o.id || cryptoId("opt"),
    }));
    return { ...(data as object), options } as AnyNodeData;
  }
  if (kind === "random") {
    const d = data as { outputs?: { id?: string }[] };
    if (!d.outputs) return data;
    const outputs = d.outputs.map((o) => ({
      ...(o as object),
      id: o.id || cryptoId("out"),
    }));
    return { ...(data as object), outputs } as AnyNodeData;
  }
  return data;
}

function cryptoId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}
