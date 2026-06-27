import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export type QuickReply = {
  id: string;
  owner_id: string;
  shortcut: string;
  title: string | null;
  category: string | null;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const KEY = (uid?: string) => ["quick_replies", uid] as const;

export function useQuickReplies() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEY(user?.id),
    enabled: !!user,
    queryFn: async (): Promise<QuickReply[]> => {
      const { data, error } = await supabase
        .from("quick_replies")
        .select("*")
        .eq("owner_id", user!.id)
        .order("shortcut");
      if (error) throw error;
      return (data ?? []) as QuickReply[];
    },
  });
}

export type QuickReplyInput = {
  id?: string;
  shortcut: string;
  title?: string | null;
  category?: string | null;
  content: string;
  is_active?: boolean;
};

export function useUpsertQuickReply() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: QuickReplyInput) => {
      const shortcut = input.shortcut.trim();
      if (!shortcut.startsWith("/")) throw new Error("O atalho precisa começar com /");
      if (!input.content.trim()) throw new Error("Conteúdo obrigatório");
      const payload = {
        shortcut: shortcut.toLowerCase(),
        title: input.title?.trim() || null,
        category: input.category?.trim() || null,
        content: input.content,
        is_active: input.is_active ?? true,
      };
      if (input.id) {
        const { error } = await supabase.from("quick_replies").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("quick_replies")
          .insert({ owner_id: user!.id, ...payload } as any);
        if (error) {
          if (`${error.message}`.toLowerCase().includes("duplicate")) {
            throw new Error("Já existe uma resposta rápida com esse atalho.");
          }
          throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(user?.id) });
      toast.success("Resposta rápida salva");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDuplicateQuickReply() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (q: QuickReply) => {
      const newShortcut = `${q.shortcut}-copia`;
      const { error } = await supabase
        .from("quick_replies")
        .insert({
          owner_id: user!.id,
          shortcut: newShortcut,
          title: q.title ? `${q.title} (cópia)` : null,
          category: q.category,
          content: q.content,
          is_active: q.is_active,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(user?.id) });
      toast.success("Resposta duplicada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteQuickReply() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quick_replies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(user?.id) }),
  });
}

export function useToggleQuickReplyActive() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("quick_replies").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(user?.id) }),
  });
}
