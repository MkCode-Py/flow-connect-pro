import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { FLOW_KIND_LABEL, type FlowKind, type FlowGraph } from "../types";
import { buildInitialGraph } from "../utils/graph";

export type FlowRow = {
  id: string;
  owner_id: string;
  folder_id: string | null;
  name: string;
  kind: FlowKind;
  graph: FlowGraph;
  is_active: boolean;
  executions: number;
  connections: number;
  ctr: number;
  created_at: string;
  updated_at: string;
};

export type FolderRow = {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
};

const DEFAULT_KINDS: FlowKind[] = ["welcome", "default_reply", "media_default", "post_service"];

/* ------------------------------ Queries ------------------------------ */

export function useFolders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["flow-folders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flow_folders")
        .select("*")
        .eq("owner_id", user!.id)
        .order("name");
      if (error) throw error;
      return data as FolderRow[];
    },
  });
}

export function useFlows() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["flows", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flows")
        .select("*")
        .eq("owner_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as FlowRow[];
    },
  });
}

/** Garante que existam os 4 fluxos padrão para o usuário atual. */
export function useEnsureDefaultFlows(flows: FlowRow[] | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    if (!user || !flows) return;
    const missing = DEFAULT_KINDS.filter((k) => !flows.some((f) => f.kind === k));
    if (missing.length === 0) return;
    (async () => {
      const rows = missing.map((kind) => ({
        owner_id: user.id,
        kind,
        name: FLOW_KIND_LABEL[kind],
        graph: buildInitialGraph() as unknown as never,
        is_active: false,
      }));
      const { error } = await supabase.from("flows").insert(rows);
      if (!error) qc.invalidateQueries({ queryKey: ["flows"] });
    })();
  }, [user, flows, qc]);
}

export function useFoldersWithCount() {
  const folders = useFolders();
  const flows = useFlows();
  const data = useMemo(() => {
    const map = new Map<string, number>();
    (flows.data ?? []).forEach((f) => {
      if (f.folder_id) map.set(f.folder_id, (map.get(f.folder_id) ?? 0) + 1);
    });
    return (folders.data ?? []).map((fo) => ({ ...fo, count: map.get(fo.id) ?? 0 }));
  }, [folders.data, flows.data]);
  return { data, isLoading: folders.isLoading };
}

/* ---------------------------- Mutations: flows ---------------------------- */

const inv = (qc: ReturnType<typeof useQueryClient>) => () => qc.invalidateQueries({ queryKey: ["flows"] });

export function useCreateFlow() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      folder_id?: string | null;
      kind?: FlowKind;
      graph?: FlowGraph;
    }) => {
      const { data, error } = await supabase
        .from("flows")
        .insert({
          owner_id: user!.id,
          name: input.name,
          folder_id: input.folder_id ?? null,
          kind: input.kind ?? "custom",
          graph: (input.graph ?? buildInitialGraph()) as unknown as never,
        })
        .select()
        .single();
      if (error) throw error;
      return data as FlowRow;
    },
    onSuccess: inv(qc),
  });
}

export function useUpdateFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: string;
      name?: string;
      folder_id?: string | null;
      is_active?: boolean;
      graph?: FlowGraph;
    }) => {
      const { error } = await supabase.from("flows").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv(qc),
  });
}

export function useDeleteFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv(qc),
  });
}

export function useDuplicateFlow() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: src, error: e1 } = await supabase
        .from("flows")
        .select("*")
        .eq("id", id)
        .single();
      if (e1) throw e1;
      const { data, error } = await supabase
        .from("flows")
        .insert({
          owner_id: user!.id,
          name: `Cópia de ${src.name}`,
          folder_id: src.folder_id,
          kind: "custom",
          graph: src.graph,
          is_active: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as FlowRow;
    },
    onSuccess: inv(qc),
  });
}

export function useToggleFlowActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("flows").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv(qc),
  });
}

export function useResetFlowGraph() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("flows")
        .update({ graph: buildInitialGraph() as unknown as never })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv(qc),
  });
}

/* --------------------------- Mutations: folders --------------------------- */

const invFolders = (qc: ReturnType<typeof useQueryClient>) => () => {
  qc.invalidateQueries({ queryKey: ["flow-folders"] });
  qc.invalidateQueries({ queryKey: ["flows"] });
};

export function useCreateFolder() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("flow_folders")
        .insert({ owner_id: user!.id, name })
        .select()
        .single();
      if (error) throw error;
      return data as FolderRow;
    },
    onSuccess: invFolders(qc),
  });
}

export function useRenameFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("flow_folders").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invFolders(qc),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, moveFlowsToNoFolder }: { id: string; moveFlowsToNoFolder: boolean }) => {
      if (moveFlowsToNoFolder) {
        const { error: eUpd } = await supabase
          .from("flows")
          .update({ folder_id: null })
          .eq("folder_id", id);
        if (eUpd) throw eUpd;
      }
      const { error } = await supabase.from("flow_folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invFolders(qc),
  });
}
