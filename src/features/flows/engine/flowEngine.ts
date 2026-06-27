/**
 * Engine de execução de fluxos. TypeScript puro, reutilizável no backend.
 *
 * Uso típico no simulador:
 *   const engine = new FlowEngine(graph, contact);
 *   const tick1 = await engine.start();           // roda até pausar ou terminar
 *   const tick2 = await engine.sendUserMessage("1"); // resposta do usuário
 *
 * No backend (futuro), a mesma classe será invocada quando uma mensagem real
 * chegar via Baileys/whatsapp-web.js. Persistência de logs, mensagens e
 * estado pendente deve ser feita pelo backend usando os retornos de cada tick.
 */
import type { Node, Edge } from "reactflow";
import type {
  ActionData, ConditionData, ContentData, EndData, FlowLinkData,
  MenuData, NodeKind, QuestionData, RandomData, WebhookData,
} from "../editor/types";
import {
  type BotOutput, type AutomationLog, type EngineOptions, type EngineStatus,
  type EngineTickResult, type FlowGraph, type SimulationContact,
} from "./types";
import { createInitialState, snapshot, type EngineState } from "./simulationState";
import { findStartNode, getNextNode, getNodeById, getOutgoingEdges } from "./graphTraversal";
import { resolveText } from "./variableResolver";
import { matchMenuOption } from "./menuMatcher";
import { evaluateCondition } from "./conditionEvaluator";
import { executeAction } from "./actionExecutor";
import { makeLog } from "./engineLogger";

let outCounter = 0;
const outId = () => `out_${Date.now().toString(36)}_${(++outCounter).toString(36)}`;

const DEFAULT_MAX_STEPS = 50;

export class FlowEngine {
  graph: FlowGraph;
  state: EngineState;
  options: Required<Pick<EngineOptions, "maxAutoSteps" | "now">> & EngineOptions;
  /** Mapa id→nome de tags (para resolver actions e conditions). */
  tagNamesById: Record<string, string> = {};

  /** Buffers acumulados desde a última chamada pública (start/send/timeout). */
  private bufferOutputs: BotOutput[] = [];
  private bufferLogs: AutomationLog[] = [];

  constructor(graph: FlowGraph, contact?: Partial<SimulationContact>, options: EngineOptions = {}) {
    this.graph = graph;
    this.state = createInitialState(contact);
    this.options = {
      maxAutoSteps: options.maxAutoSteps ?? DEFAULT_MAX_STEPS,
      now: options.now ?? (() => Date.now()),
      resolveFlow: options.resolveFlow,
    };
  }

  /** Substitui o contato (usado quando a UI edita o painel "Contato simulado"). */
  setContact(patch: Partial<SimulationContact>) {
    this.state.contact = {
      ...this.state.contact,
      ...patch,
      tags: patch.tags ? [...patch.tags] : this.state.contact.tags,
      customFields: patch.customFields ? { ...patch.customFields } : this.state.contact.customFields,
    };
  }

  setTagNames(map: Record<string, string>) { this.tagNamesById = map; }

  getSnapshot() { return snapshot(this.state); }

  /** Reinicia o estado preservando contato e graph. */
  reset(keepContact = true) {
    const contact = keepContact ? this.state.contact : undefined;
    this.state = createInitialState(contact);
    this.bufferOutputs = [];
    this.bufferLogs = [];
  }

  // ===================================================================
  // API pública
  // ===================================================================

  async start(): Promise<EngineTickResult> {
    this.flushBuffers();
    const start = findStartNode(this.graph);
    if (!start) {
      this.pushLog(makeLog("flow.error", "Nenhum bloco inicial encontrado.", { now: this.options.now }));
      this.pushSystem(undefined, "Este fluxo não possui um bloco inicial.", "error");
      this.state.status = "error";
      return this.consumeTick();
    }
    this.pushLog(makeLog("flow.started", "Fluxo iniciado", {
      nodeId: start.id, nodeType: "start", now: this.options.now,
    }));
    this.state.visitedNodeIds.push(start.id);
    this.state.currentNodeId = start.id;
    this.state.status = "running";

    // Start não emite mensagem; segue direto.
    const { node: next, edge } = getNextNode(this.graph, start.id);
    if (!next) {
      this.pushSystem(start.id, "O bloco inicial não está conectado.", "warning");
      this.pushLog(makeLog("engine.warning", "Start sem conexão de saída.", {
        nodeId: start.id, nodeType: "start", now: this.options.now,
      }));
      this.state.status = "finished";
      this.pushLog(makeLog("flow.finished", "Fluxo encerrado (start desconectado)", { now: this.options.now }));
      return this.consumeTick();
    }
    if (edge) this.state.executedEdgeIds.push(edge.id);
    await this.runFrom(next.id);
    return this.consumeTick();
  }

  /** Recebe mensagem do usuário e continua a execução. */
  async sendUserMessage(text: string): Promise<EngineTickResult> {
    this.flushBuffers();
    this.state.lastUserMessage = text;

    if (this.state.status === "waiting_menu_reply" && this.state.pendingMenu) {
      const menuNode = getNodeById(this.graph, this.state.pendingMenu.nodeId);
      if (!menuNode) return this.consumeTick();
      const data = menuNode.data as MenuData;
      const opt = matchMenuOption(data, text);
      if (!opt) {
        this.state.pendingMenu.attempts += 1;
        this.pushSystem(menuNode.id, data.invalidReplyMessage || "Opção inválida. Tente novamente.", "warning");
        this.pushLog(makeLog("menu.invalid_reply", `Resposta "${text}" não casou com nenhuma opção`, {
          nodeId: menuNode.id, nodeType: "menu", payload: { input: text }, now: this.options.now,
        }));
        return this.consumeTick();
      }
      this.pushLog(makeLog("menu.option_matched", `Opção escolhida: ${opt.title}`, {
        nodeId: menuNode.id, nodeType: "menu", payload: { optionId: opt.id, title: opt.title, input: text }, now: this.options.now,
      }));
      this.state.pendingMenu = null;
      this.state.status = "running";
      const { node: next, edge } = getNextNode(this.graph, menuNode.id, `opt-${opt.id}`);
      if (edge) this.state.executedEdgeIds.push(edge.id);
      if (!next) {
        this.pushSystem(menuNode.id, `A opção "${opt.title}" não está conectada.`, "warning");
        this.state.status = "finished";
        this.pushLog(makeLog("flow.finished", "Fluxo encerrado", { now: this.options.now }));
      } else {
        await this.runFrom(next.id);
      }
      return this.consumeTick();
    }

    if (this.state.status === "waiting_question_reply" && this.state.pendingQuestion) {
      const qNode = getNodeById(this.graph, this.state.pendingQuestion.nodeId);
      if (!qNode) return this.consumeTick();
      const data = qNode.data as QuestionData;
      const ok = validateAnswer(text, data.validationType);
      if (!ok) {
        this.state.pendingQuestion.attempts += 1;
        this.pushSystem(qNode.id, data.invalidMessage || "Resposta inválida. Tente novamente.", "warning");
        this.pushLog(makeLog("question.invalid_reply", `Resposta "${text}" não passou na validação ${data.validationType}`, {
          nodeId: qNode.id, nodeType: "question", payload: { input: text, validation: data.validationType }, now: this.options.now,
        }));
        return this.consumeTick();
      }
      // Salva resposta.
      const saveKey = saveAnswer(this.state.contact, this.state.variables, data, text);
      this.pushLog(makeLog("question.answer_saved", `Resposta salva em {{${saveKey}}}: "${text}"`, {
        nodeId: qNode.id, nodeType: "question", payload: { saveKey, value: text }, now: this.options.now,
      }));
      this.state.pendingQuestion = null;
      this.state.status = "running";
      const { node: next, edge } = getNextNode(this.graph, qNode.id, "valid");
      if (edge) this.state.executedEdgeIds.push(edge.id);
      if (!next) {
        this.pushSystem(qNode.id, "A saída 'Resposta válida' não está conectada.", "warning");
        this.state.status = "finished";
        this.pushLog(makeLog("flow.finished", "Fluxo encerrado", { now: this.options.now }));
      } else {
        await this.runFrom(next.id);
      }
      return this.consumeTick();
    }

    // Em outros estados a mensagem é apenas registrada como última mensagem.
    return this.consumeTick();
  }

  /** Simula um timeout em menu ou pergunta pendente. */
  async simulateTimeout(): Promise<EngineTickResult> {
    this.flushBuffers();
    if (this.state.status === "waiting_menu_reply" && this.state.pendingMenu) {
      const menuNode = getNodeById(this.graph, this.state.pendingMenu.nodeId);
      if (!menuNode) return this.consumeTick();
      const data = menuNode.data as MenuData;
      this.pushLog(makeLog("menu.timeout", "Tempo esgotado no menu", {
        nodeId: menuNode.id, nodeType: "menu", now: this.options.now,
      }));
      if (data.timeoutMessage) {
        this.pushSystem(menuNode.id, data.timeoutMessage, "info");
      }
      this.state.pendingMenu = null;
      this.state.status = "finished";
      this.pushLog(makeLog("flow.finished", "Fluxo encerrado por timeout", { now: this.options.now }));
      return this.consumeTick();
    }
    if (this.state.status === "waiting_question_reply" && this.state.pendingQuestion) {
      const qNode = getNodeById(this.graph, this.state.pendingQuestion.nodeId);
      if (!qNode) return this.consumeTick();
      const data = qNode.data as QuestionData;
      this.pushLog(makeLog("question.timeout", "Tempo esgotado na pergunta", {
        nodeId: qNode.id, nodeType: "question", now: this.options.now,
      }));
      if (data.timeoutMessage) {
        this.pushSystem(qNode.id, data.timeoutMessage, "info");
      }
      this.state.pendingQuestion = null;
      this.state.status = "running";
      const { node: next, edge } = getNextNode(this.graph, qNode.id, "timeout");
      if (edge) this.state.executedEdgeIds.push(edge.id);
      if (!next) {
        this.state.status = "finished";
        this.pushLog(makeLog("flow.finished", "Fluxo encerrado (sem saída de timeout)", { now: this.options.now }));
      } else {
        await this.runFrom(next.id);
      }
      return this.consumeTick();
    }
    return this.consumeTick();
  }

  // ===================================================================
  // Execução de nós
  // ===================================================================

  private async runFrom(nodeId: string) {
    this.state.autoStepsSincePause = 0;
    let cursor: string | null = nodeId;
    while (cursor) {
      if (++this.state.autoStepsSincePause > this.options.maxAutoSteps) {
        this.pushSystem(cursor, "Possível loop infinito detectado. Execução interrompida.", "error");
        this.pushLog(makeLog("flow.error", "Loop infinito detectado", {
          nodeId: cursor, payload: { maxAutoSteps: this.options.maxAutoSteps }, now: this.options.now,
        }));
        this.state.status = "error";
        return;
      }

      const node = getNodeById(this.graph, cursor);
      if (!node) {
        this.pushLog(makeLog("flow.error", `Nó "${cursor}" não encontrado.`, { now: this.options.now }));
        this.state.status = "error";
        return;
      }

      this.state.currentNodeId = node.id;
      if (!this.state.visitedNodeIds.includes(node.id)) this.state.visitedNodeIds.push(node.id);
      this.pushLog(makeLog("node.entered", `Entrou em ${node.id}`, {
        nodeId: node.id, nodeType: node.type as NodeKind, now: this.options.now,
      }));

      const stepResult = await this.executeNode(node);
      this.pushLog(makeLog("node.completed", `Concluiu ${node.id}`, {
        nodeId: node.id, nodeType: node.type as NodeKind, now: this.options.now,
      }));

      if (stepResult.halt) return;
      if (stepResult.pause) return;
      cursor = stepResult.nextNodeId;
    }
    if (!cursor && this.state.status === "running") {
      this.state.status = "finished";
      this.pushLog(makeLog("flow.finished", "Fluxo encerrado", { now: this.options.now }));
    }
  }

  private async executeNode(node: Node): Promise<{ nextNodeId: string | null; pause?: boolean; halt?: boolean }> {
    const kind = node.type as NodeKind;
    const data = node.data;

    switch (kind) {
      case "content":      return this.execContent(node, data as ContentData);
      case "menu":         return this.execMenu(node, data as MenuData);
      case "question":     return this.execQuestion(node, data as QuestionData);
      case "condition":    return this.execCondition(node, data as ConditionData);
      case "action":       return this.execAction(node, data as ActionData);
      case "flowlink":     return this.execFlowLink(node, data as FlowLinkData);
      case "random":       return this.execRandom(node, data as RandomData);
      case "webhook":      return this.execWebhook(node, data as WebhookData);
      case "end":          return this.execEnd(node, data as EndData);
      case "start":        return this.followDefault(node);
      default:             return this.followDefault(node);
    }
  }

  private execContent(node: Node, data: ContentData) {
    if (!data.contentType || data.contentType === "text") {
      const { text, missing } = resolveText(data.message ?? "", { contact: this.state.contact, variables: this.state.variables });
      missing.forEach((k) =>
        this.pushLog(makeLog("variable.missing", `Variável {{${k}}} sem valor`, {
          nodeId: node.id, nodeType: "content", payload: { key: k }, now: this.options.now,
        })),
      );
      this.bufferOutputs.push({
        kind: "text", id: outId(), nodeId: node.id, body: text,
        timestamp: this.options.now(),
        typingMs: data.enableTyping ? Math.max(0, (data.typingDelay ?? 0) * 1000) : 0,
        nextDelayMs: Math.max(0, (data.nextDelay ?? 0) * 1000),
      });
      this.pushLog(makeLog("message.sent", text, { nodeId: node.id, nodeType: "content", now: this.options.now }));
    } else {
      const body = data.mediaCaption?.trim() || data.mediaUrl || `[Mídia mockada: ${data.contentType}]`;
      this.bufferOutputs.push({
        kind: "media_mock", id: outId(), nodeId: node.id,
        mediaType: data.contentType as "image" | "video" | "audio" | "file" | "contact",
        body, timestamp: this.options.now(),
        typingMs: data.enableTyping ? Math.max(0, (data.typingDelay ?? 0) * 1000) : 0,
        nextDelayMs: Math.max(0, (data.nextDelay ?? 0) * 1000),
      });
      this.pushLog(makeLog("engine.warning", `Envio real de ${data.contentType} será implementado no backend.`, {
        nodeId: node.id, nodeType: "content", now: this.options.now,
      }));
    }
    return this.followDefault(node);
  }

  private execMenu(node: Node, data: MenuData) {
    const { text: question } = resolveText(data.question ?? "", { contact: this.state.contact, variables: this.state.variables });
    this.bufferOutputs.push({
      kind: "menu", id: outId(), nodeId: node.id,
      question, helper: data.helperText,
      options: (data.options ?? []).map((o) => ({ id: o.id, shortcut: o.shortcut, title: o.title })),
      timestamp: this.options.now(),
    });
    this.pushLog(makeLog("menu.waiting_reply", `Menu aguardando resposta (${data.options?.length ?? 0} opções)`, {
      nodeId: node.id, nodeType: "menu", now: this.options.now,
    }));
    this.state.pendingMenu = { nodeId: node.id, attempts: 0 };
    this.state.status = "waiting_menu_reply";
    return { nextNodeId: null, pause: true };
  }

  private execQuestion(node: Node, data: QuestionData) {
    const { text: q } = resolveText(data.question ?? "", { contact: this.state.contact, variables: this.state.variables });
    this.bufferOutputs.push({
      kind: "text", id: outId(), nodeId: node.id, body: q,
      timestamp: this.options.now(), typingMs: 0, nextDelayMs: 0,
    });
    this.pushLog(makeLog("question.waiting_reply", `Aguardando resposta (validação: ${data.validationType})`, {
      nodeId: node.id, nodeType: "question", now: this.options.now,
    }));
    this.state.pendingQuestion = { nodeId: node.id, attempts: 0 };
    this.state.status = "waiting_question_reply";
    return { nextNodeId: null, pause: true };
  }

  private execCondition(node: Node, data: ConditionData) {
    const { result, evaluations } = evaluateCondition(data, {
      contact: this.state.contact,
      lastUserMessage: this.state.lastUserMessage,
      tagsById: this.tagNamesById,
    });
    this.pushLog(makeLog("condition.evaluated", `Resultado: ${result ? "VERDADEIRO" : "FALSO"} (${data.mode === "all" ? "todas" : "qualquer"})`, {
      nodeId: node.id, nodeType: "condition",
      payload: { mode: data.mode, result, evaluations: evaluations.map((e) => ({
        field: e.rule.field, operator: e.rule.operator, expected: e.rule.value, actual: e.fieldValue, pass: e.pass,
      })) },
      now: this.options.now,
    }));
    const handle = result ? "true" : "false";
    const { node: next, edge } = getNextNode(this.graph, node.id, handle);
    if (edge) this.state.executedEdgeIds.push(edge.id);
    if (!next) {
      this.pushSystem(node.id, `Saída "${handle}" não conectada.`, "warning");
      return { nextNodeId: null };
    }
    return { nextNodeId: next.id };
  }

  private execAction(node: Node, data: ActionData) {
    const result = executeAction(data, this.state.contact, this.state.variables, node.id, this.tagNamesById);
    this.state.contact = result.contact;
    result.logs.forEach((l) => this.pushLog(l));
    if (result.systemMessage) this.pushSystem(node.id, result.systemMessage, "info");
    if (result.haltAutomation) {
      this.state.status = "transferred_to_human";
      this.pushLog(makeLog("flow.finished", "Fluxo interrompido (transferência humana)", { now: this.options.now }));
      return { nextNodeId: null, halt: true };
    }
    return this.followDefault(node);
  }

  private async execFlowLink(node: Node, data: FlowLinkData) {
    if (!data.targetFlowId) {
      this.pushSystem(node.id, "Conexão de fluxo sem destino definido.", "warning");
      this.pushLog(makeLog("flow_link.missing_target", "Sem targetFlowId", { nodeId: node.id, nodeType: "flowlink", now: this.options.now }));
      return this.followDefault(node);
    }
    if (!this.options.resolveFlow) {
      this.pushSystem(node.id, `[Mock] Iria conectar ao fluxo ${data.targetFlowId}.`, "info");
      this.pushLog(makeLog("flow_link.followed", `Conectado ao fluxo ${data.targetFlowId} (mock)`, {
        nodeId: node.id, nodeType: "flowlink", payload: { targetFlowId: data.targetFlowId }, now: this.options.now,
      }));
      return data.endCurrentFlow ? { nextNodeId: null } : this.followDefault(node);
    }
    try {
      const remote = await this.options.resolveFlow(data.targetFlowId);
      if (!remote) {
        this.pushSystem(node.id, "Fluxo de destino não encontrado.", "warning");
        this.pushLog(makeLog("flow_link.missing_target", "Fluxo destino não encontrado", {
          nodeId: node.id, nodeType: "flowlink", payload: { targetFlowId: data.targetFlowId }, now: this.options.now,
        }));
        return this.followDefault(node);
      }
      this.pushLog(makeLog("flow_link.followed", `Conectado ao fluxo: ${remote.name ?? data.targetFlowId}`, {
        nodeId: node.id, nodeType: "flowlink", payload: { targetFlowId: data.targetFlowId, name: remote.name }, now: this.options.now,
      }));
      // Substitui o graph atual. Variáveis preservadas conforme flag.
      if (!data.preserveContext) this.state.variables = {};
      this.graph = remote.graph;
      const start = findStartNode(this.graph);
      if (!start) {
        this.pushSystem(node.id, "Fluxo destino sem bloco inicial.", "warning");
        return { nextNodeId: null };
      }
      const { node: next, edge } = getNextNode(this.graph, start.id);
      if (edge) this.state.executedEdgeIds.push(edge.id);
      return { nextNodeId: next ? next.id : null };
    } catch (err) {
      this.pushLog(makeLog("flow.error", `Erro ao carregar fluxo destino: ${err instanceof Error ? err.message : String(err)}`, {
        nodeId: node.id, nodeType: "flowlink", now: this.options.now,
      }));
      return this.followDefault(node);
    }
  }

  private execRandom(node: Node, data: RandomData) {
    const outs = data.outputs ?? [];
    if (!outs.length) {
      this.pushSystem(node.id, "Randomizador sem saídas configuradas.", "warning");
      return { nextNodeId: null };
    }
    let chosenIdx = 0;
    if (data.mode === "sequential") {
      const cursor = this.state.sequentialCursors[node.id] ?? 0;
      chosenIdx = cursor % outs.length;
      this.state.sequentialCursors[node.id] = cursor + 1;
    } else {
      chosenIdx = Math.floor(Math.random() * outs.length);
    }
    const chosen = outs[chosenIdx];
    this.pushLog(makeLog("random.selected", `Saída escolhida: ${chosen.label} (${data.mode})`, {
      nodeId: node.id, nodeType: "random",
      payload: { mode: data.mode, chosenIdx, chosenId: chosen.id, label: chosen.label },
      now: this.options.now,
    }));
    const { node: next, edge } = getNextNode(this.graph, node.id, `opt-${chosen.id}`);
    if (edge) this.state.executedEdgeIds.push(edge.id);
    if (!next) {
      this.pushSystem(node.id, `Saída "${chosen.label}" não conectada.`, "warning");
      return { nextNodeId: null };
    }
    return { nextNodeId: next.id };
  }

  private execWebhook(node: Node, data: WebhookData) {
    const mockResponse = { success: true, mock: true, message: "Webhook simulado com sucesso" };
    if ((data.saveResponseTo ?? "").trim()) {
      this.state.variables[data.saveResponseTo.trim()] = JSON.stringify(mockResponse);
    }
    this.pushLog(makeLog("webhook.mocked", `[MOCK] ${data.method} ${data.url || "(sem URL)"}`, {
      nodeId: node.id, nodeType: "webhook",
      payload: {
        request: { method: data.method, url: data.url, headers: data.headers, body: data.body },
        response: mockResponse,
      },
      now: this.options.now,
    }));
    this.pushLog(makeLog("engine.warning", "Execução real de webhook será implementada no backend.", {
      nodeId: node.id, nodeType: "webhook", now: this.options.now,
    }));
    return this.followDefault(node);
  }

  private execEnd(node: Node, data: EndData) {
    if (data.finalMessage?.trim()) {
      const { text } = resolveText(data.finalMessage, { contact: this.state.contact, variables: this.state.variables });
      this.bufferOutputs.push({
        kind: "text", id: outId(), nodeId: node.id, body: text,
        timestamp: this.options.now(), typingMs: 0, nextDelayMs: 0,
      });
      this.pushLog(makeLog("message.sent", text, { nodeId: node.id, nodeType: "end", now: this.options.now }));
    }
    if (data.markResolved) this.state.contact.conversationStatus = "resolved";
    if (data.pauseAutomation) this.state.contact.automationPaused = true;
    this.state.status = "finished";
    this.pushLog(makeLog("flow.finished", "Fluxo encerrado", { nodeId: node.id, nodeType: "end", now: this.options.now }));
    return { nextNodeId: null, halt: true };
  }

  private followDefault(node: Node): { nextNodeId: string | null } {
    const outs = getOutgoingEdges(this.graph, node.id);
    const edge = outs[0];
    if (!edge) return { nextNodeId: null };
    this.state.executedEdgeIds.push(edge.id);
    return { nextNodeId: edge.target };
  }

  // ===================================================================
  // Buffers
  // ===================================================================

  private pushLog(log: AutomationLog) {
    this.bufferLogs.push(log);
    this.state.logs.push(log);
  }

  private pushSystem(nodeId: string | undefined, body: string, tone: "info" | "warning" | "error" | "success") {
    this.bufferOutputs.push({ kind: "system", id: outId(), nodeId, body, tone, timestamp: this.options.now() });
  }

  private flushBuffers() {
    this.bufferOutputs = [];
    this.bufferLogs = [];
  }

  private consumeTick(): EngineTickResult {
    // Move buffers para outputs persistidos do estado.
    for (const o of this.bufferOutputs) this.state.outputs.push(o);
    const tick: EngineTickResult = {
      outputs: [...this.bufferOutputs],
      logs: [...this.bufferLogs],
      status: this.statusForExternal(),
      currentNodeId: this.state.currentNodeId,
      visitedNodeIds: [...this.state.visitedNodeIds],
      variables: { ...this.state.variables },
      contact: { ...this.state.contact, tags: [...this.state.contact.tags], customFields: { ...this.state.contact.customFields } },
    };
    this.bufferOutputs = [];
    this.bufferLogs = [];
    return tick;
  }

  private statusForExternal(): EngineStatus {
    return this.state.status;
  }
}

// ---------------------------------------------------------------------
// helpers de Pergunta
// ---------------------------------------------------------------------

function validateAnswer(text: string, validation: QuestionData["validationType"]): boolean {
  const v = (text ?? "").trim();
  if (!v) return false;
  switch (validation) {
    case "text": return true;
    case "email": return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    case "phone": return /^[+\d()\-.\s]{6,}$/.test(v);
    case "number": return !Number.isNaN(Number(v.replace(",", ".")));
    case "yes_no": {
      const n = v.toLowerCase();
      return ["sim", "s", "yes", "y", "nao", "não", "n", "no"].includes(n);
    }
    case "cpf_cnpj": return /^\d[\d.\-/]{9,}$/.test(v);
    default: return true;
  }
}

function saveAnswer(
  contact: SimulationContact,
  variables: Record<string, string>,
  data: QuestionData,
  text: string,
): string {
  switch (data.saveTo) {
    case "nome":
      contact.name = text;
      contact.firstName = text.split(/\s+/)[0] ?? text;
      variables["resposta.nome"] = text;
      return "nome";
    case "telefone":
      contact.phone = text;
      variables["resposta.telefone"] = text;
      return "telefone";
    case "email":
      contact.email = text;
      variables["resposta.email"] = text;
      return "email";
    case "empresa":
      contact.company = text;
      variables["resposta.empresa"] = text;
      return "empresa";
    case "custom_field": {
      const key = (data.customFieldKey ?? "").trim() || "resposta";
      contact.customFields[key] = text;
      variables[`campo.${key}`] = text;
      variables[`resposta.${key}`] = text;
      return `campo.${key}`;
    }
    default:
      variables["resposta"] = text;
      return "resposta";
  }
}

// Silenciador para imports de tipos não usados em runtime mas requeridos pelo TS.
export type { Edge as _Edge };
