/**
 * Engine de fluxos do MK Flow.
 *
 * Esta engine é pura (TypeScript, sem React). No frontend ela alimenta o
 * simulador do editor; no backend (Claude Code) deverá ser invocada sempre
 * que uma mensagem chegar por WhatsApp Web/QR (Baileys ou whatsapp-web.js):
 *
 *   const engine = new FlowEngine(flow.graph, contactFromDb);
 *   await engine.start();
 *   // quando o usuário responder:
 *   await engine.sendUserMessage(msg.body);
 *
 * O backend deve persistir mensagens e logs retornados em cada tick nas
 * tabelas `messages` e `automation_logs`.
 */
export { FlowEngine } from "./flowEngine";
export * from "./types";
export { defaultSimulationContact } from "./types";
export { resolveText, getVariableValue, collectAllVariables } from "./variableResolver";
export { matchMenuOption, normalize } from "./menuMatcher";
export { evaluateCondition } from "./conditionEvaluator";
export { executeAction } from "./actionExecutor";
export { findStartNode, getNextNode, getNodeById, isStartConnected } from "./graphTraversal";
export { EVENT_LABEL, makeLog } from "./engineLogger";
