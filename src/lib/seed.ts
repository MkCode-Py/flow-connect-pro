/**
 * Cria as 4 entradas de "Fluxos Padrões Básicos" se ainda não existirem.
 * Idempotente — pode ser chamado em todo login.
 */
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_FLOWS = [
  { kind: "welcome" as const, name: "Fluxo de boas-vindas" },
  { kind: "default_reply" as const, name: "Fluxo de resposta padrão" },
  { kind: "media_default" as const, name: "Fluxo padrão para mídia" },
  { kind: "post_service" as const, name: "Fluxo pós-atendimento" },
];

const DEFAULT_QUICK_REPLIES = [
  { shortcut: "/ola", content: "Olá! Como posso ajudar você hoje?", category: "Saudação" },
  { shortcut: "/aguarde", content: "Por favor aguarde um instante, já vou te atender.", category: "Atendimento" },
  { shortcut: "/obrigado", content: "Obrigado pelo contato! Tenha um excelente dia.", category: "Despedida" },
];

const DEFAULT_TAGS = [
  { name: "Cliente", color: "#22c55e" },
  { name: "Lead", color: "#3b82f6" },
  { name: "NaoEnviarFluxo", color: "#ef4444" },
];

export async function ensureSeed(userId: string) {
  const tasks: Promise<unknown>[] = [];

  const { data: existing } = await supabase
    .from("flows")
    .select("kind")
    .eq("owner_id", userId)
    .neq("kind", "custom");
  const have = new Set((existing ?? []).map((r) => r.kind));
  const missing = DEFAULT_FLOWS.filter((f) => !have.has(f.kind));
  if (missing.length) {
    tasks.push(
      Promise.resolve(
        supabase.from("flows").insert(missing.map((m) => ({ owner_id: userId, name: m.name, kind: m.kind })))
      )
    );
  }

  const { count: qrCount } = await supabase
    .from("quick_replies").select("*", { count: "exact", head: true }).eq("owner_id", userId);
  if (!qrCount) {
    tasks.push(
      Promise.resolve(
        supabase.from("quick_replies").insert(DEFAULT_QUICK_REPLIES.map((q) => ({ owner_id: userId, ...q })))
      )
    );
  }

  const { count: tagCount } = await supabase
    .from("tags").select("*", { count: "exact", head: true }).eq("owner_id", userId);
  if (!tagCount) {
    tasks.push(
      Promise.resolve(
        supabase.from("tags").insert(DEFAULT_TAGS.map((t) => ({ owner_id: userId, ...t })))
      )
    );
  }

  await Promise.allSettled(tasks);
}
