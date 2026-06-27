import type { NodeTypes } from "reactflow";
import { BaseNode } from "./BaseNode";
import { NODE_KINDS } from "../utils/nodeMeta";

/** Todos os tipos de nó usam o mesmo componente visual, alimentado por NODE_META. */
export const nodeTypes: NodeTypes = Object.fromEntries(
  NODE_KINDS.map((k) => [k, BaseNode]),
);

export { BaseNode, setBaseNodeContext } from "./BaseNode";
