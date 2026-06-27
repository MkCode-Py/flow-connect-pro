/** Executa blocos de Ação modificando o contato simulado. */
import type { ActionData } from "../editor/types";
import type { AutomationLog, SimulationContact } from "./types";
import { resolveText } from "./variableResolver";
import { makeLog } from "./engineLogger";

export type ActionResult = {
  contact: SimulationContact;
  /** Indica que o fluxo deve parar (transfer_human). */
  haltAutomation: boolean;
  systemMessage?: string;
  logs: AutomationLog[];
};

export function executeAction(
  data: ActionData,
  contact: SimulationContact,
  variables: Record<string, string>,
  nodeId: string,
  tagNamesById: Record<string, string> = {},
): ActionResult {
  const next: SimulationContact = {
    ...contact,
    tags: [...contact.tags],
    customFields: { ...contact.customFields },
  };
  const logs: AutomationLog[] = [];
  let haltAutomation = false;
  let systemMessage: string | undefined;

  const resolveTagNames = (ids: string[]): string[] =>
    ids.map((id) => tagNamesById[id] ?? id).filter(Boolean);

  switch (data.actionType) {
    case "add_tag": {
      const names = resolveTagNames(data.tagIds ?? []);
      for (const n of names) if (!next.tags.includes(n)) next.tags.push(n);
      logs.push(makeLog("action.executed", `Etiquetas adicionadas: ${names.join(", ") || "nenhuma"}`, {
        nodeId, nodeType: "action", payload: { actionType: "add_tag", tags: names },
      }));
      break;
    }
    case "remove_tag": {
      const names = resolveTagNames(data.tagIds ?? []);
      next.tags = next.tags.filter((t) => !names.includes(t));
      logs.push(makeLog("action.executed", `Etiquetas removidas: ${names.join(", ") || "nenhuma"}`, {
        nodeId, nodeType: "action", payload: { actionType: "remove_tag", tags: names },
      }));
      break;
    }
    case "pause_bot": {
      next.automationPaused = true;
      logs.push(makeLog("automation.paused", "Automação pausada para este contato", {
        nodeId, nodeType: "action",
      }));
      break;
    }
    case "resume_bot": {
      next.automationPaused = false;
      logs.push(makeLog("automation.resumed", "Automação retomada", {
        nodeId, nodeType: "action",
      }));
      break;
    }
    case "transfer_human": {
      haltAutomation = true;
      systemMessage = "Conversa transferida para atendimento humano.";
      logs.push(makeLog("human.transfer", systemMessage, { nodeId, nodeType: "action" }));
      break;
    }
    case "mark_resolved": {
      next.conversationStatus = "resolved";
      logs.push(makeLog("action.executed", "Conversa marcada como resolvida", {
        nodeId, nodeType: "action", payload: { actionType: "mark_resolved" },
      }));
      break;
    }
    case "update_field": {
      const key = (data.customFieldKey ?? "").trim();
      const { text: value } = resolveText(data.customFieldValue ?? "", { contact: next, variables });
      if (key) next.customFields[key] = value;
      logs.push(makeLog("action.executed", `Campo "${key}" atualizado para "${value}"`, {
        nodeId, nodeType: "action", payload: { actionType: "update_field", key, value },
      }));
      break;
    }
  }

  return { contact: next, haltAutomation, systemMessage, logs };
}
