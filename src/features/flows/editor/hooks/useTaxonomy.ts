/** Hooks para taxonomia do owner: tags e custom_fields. */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Tag = { id: string; name: string; color: string | null };
export type CustomField = { id: string; key: string; label: string; field_type: string };

export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("id,name,color")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Tag[];
    },
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const owner_id = auth.user?.id;
      if (!owner_id) throw new Error("Sessão expirada");
      const { data, error } = await supabase
        .from("tags")
        .insert({ name, color: color ?? null, owner_id })
        .select()
        .single();
      if (error) throw error;
      return data as Tag;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });
}

export function useCustomFields() {
  return useQuery<CustomField[]>({
    queryKey: ["custom_fields"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_fields")
        .select("id,key,label,field_type")
        .order("label", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CustomField[];
    },
  });
}

export function useCreateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, label, fieldType }: { key: string; label: string; fieldType?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const owner_id = auth.user?.id;
      if (!owner_id) throw new Error("Sessão expirada");
      const { data, error } = await supabase
        .from("custom_fields")
        .insert({
          key,
          label,
          field_type: fieldType ?? "text",
          owner_id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CustomField;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom_fields"] }),
  });
}

export function useFlowsLite() {
  return useQuery({
    queryKey: ["flows", "lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flows")
        .select("id,name,folder_id,is_active")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; folder_id: string | null; is_active: boolean }[];
    },
  });
}

export function useFlowFolders() {
  return useQuery({
    queryKey: ["flow_folders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flow_folders")
        .select("id,name")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });
}
