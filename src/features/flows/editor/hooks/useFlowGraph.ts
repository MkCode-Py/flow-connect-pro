import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { sanitizeGraph } from "../utils/graphUtils";
import type { FlowGraph } from "../types";

export type FlowRecord = {
  id: string;
  owner_id: string;
  folder_id: string | null;
  name: string;
  kind: string;
  graph: FlowGraph;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function useFlowGraph(flowId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["flow", flowId],
    enabled: !!flowId && !!user,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<FlowRecord> => {
      const { data, error } = await supabase
        .from("flows")
        .select("*")
        .eq("id", flowId!)
        .single();
      if (error) throw error;
      return {
        ...(data as unknown as FlowRecord),
        graph: sanitizeGraph((data as { graph: unknown }).graph),
      };
    },
  });
}
