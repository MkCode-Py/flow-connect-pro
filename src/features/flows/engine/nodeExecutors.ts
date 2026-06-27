/**
 * Re-exports do módulo "nodeExecutors". Mantido como ponte para o backend:
 * a implementação real fica dentro de FlowEngine para evitar duplicação.
 */
export { executeAction } from "./actionExecutor";
export { matchMenuOption } from "./menuMatcher";
export { evaluateCondition } from "./conditionEvaluator";
export { resolveText } from "./variableResolver";
