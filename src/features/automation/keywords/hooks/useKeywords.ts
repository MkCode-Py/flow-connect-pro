import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import type { KeywordFormValues, KeywordRule } from "../types";

const KEY = ["keywords"] as const;

export function useKeywords() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, user?.id],
    enabled: !!user,
    queryFn: async (): Promise<KeywordRule[]> => {
      const { data, error } = await supabase
        .from("keywords")
        .select("*")
        .eq("owner_id", user!.id)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as KeywordRule[];
    },
  });
}

export function useFlowsPicker() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["flows-picker", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flows")
        .select("id,name")
        .eq("owner_id", user!.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertKeyword() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: KeywordFormValues) => {
      const payload = {
        name: values.name.trim(),
        flow_id: values.flow_id,
        match_rule: values.match_rule,
        terms: values.terms.map((t) => t.trim()).filter(Boolean),
        priority: values.priority,
        is_active: values.is_active,
        notes: values.notes.trim() ? values.notes.trim() : null,
      };
      if (values.id) {
        const { error } = await supabase.from("keywords").update(payload).eq("id", values.id);
        if (error) throw error;
        return { mode: "update" as const };
      }
      const { error } = await supabase.from("keywords").insert({ ...payload, owner_id: user!.id });
      if (error) throw error;
      return { mode: "insert" as const };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEY });
      toast({ title: res.mode === "insert" ? "Palavra-chave criada" : "Palavra-chave atualizada" });
    },
    onError: (e: Error) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });
}

export function useToggleKeyword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("keywords").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteKeyword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("keywords").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast({ title: "Palavra-chave excluída" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useDuplicateKeyword() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: KeywordRule) => {
      const { error } = await supabase.from("keywords").insert({
        owner_id: user!.id,
        name: `Cópia de ${rule.name}`,
        flow_id: rule.flow_id,
        match_rule: rule.match_rule,
        terms: rule.terms,
        priority: rule.priority,
        is_active: false,
        notes: rule.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast({ title: "Palavra-chave duplicada", description: "Cópia criada como inativa." });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useSeedExampleKeywords() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (defaultFlowId: string | null) => {
      const seeds = [
        { name: "Ver tabela/preços", terms: ["preço", "preços", "tabela", "valor", "quanto custa"] },
        { name: "Pagamento Pix", terms: ["pix", "pagamento", "pagar", "comprovante"] },
        { name: "Pedido", terms: ["pedido", "fazer pedido", "comprar", "quero comprar"] },
        { name: "Falar com atendente", terms: ["atendente", "humano", "falar com alguém", "suporte"] },
      ];
      const { data: existing } = await supabase
        .from("keywords")
        .select("name")
        .eq("owner_id", user!.id);
      const existingNames = new Set((existing ?? []).map((k) => k.name));
      const toInsert = seeds
        .filter((s) => !existingNames.has(s.name))
        .map((s, i) => ({
          owner_id: user!.id,
          name: s.name,
          flow_id: defaultFlowId,
          match_rule: "contains_any" as const,
          terms: s.terms,
          is_active: true,
          priority: 10 + i,
        }));
      if (!toInsert.length) return { inserted: 0 };
      const { error } = await supabase.from("keywords").insert(toInsert);
      if (error) throw error;
      return { inserted: toInsert.length };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEY });
      toast({
        title: res.inserted > 0 ? `${res.inserted} exemplos criados` : "Nada a criar",
        description: res.inserted > 0 ? "Você pode editar termos e vincular fluxos diferentes." : "Os exemplos já existem.",
      });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}
