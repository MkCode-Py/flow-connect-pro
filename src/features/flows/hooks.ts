import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EMPTY_GRAPH } from "./types";
import type { FlowKind } from "./types";

export function useFlowFolders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["flow-folders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flow_folders").select("*").eq("owner_id", user!.id).order("created_at");
      if (error) throw error;
      return data;
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
        .from("flows").select("*").eq("owner_id", user!.id).order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateFolder() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from("flow_folders").insert({ owner_id: user!.id, name }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flow-folders"] }),
  });
}

export function useRenameFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("flow_folders").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flow-folders"] }),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flow_folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flow-folders"] });
      qc.invalidateQueries({ queryKey: ["flows"] });
    },
  });
}

export function useCreateFlow() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; folder_id?: string | null; kind?: FlowKind }) => {
      const { data, error } = await supabase.from("flows").insert({
        owner_id: user!.id,
        name: input.name,
        folder_id: input.folder_id ?? null,
        kind: input.kind ?? "custom",
        graph: EMPTY_GRAPH as never,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flows"] }),
  });
}

export function useUpdateFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; name?: string; folder_id?: string | null; is_active?: boolean; graph?: unknown }) => {
      const { error } = await supabase.from("flows").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flows"] }),
  });
}

export function useDeleteFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flows"] }),
  });
}

export function useDuplicateFlow() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: src, error: e1 } = await supabase.from("flows").select("*").eq("id", id).single();
      if (e1) throw e1;
      const { error } = await supabase.from("flows").insert({
        owner_id: user!.id,
        name: `${src.name} (cópia)`,
        folder_id: src.folder_id,
        kind: "custom",
        graph: src.graph,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flows"] }),
  });
}
