import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import type { ConversationStatus, InboxConversation, InboxMessage, MessageDirection, MessageSender } from "../types";

const CONV_KEY = (uid?: string) => ["inbox", "conversations", uid] as const;
const MSGS_KEY = (cid?: string | null) => ["inbox", "messages", cid] as const;
const LOGS_KEY = (cid?: string | null) => ["inbox", "logs", cid] as const;

export function useConversations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: CONV_KEY(user?.id),
    enabled: !!user,
    queryFn: async (): Promise<InboxConversation[]> => {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          "id, owner_id, contact_id, status, automation_paused, last_message_at, last_message_preview, unread_count, created_at, updated_at, contact:contacts!inner(id, name, phone, email, company, notes, automation_paused, custom_fields), contact_tags(tag:tags(id, name, color))",
        )
        .eq("owner_id", user!.id)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        contact: { ...row.contact, custom_fields: row.contact?.custom_fields ?? {} },
        tags: (row.contact_tags ?? []).map((r: any) => r.tag).filter(Boolean),
      }));
    },
  });
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: MSGS_KEY(conversationId),
    enabled: !!conversationId,
    queryFn: async (): Promise<InboxMessage[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, conversation_id, direction, sent_by, body, media_url, created_at")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as InboxMessage[];
    },
  });
}

export function useConversationLogs(conversationId: string | null) {
  return useQuery({
    queryKey: LOGS_KEY(conversationId),
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_logs")
        .select("id, event, payload, created_at, node_id, flow_id")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
}

type SendArgs = {
  conversationId: string;
  body: string;
  direction?: MessageDirection;
  sentBy?: MessageSender;
};

export function useSendMockMessage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, body, direction = "out", sentBy = "human" }: SendArgs) => {
      const trimmed = body.trim();
      if (!trimmed) throw new Error("Mensagem vazia");
      const { error: msgErr } = await supabase.from("messages").insert({
        owner_id: user!.id,
        conversation_id: conversationId,
        direction,
        sent_by: sentBy,
        body: trimmed,
      } as any);
      if (msgErr) throw msgErr;
      const { error: convErr } = await supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: trimmed.slice(0, 140),
        })
        .eq("id", conversationId);
      if (convErr) throw convErr;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: MSGS_KEY(vars.conversationId) });
      qc.invalidateQueries({ queryKey: CONV_KEY(user?.id) });
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao enviar"),
  });
}

export function useCreateMockIncomingMessage() {
  const send = useSendMockMessage();
  return useMutation({
    mutationFn: async (vars: { conversationId: string; body: string }) =>
      send.mutateAsync({ ...vars, direction: "in", sentBy: "contact" }),
  });
}

export function useUpdateConversationStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ConversationStatus }) => {
      const { error } = await supabase.from("conversations").update({ status } as any).eq("id", id);
      if (error) throw error;
      await supabase.from("automation_logs").insert({
        owner_id: user!.id,
        conversation_id: id,
        event: "conversation_status_changed",
        payload: { status, mock: true },
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: CONV_KEY(user?.id) });
      qc.invalidateQueries({ queryKey: LOGS_KEY(vars.id) });
      toast.success("Status atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSetAutomationPaused() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, paused }: { id: string; paused: boolean }) => {
      const { error } = await supabase.from("conversations").update({ automation_paused: paused }).eq("id", id);
      if (error) throw error;
      await supabase.from("automation_logs").insert({
        owner_id: user!.id,
        conversation_id: id,
        event: paused ? "automation_paused" : "automation_resumed",
        payload: { mock: true },
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: CONV_KEY(user?.id) });
      qc.invalidateQueries({ queryKey: LOGS_KEY(vars.id) });
      toast.success(vars.paused ? "Automação pausada" : "Automação retomada");
    },
  });
}

export function useApplyContactTag() {
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
      qc.invalidateQueries({ queryKey: CONV_KEY(user?.id) });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useUpdateContactInline() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<{ name: string; email: string | null; company: string | null; notes: string | null; phone: string | null; automation_paused: boolean; custom_fields: Record<string, unknown> }> }) => {
      const { error } = await supabase.from("contacts").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONV_KEY(user?.id) });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useCreateMockConversation() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const suffix = Math.floor(1000 + Math.random() * 9000);
      const { data: contact, error: cErr } = await supabase
        .from("contacts")
        .insert({
          owner_id: user!.id,
          name: `Contato Teste ${suffix}`,
          phone: `55119${suffix}${suffix}`,
        } as any)
        .select()
        .single();
      if (cErr) throw cErr;
      const now = new Date().toISOString();
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({
          owner_id: user!.id,
          contact_id: contact.id,
          status: "open",
          last_message_at: now,
          last_message_preview: "Conversa de teste criada",
          unread_count: 1,
        } as any)
        .select()
        .single();
      if (convErr) throw convErr;
      await supabase.from("messages").insert({
        owner_id: user!.id,
        conversation_id: conv.id,
        direction: "system",
        sent_by: "system",
        body: "Conversa mockada criada para testes.",
      } as any);
      return conv.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONV_KEY(user?.id) });
      toast.success("Conversa mockada criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
