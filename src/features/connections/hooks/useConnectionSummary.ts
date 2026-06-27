import { useInstances } from "./useInstances";
import type { WAStatus } from "@/integrations/whatsapp/adapter";

export type ConnectionSummary = {
  total: number;
  connected: number;
  waiting: number;
  errors: number;
  primaryStatus: WAStatus | "none";
  primaryName?: string;
};

export function useConnectionSummary(): ConnectionSummary {
  const { data } = useInstances();
  const list = data ?? [];
  const connected = list.filter((i) => i.status === "connected");
  const waiting = list.filter((i) => i.status === "qr_pending" || i.status === "connecting" || i.status === "reconnecting");
  const errors = list.filter((i) => i.status === "error" || i.status === "session_expired");

  let primaryStatus: WAStatus | "none" = "none";
  let primaryName: string | undefined;
  if (connected.length) { primaryStatus = "connected"; primaryName = connected[0].name; }
  else if (waiting.length) { primaryStatus = waiting[0].status; primaryName = waiting[0].name; }
  else if (errors.length) { primaryStatus = errors[0].status; primaryName = errors[0].name; }
  else if (list.length) { primaryStatus = list[0].status; primaryName = list[0].name; }

  return {
    total: list.length,
    connected: connected.length,
    waiting: waiting.length,
    errors: errors.length,
    primaryStatus,
    primaryName,
  };
}
