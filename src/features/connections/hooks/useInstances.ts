import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { whatsapp } from "@/integrations/whatsapp";
import type { WAStatus } from "@/integrations/whatsapp/adapter";
import type { WAInstance, WAInstanceLog } from "../types";

const QK = (uid?: string) => ["wa-instances", uid] as const;
const QK_LOGS = (instanceId?: string | null) => ["wa-instance-logs", instanceId] as const;

export function useInstances() {
  const { user } = useAuth();
  return useQuery({
    queryKey: QK(user?.id),
    enabled: !!user,
    queryFn: async (): Promise<WAInstance[]> => {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WAInstance[];
    },
  });
}

export function useInstanceLogs(instanceId: string | null) {
  return useQuery({
    queryKey: QK_LOGS(instanceId),
    enabled: !!instanceId,
    queryFn: async (): Promise<WAInstanceLog[]> => {
      const { data, error } = await supabase
        .from("wa_instance_logs")
        .select("*")
        .eq("instance_id", instanceId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as WAInstanceLog[];
    },
  });
}

async function logEvent(
  ownerId: string,
  instanceId: string,
  event: string,
  message?: string,
  metadata: Record<string, unknown> = {},
) {
  await supabase.from("wa_instance_logs").insert({
    owner_id: ownerId,
    instance_id: instanceId,
    event,
    message: message ?? null,
    metadata: metadata as never,
  });
}

export function useCreateInstance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      description,
      connectNow,
    }: {
      name: string;
      description?: string;
      connectNow: boolean;
    }) => {
      const status: WAStatus = connectNow ? "qr_pending" : "disconnected";
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .insert({
          owner_id: user!.id,
          name,
          description: description?.trim() || null,
          status: status as never,
        })
        .select()
        .single();
      if (error) throw error;
      await logEvent(user!.id, data.id, "instance.created", `Instância "${name}" criada`);
      return data as unknown as WAInstance;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK(user?.id) }),
  });
}

export function useUpdateInstance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<WAInstance> }) => {
      const { error } = await supabase
        .from("whatsapp_instances")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QK(user?.id) });
      qc.invalidateQueries({ queryKey: QK_LOGS(vars.id) });
    },
  });
}

export function useDeleteInstance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (instance: WAInstance) => {
      await logEvent(user!.id, instance.id, "instance.deleted", `Instância "${instance.name}" removida`);
      const { error } = await supabase.from("whatsapp_instances").delete().eq("id", instance.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK(user?.id) }),
  });
}

/** Ação: conectar (gera QR mock e marca instância como qr_pending). */
export function useConnectInstance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (instanceId: string) => {
      await whatsapp.connectInstance(instanceId);
      await supabase
        .from("whatsapp_instances")
        .update({ status: "qr_pending" as never, error_message: null })
        .eq("id", instanceId);
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QK(user?.id) });
      qc.invalidateQueries({ queryKey: QK_LOGS(id) });
    },
  });
}

/** Ação: gerar/regerar QR mockado e persistir last_qr. */
export function useRegenerateQr() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (instanceId: string) => {
      const { qr, expiresAt } = await whatsapp.generateQrCode(instanceId);
      await supabase
        .from("whatsapp_instances")
        .update({
          status: "qr_pending" as never,
          last_qr: qr,
          last_qr_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", instanceId);
      await logEvent(user!.id, instanceId, "qr.generated", "Novo QR mockado gerado");
      return { qr, expiresAt };
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QK(user?.id) });
      qc.invalidateQueries({ queryKey: QK_LOGS(id) });
    },
  });
}

/** Ação: simular conexão bem-sucedida (mock). */
export function useSimulateConnection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (instanceId: string) => {
      const phone = whatsapp.simulateSuccessfulConnection(instanceId);
      const now = new Date().toISOString();
      await supabase
        .from("whatsapp_instances")
        .update({
          status: "connected" as never,
          session_saved: true,
          connected_phone: phone,
          last_seen_at: now,
          last_activity_at: now,
          error_message: null,
        })
        .eq("id", instanceId);
      await logEvent(user!.id, instanceId, "connection.mock_connected", `Conectado em modo mock como ${phone}`, { phone });
      return phone;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QK(user?.id) });
      qc.invalidateQueries({ queryKey: QK_LOGS(id) });
    },
  });
}

/** Ação: desconectar (mantém session_saved). */
export function useDisconnectInstance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (instanceId: string) => {
      await whatsapp.disconnectInstance(instanceId);
      await supabase
        .from("whatsapp_instances")
        .update({
          status: "disconnected" as never,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", instanceId);
      await logEvent(user!.id, instanceId, "connection.disconnected", "Instância desconectada");
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QK(user?.id) });
      qc.invalidateQueries({ queryKey: QK_LOGS(id) });
    },
  });
}

/** Ação: reconectar (mock — tenta reabrir e cai em qr_pending). */
export function useReconnectInstance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (instanceId: string) => {
      await supabase
        .from("whatsapp_instances")
        .update({ status: "reconnecting" as never })
        .eq("id", instanceId);
      await logEvent(user!.id, instanceId, "connection.reconnecting", "Tentando reconectar (mock)");
      await whatsapp.reconnectInstance(instanceId);
      await supabase
        .from("whatsapp_instances")
        .update({ status: "qr_pending" as never })
        .eq("id", instanceId);
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QK(user?.id) });
      qc.invalidateQueries({ queryKey: QK_LOGS(id) });
    },
  });
}

/** Ação: apagar a sessão mockada. */
export function useDeleteSession() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (instanceId: string) => {
      await whatsapp.deleteSession(instanceId);
      await supabase
        .from("whatsapp_instances")
        .update({
          status: "disconnected" as never,
          session_saved: false,
          last_qr: null,
          last_qr_at: null,
          connected_phone: null,
        })
        .eq("id", instanceId);
      await logEvent(user!.id, instanceId, "session.deleted", "Sessão mockada apagada");
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QK(user?.id) });
      qc.invalidateQueries({ queryKey: QK_LOGS(id) });
    },
  });
}

/** Helper exposto: registrar QR escolhido pela UI (para persistir o QR atualmente exibido). */
export function useUpdateLastQr() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, qr }: { id: string; qr: string }) => {
      await supabase
        .from("whatsapp_instances")
        .update({ last_qr: qr, last_qr_at: new Date().toISOString() })
        .eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK(user?.id) }),
  });
}
