/** Schemas zod para validar o graph antes de persistir. */
import { z } from "zod";
import { NODE_KINDS } from "./nodeMeta";

const positionSchema = z.object({ x: z.number(), y: z.number() });

const nodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(NODE_KINDS as [string, ...string[]]),
  position: positionSchema,
  data: z.record(z.unknown()),
  deletable: z.boolean().optional(),
}).passthrough();

const edgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
}).passthrough();

const viewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().positive(),
});

export const flowGraphSchema = z.object({
  nodes: z.array(nodeSchema).refine(
    (arr) => arr.filter((n) => n.type === "start").length === 1,
    { message: "Deve existir exatamente um bloco inicial." },
  ),
  edges: z.array(edgeSchema),
  viewport: viewportSchema,
});

export type ParsedFlowGraph = z.infer<typeof flowGraphSchema>;
