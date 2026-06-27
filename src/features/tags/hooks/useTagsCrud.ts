import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export type TagRow = {
  id: string;
  owner_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
};

const KEY = (uid?: string) => ["tags", uid] as const;

export function useTagsWithCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tags", "with-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*, contact_tags(count)")
        .eq("owner_id", user!.id)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        ...t,
        contacts_count: t.contact_tags?.[0]?.count ?? 0,
      })) as Array<TagRow & { contacts_count: number }>;
    },
  });
}

export function useTagsList() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEY(user?.id),
    enabled: !!user,
    queryFn: async (): Promise<TagRow[]> => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("owner_id", user!.id)
        .order("name");
      if (error) throw error;
      return (data ?? []) as TagRow[];
    },
  });
}

export function useUpsertTag() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, color }: { id?: string; name: string; color: string }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Nome obrigatório");
      if (id) {
        const { error } = await supabase.from("tags").update({ name: trimmed, color }).eq("id", id);
        if (error) throw error;
        return { id } as { id: string };
      }
      const { data, error } = await supabase
        .from("tags")
        .insert({ owner_id: user!.id, name: trimmed, color } as any)
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Etiqueta salva");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });
}
