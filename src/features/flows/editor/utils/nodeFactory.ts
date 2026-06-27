import type { Node, XYPosition } from "reactflow";
import { NODE_META } from "./nodeMeta";
import { defaultDataFor } from "./nodeDataDefaults";
import type { NodeDataByKind, NodeKind } from "../types";

export function newNodeId(kind: NodeKind): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${kind}_${rand}`;
}

export function createStartNode(): Node<NodeDataByKind["start"]> {
  return {
    id: "start",
    type: "start",
    position: { x: 120, y: 160 },
    data: defaultDataFor("start"),
    deletable: false,
  };
}

export function createNode<K extends NodeKind>(
  kind: K,
  position: XYPosition,
): Node<NodeDataByKind[K]> {
  const meta = NODE_META[kind];
  return {
    id: newNodeId(kind),
    type: kind,
    position,
    data: defaultDataFor(kind),
    deletable: meta.deletable,
  };
}
