import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export type ContactRow = {
  id: string;
  owner_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  notes: string | null;
  custom_fields: Record<string, unknown>;
  automation_paused: boolean;
  created_at: string;
  updated_at: string;
};

const KEY = (uid?: string) => ["contacts", uid] as const;

export function useContacts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEY(user?.id),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*, contact_tags(tag:tags(id, name, color)), conversations(last_message_at)")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        ...c,
        custom_fields: c.custom_fields ?? {},
        tags: (c.contact_tags ?? []).map((r: any) => r.tag).filter(Boolean),
        last_conversation_at:
          (c.conversations ?? [])
            .map((r: any) => r.last_message_at)
            .filter(Boolean)
            .sort()
            .pop() ?? null,
      })) as Array<ContactRow & { tags: Array<{ id: string; name: string; color: string }>; last_conversation_at: string | null }>;
    },
  });
}

export type ContactInput = {
  id?: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  notes?: string | null;
  automation_paused?: boolean;
  custom_fields?: Record<string, unknown>;
};

export function useUpsertContact() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ContactInput) => {
      if (!input.name.trim()) throw new Error("Nome obrigatório");
      const payload: any = {
        name: input.name.trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        company: input.company?.trim() || null,
        notes: input.notes ?? null,
      };
      if (typeof input.automation_paused === "boolean") payload.automation_paused = input.automation_paused;
      if (input.custom_fields) payload.custom_fields = input.custom_fields;
      if (input.id) {
        const { error } = await supabase.from("contacts").update(payload).eq("id", input.id);
        if (error) throw error;
        return { id: input.id };
      }
      const { data, error } = await supabase
        .from("contacts")
        .insert({ owner_id: user!.id, ...payload })
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["inbox", "conversations"] });
      toast.success("Contato salvo");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
      toast.success("Contato excluído");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useEnsureConversationForContact() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (contactId: string): Promise<string> => {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("contact_id", contactId)
        .eq("owner_id", user!.id)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (existing?.id) return existing.id as string;
      const { data, error } = await supabase
        .from("conversations")
        .insert({ owner_id: user!.id, contact_id: contactId, status: "open" } as any)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
  });
}

export function useApplyContactTagBulk() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contactId, tagId, attach }: { contactId: string; tagId: string; attach: boolean }) => {
      if (attach) {
        const { error } = await supabase
          .from("contact_tags")
          .upsert({ owner_id: user!.id, contact_id: contactId, tag_id: tagId } as any, { onConflict: "contact_id,tag_id" });
        if (error && !`${error.message}`.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase.from("contact_tags").delete().eq("contact_id", contactId).eq("tag_id", tagId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}
