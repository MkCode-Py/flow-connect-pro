import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type ServiceHourDay = { enabled: boolean; start: string; end: string };
export type ServiceHours = Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", ServiceHourDay>;

export type CompanySettings = {
  owner_id: string;
  company_name: string | null;
  public_name: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  service_active: boolean;
  service_hours: ServiceHours;
  off_hours_message: string | null;
  automation_enabled: boolean;
  max_auto_messages_per_conversation: number;
  default_message_delay_ms: number;
  on_human_handoff: string;
  on_paused_behavior: string;
};

const DEFAULT_HOURS: ServiceHours = {
  mon: { enabled: true, start: "09:00", end: "18:00" },
  tue: { enabled: true, start: "09:00", end: "18:00" },
  wed: { enabled: true, start: "09:00", end: "18:00" },
  thu: { enabled: true, start: "09:00", end: "18:00" },
  fri: { enabled: true, start: "09:00", end: "18:00" },
  sat: { enabled: false, start: "09:00", end: "13:00" },
  sun: { enabled: false, start: "09:00", end: "13:00" },
};

export function useCompanySettings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["company_settings", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CompanySettings> => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as unknown as CompanySettings;
      // cria registro padrão
      const { data: created, error: insErr } = await supabase
        .from("company_settings")
        .insert({ owner_id: user!.id })
        .select("*")
        .single();
      if (insErr) throw insErr;
      return created as unknown as CompanySettings;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<CompanySettings>) => {
      const { error } = await supabase
        .from("company_settings")
        .update(patch as never)
        .eq("owner_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company_settings", user?.id] }),
  });

  return { ...query, update, DEFAULT_HOURS };
}
