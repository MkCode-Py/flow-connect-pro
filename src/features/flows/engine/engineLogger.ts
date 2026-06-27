/** Pequeno builder de logs estruturados. */
import type { NodeKind } from "../editor/types";
import type { AutomationLog, LogEvent } from "./types";

let counter = 0;
const uid = () => `log_${Date.now().toString(36)}_${(++counter).toString(36)}`;

export function makeLog(
  event: LogEvent,
  message: string,
  opts: {
    nodeId?: string;
    nodeType?: NodeKind;
    payload?: Record<string, unknown>;
    now?: () => number;
  } = {},
): AutomationLog {
  return {
    id: uid(),
    timestamp: opts.now ? opts.now() : Date.now(),
    event,
    nodeId: opts.nodeId,
    nodeType: opts.nodeType,
    message,
    payload: opts.payload,
  };
}

/** Texto curto e legível para cada evento (PT-BR). */
export const EVENT_LABEL: Record<LogEvent, string> = {
  "flow.started": "Fluxo iniciado",
  "flow.finished": "Fluxo encerrado",
  "flow.error": "Erro no fluxo",
  "node.entered": "Entrou no bloco",
  "node.completed": "Bloco concluído",
  "message.sent": "Mensagem enviada",
  "menu.waiting_reply": "Aguardando resposta do menu",
  "menu.option_matched": "Opção do menu reconhecida",
  "menu.invalid_reply": "Resposta inválida no menu",
  "menu.timeout": "Tempo esgotado no menu",
  "question.waiting_reply": "Aguardando resposta da pergunta",
  "question.answer_saved": "Resposta capturada",
  "question.invalid_reply": "Resposta inválida na pergunta",
  "question.timeout": "Tempo esgotado na pergunta",
  "condition.evaluated": "Condição avaliada",
  "action.executed": "Ação executada",
  "webhook.mocked": "Webhook simulado",
  "flow_link.followed": "Fluxo conectado",
  "flow_link.missing_target": "Fluxo de destino ausente",
  "random.selected": "Saída aleatória escolhida",
  "automation.paused": "Automação pausada",
  "automation.resumed": "Automação retomada",
  "human.transfer": "Transferido para humano",
  "variable.resolved": "Variável resolvida",
  "variable.missing": "Variável ausente",
  "engine.warning": "Aviso",
};
