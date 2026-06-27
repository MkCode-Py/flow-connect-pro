import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { flowGraphSchema } from "../utils/graphSchema";
import { validateGraph } from "../utils/graphUtils";
import type { FlowGraph, FlowStatus } from "../types";

type Args = {
  flowId: string | undefined;
  /** Sempre passar a versão mais recente do graph. */
  getGraph: () => FlowGraph;
  /** Nome (também persistido junto). */
  getName: () => string;
  /** Habilita autosave apenas após o graph inicial ter sido carregado. */
  enabled: boolean;
  /** Intervalo do debounce em ms. */
  debounceMs?: number;
};

export type AutosaveApi = {
  status: FlowStatus;
  lastSavedAt: Date | null;
  /** Marca como sujo (chamado em cada mudança). */
  markDirty: () => void;
  /** Força salvar imediatamente. */
  save: (opts?: { silent?: boolean }) => Promise<void>;
};

export function useGraphAutosave({
  flowId, getGraph, getName, enabled, debounceMs = 800,
}: Args): AutosaveApi {
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<number | null>(null);
  const inflightRef = useRef<boolean>(false);
  const pendingRef = useRef<boolean>(false);

  const save = useCallback(async ({ silent }: { silent?: boolean } = {}) => {
    if (!flowId) return;
    if (inflightRef.current) {
      pendingRef.current = true;
      return;
    }
    const graph = getGraph();
    const name = getName();

    // Nunca persistir graph vazio (sem start) — protege contra estado transitório
    const v = validateGraph(graph);
    if (!v.ok) {
      setStatus("error");
      if (!silent) toast.error("Graph inválido", { description: v.errors[0] });
      return;
    }
    const parsed = flowGraphSchema.safeParse(graph);
    if (!parsed.success) {
      setStatus("error");
      if (!silent) toast.error("Graph inválido", { description: parsed.error.errors[0]?.message });
      return;
    }

    inflightRef.current = true;
    setStatus("saving");
    const { error } = await supabase
      .from("flows")
      .update({
        name,
        graph: parsed.data as unknown as never,
      })
      .eq("id", flowId);
    inflightRef.current = false;

    if (error) {
      setStatus("error");
      if (!silent) toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    setLastSavedAt(new Date());
    if (pendingRef.current) {
      pendingRef.current = false;
      setStatus("dirty");
      schedule();
    } else {
      setStatus("idle");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId]);

  const schedule = useCallback(() => {
    if (!enabled) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void save({ silent: true });
    }, debounceMs);
  }, [enabled, debounceMs, save]);

  const markDirty = useCallback(() => {
    if (!enabled) return;
    setStatus((s) => (s === "saving" ? s : "dirty"));
    schedule();
  }, [enabled, schedule]);

  // Atalho Ctrl/Cmd + S → salva imediato
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, save]);

  // Flush ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
        // best-effort: dispara save silencioso
        void save({ silent: true });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // beforeunload: alerta se houver alterações pendentes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (status === "dirty" || status === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);

  return { status, lastSavedAt, markDirty, save };
}
