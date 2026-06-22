/** Engine pura de execução do grafo do fluxo. Reutilizável no simulador e no backend real. */
import type { Node, Edge } from "reactflow";

export type SimContact = {
  first_name: string;
  name: string;
  phone: string;
  tags: string[];
  custom: Record<string, string>;
};

export type EngineEvent =
  | { type: "start"; nodeId: string }
  | { type: "send"; nodeId: string; text: string; delayMs: number }
  | { type: "menu"; nodeId: string; question: string; options: Array<{ id: string; label: string }> }
  | { type: "question"; nodeId: string; question: string; saveAs: string }
  | { type: "action"; nodeId: string; action: string; value: string }
  | { type: "condition"; nodeId: string; branch: "true" | "false" }
  | { type: "flowlink"; nodeId: string; targetFlowId: string; targetFlowName?: string }
  | { type: "random"; nodeId: string; branchId: string }
  | { type: "webhook"; nodeId: string; method: string; url: string }
  | { type: "human"; nodeId: string }
  | { type: "paused"; nodeId: string }
  | { type: "end"; nodeId: string; resolved?: boolean }
  | { type: "log"; message: string };

export type EngineState =
  | { status: "running"; currentNodeId: string }
  | { status: "awaiting_menu"; nodeId: string }
  | { status: "awaiting_question"; nodeId: string; saveAs: string }
  | { status: "finished"; reason: string }
  | { status: "error"; message: string };

export type Graph = { nodes: Node[]; edges: Edge[] };

export function interpolate(text: string, ctx: SimContact): string {
  return text.replace(/\{\{(.*?)\}\}/g, (_, key: string) => {
    const k = key.trim();
    if (k === "primeiro_nome" || k === "first_name") return ctx.first_name || "";
    if (k === "nome" || k === "name") return ctx.name || "";
    if (k === "telefone" || k === "phone") return ctx.phone || "";
    if (k.startsWith("campo.")) return ctx.custom[k.slice(6)] ?? "";
    return ctx.custom[k] ?? "";
  });
}

function nextEdge(edges: Edge[], from: string, sourceHandle?: string): Edge | undefined {
  return edges.find((e) => e.source === from && (sourceHandle ? e.sourceHandle === sourceHandle : true));
}

function evalCondition(rules: Array<{ field: string; op: string; value: string }>, logic: string, ctx: SimContact, lastUserMessage: string): boolean {
  const check = (r: { field: string; op: string; value: string }): boolean => {
    const v = r.value?.toLowerCase() ?? "";
    switch (r.field) {
      case "tag": {
        const has = ctx.tags.map((t) => t.toLowerCase()).includes(v);
        return r.op === "is" ? has : !has;
      }
      case "name_contains": return ctx.name.toLowerCase().includes(v);
      case "phone_contains": return ctx.phone.toLowerCase().includes(v);
      case "last_message_contains": return lastUserMessage.toLowerCase().includes(v);
      case "custom": {
        const [k, val] = r.value.split("=");
        return (ctx.custom[k?.trim() ?? ""] ?? "").toLowerCase() === (val ?? "").trim().toLowerCase();
      }
      case "hour_between": {
        const [a, b] = r.value.split("-").map((x) => parseInt(x.trim(), 10));
        const h = new Date().getHours();
        return !isNaN(a) && !isNaN(b) && h >= a && h <= b;
      }
      default: return false;
    }
  };
  const results = (rules ?? []).map(check);
  if (!results.length) return false;
  return logic === "all" ? results.every(Boolean) : results.some(Boolean);
}

export class FlowEngine {
  graph: Graph;
  contact: SimContact;
  lastUserMessage = "";
  events: EngineEvent[] = [];
  state: EngineState = { status: "error", message: "not started" };
  /** subgrafo carregado dinamicamente quando seguir um Conexão de Fluxo */
  onFollowFlow?: (flowId: string) => Promise<Graph | null>;

  constructor(graph: Graph, contact: SimContact) {
    this.graph = graph;
    this.contact = { ...contact, tags: [...contact.tags], custom: { ...contact.custom } };
  }

  private emit(e: EngineEvent) { this.events.push(e); }

  /** roda o nó atual e avança até precisar de input do usuário ou terminar. */
  async run(): Promise<EngineState> {
    const start = this.graph.nodes.find((n) => n.type === "start");
    if (!start) { this.state = { status: "error", message: "Sem bloco inicial" }; return this.state; }
    this.emit({ type: "start", nodeId: start.id });
    return this.advance(start.id);
  }

  async resumeWithMenuChoice(choice: string): Promise<EngineState> {
    if (this.state.status !== "awaiting_menu") return this.state;
    const stateNodeId = this.state.nodeId;
    const node = this.graph.nodes.find((n) => n.id === stateNodeId);
    const options: Array<{ id: string; label: string }> = node.data?.options ?? [];
    const trimmed = choice.trim();
    const byIndex = options[parseInt(trimmed, 10) - 1];
    const byText = options.find((o) => o.label.toLowerCase() === trimmed.toLowerCase());
    const picked = byIndex ?? byText;
    if (!picked) {
      this.emit({ type: "log", message: `Opção "${choice}" não reconhecida.` });
      return this.state;
    }
    this.lastUserMessage = choice;
    const edge = nextEdge(this.graph.edges, node.id, picked.id);
    if (!edge) { this.state = { status: "finished", reason: "Opção sem saída conectada." }; return this.state; }
    return this.advance(edge.target);
  }

  async resumeWithAnswer(answer: string): Promise<EngineState> {
    if (this.state.status !== "awaiting_question") return this.state;
    const node = this.graph.nodes.find((n) => n.id === this.state.nodeId);
    if (!node) return this.state;
    this.lastUserMessage = answer;
    if (this.state.saveAs) {
      if (this.state.saveAs === "first_name") this.contact.first_name = answer;
      else if (this.state.saveAs === "name") this.contact.name = answer;
      else this.contact.custom[this.state.saveAs] = answer;
    }
    const valid = answer.trim().length > 0;
    const edge = nextEdge(this.graph.edges, node.id, valid ? "valid" : "invalid");
    if (!edge) { this.state = { status: "finished", reason: "Pergunta sem saída conectada." }; return this.state; }
    return this.advance(edge.target);
  }

  private async advance(nodeId: string): Promise<EngineState> {
    let current: string | null = nodeId;
    let safety = 200;
    while (current && safety-- > 0) {
      const node = this.graph.nodes.find((n) => n.id === current);
      if (!node) { this.state = { status: "error", message: `Nó ${current} não encontrado` }; return this.state; }

      switch (node.type) {
        case "start": {
          const e = nextEdge(this.graph.edges, node.id);
          current = e?.target ?? null;
          if (!current) { this.state = { status: "finished", reason: "Início sem próximo bloco." }; return this.state; }
          break;
        }
        case "content": {
          const text = interpolate(String(node.data?.text ?? ""), this.contact);
          this.emit({ type: "send", nodeId: node.id, text, delayMs: Number(node.data?.delay ?? 0) * 1000 });
          const e = nextEdge(this.graph.edges, node.id);
          current = e?.target ?? null;
          if (!current) { this.state = { status: "finished", reason: "Conteúdo sem próximo bloco." }; return this.state; }
          break;
        }
        case "action": {
          const action = String(node.data?.action ?? "");
          const value = interpolate(String(node.data?.value ?? ""), this.contact);
          this.emit({ type: "action", nodeId: node.id, action, value });
          if (action === "add_tag" && value) this.contact.tags.push(value);
          else if (action === "remove_tag" && value) this.contact.tags = this.contact.tags.filter((t) => t !== value);
          else if (action === "assign_human") { this.emit({ type: "human", nodeId: node.id }); this.state = { status: "finished", reason: "Transferido para atendimento humano." }; return this.state; }
          else if (action === "pause_automation") { this.emit({ type: "paused", nodeId: node.id }); this.state = { status: "finished", reason: "Automação pausada." }; return this.state; }
          else if (action === "mark_resolved") { this.state = { status: "finished", reason: "Conversa marcada como resolvida." }; return this.state; }
          else if (action === "update_field") {
            const [k, v] = value.split("=");
            if (k) this.contact.custom[k.trim()] = (v ?? "").trim();
          }
          const e = nextEdge(this.graph.edges, node.id);
          current = e?.target ?? null;
          if (!current) { this.state = { status: "finished", reason: "Ação sem próximo bloco." }; return this.state; }
          break;
        }
        case "condition": {
          const rules = (node.data?.rules ?? []) as Array<{ field: string; op: string; value: string }>;
          const logic = String(node.data?.logic ?? "any");
          const ok = evalCondition(rules, logic, this.contact, this.lastUserMessage);
          this.emit({ type: "condition", nodeId: node.id, branch: ok ? "true" : "false" });
          const e = nextEdge(this.graph.edges, node.id, ok ? "true" : "false");
          current = e?.target ?? null;
          if (!current) { this.state = { status: "finished", reason: "Condição sem saída conectada." }; return this.state; }
          break;
        }
        case "menu": {
          const question = interpolate(String(node.data?.question ?? ""), this.contact);
          const options = (node.data?.options ?? []) as Array<{ id: string; label: string }>;
          this.emit({ type: "menu", nodeId: node.id, question, options });
          this.state = { status: "awaiting_menu", nodeId: node.id };
          return this.state;
        }
        case "question": {
          const question = interpolate(String(node.data?.question ?? ""), this.contact);
          const saveAs = String(node.data?.saveAs ?? "");
          this.emit({ type: "question", nodeId: node.id, question, saveAs });
          this.state = { status: "awaiting_question", nodeId: node.id, saveAs };
          return this.state;
        }
        case "flowlink": {
          const targetFlowId = String(node.data?.targetFlowId ?? "");
          this.emit({ type: "flowlink", nodeId: node.id, targetFlowId, targetFlowName: String(node.data?.targetFlowName ?? "") });
          if (targetFlowId && this.onFollowFlow) {
            const g = await this.onFollowFlow(targetFlowId);
            if (g) {
              this.graph = g;
              const startNode = g.nodes.find((n) => n.type === "start");
              if (startNode) { current = startNode.id; break; }
            }
          }
          this.state = { status: "finished", reason: "Conexão de fluxo concluída." };
          return this.state;
        }
        case "random": {
          const branches = (node.data?.branches ?? []) as Array<{ id: string; label: string }>;
          if (!branches.length) { this.state = { status: "finished", reason: "Randomizador sem saídas." }; return this.state; }
          const picked = branches[Math.floor(Math.random() * branches.length)];
          this.emit({ type: "random", nodeId: node.id, branchId: picked.id });
          const e = nextEdge(this.graph.edges, node.id, picked.id);
          current = e?.target ?? null;
          if (!current) { this.state = { status: "finished", reason: "Randomizador sem saída conectada." }; return this.state; }
          break;
        }
        case "webhook": {
          this.emit({ type: "webhook", nodeId: node.id, method: String(node.data?.method ?? "POST"), url: String(node.data?.url ?? "") });
          this.emit({ type: "log", message: "Webhook executado em modo mock." });
          const e = nextEdge(this.graph.edges, node.id);
          current = e?.target ?? null;
          if (!current) { this.state = { status: "finished", reason: "Webhook sem próximo bloco." }; return this.state; }
          break;
        }
        case "end": {
          const resolved = Boolean(node.data?.markResolved);
          this.emit({ type: "end", nodeId: node.id, resolved });
          this.state = { status: "finished", reason: resolved ? "Encerrado e marcado como resolvido." : "Fluxo encerrado." };
          return this.state;
        }
        default: {
          this.state = { status: "error", message: `Tipo de nó desconhecido: ${node.type}` };
          return this.state;
        }
      }
    }
    this.state = { status: "error", message: "Loop de execução excedido." };
    return this.state;
  }
}
