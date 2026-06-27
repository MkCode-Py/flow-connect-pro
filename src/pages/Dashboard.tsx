import { PageContainer, PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  MessageSquare, Workflow, Zap, Smartphone, ArrowRight, PauseCircle,
  UserCheck, AlertTriangle, Plus, Play, Inbox as InboxIcon, BookOpen, QrCode,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useConnectionSummary } from "@/features/connections/hooks/useConnectionSummary";
import { InstanceStatusBadge } from "@/features/connections/components/InstanceStatusBadge";

function useDashboardStats(userId?: string) {
  return useQuery({
    queryKey: ["dashboard-stats", userId],
    enabled: !!userId,
    queryFn: async () => {
      const owner = userId!;
      const [flows, kws, convOpen, convHuman, convPaused, instancesConn] = await Promise.all([
        supabase.from("flows").select("*", { count: "exact", head: true }).eq("owner_id", owner).eq("is_active", true),
        supabase.from("keywords").select("*", { count: "exact", head: true }).eq("owner_id", owner).eq("is_active", true),
        supabase.from("conversations").select("*", { count: "exact", head: true }).eq("owner_id", owner).eq("status", "open"),
        supabase.from("conversations").select("*", { count: "exact", head: true }).eq("owner_id", owner).eq("status", "human_required"),
        supabase.from("conversations").select("*", { count: "exact", head: true }).eq("owner_id", owner).eq("automation_paused", true),
        supabase.from("whatsapp_instances").select("*", { count: "exact", head: true }).eq("owner_id", owner).eq("status", "connected"),
      ]);
      return {
        flowsActive: flows.count ?? 0,
        keywordsActive: kws.count ?? 0,
        conversationsOpen: convOpen.count ?? 0,
        humanRequired: convHuman.count ?? 0,
        automationPaused: convPaused.count ?? 0,
        instancesConnected: instancesConn.count ?? 0,
      };
    },
  });
}

export default function Dashboard() {
  const { user } = useAuth();
  const stats = useDashboardStats(user?.id);
  const conn = useConnectionSummary();
  const s = stats.data;

  const cards = [
    { label: "Instâncias conectadas", value: s?.instancesConnected ?? 0, icon: Smartphone, to: "/connections", accent: "text-primary" },
    { label: "Conversas abertas", value: s?.conversationsOpen ?? 0, icon: MessageSquare, to: "/inbox", accent: "text-foreground" },
    { label: "Aguardando humano", value: s?.humanRequired ?? 0, icon: UserCheck, to: "/inbox", accent: "text-amber-400" },
    { label: "Automação pausada", value: s?.automationPaused ?? 0, icon: PauseCircle, to: "/inbox", accent: "text-rose-400" },
    { label: "Fluxos ativos", value: s?.flowsActive ?? 0, icon: Workflow, to: "/flows", accent: "text-foreground" },
    { label: "Palavras-chave ativas", value: s?.keywordsActive ?? 0, icon: Zap, to: "/automation/keywords", accent: "text-foreground" },
  ];

  const shortcuts = [
    { label: "Criar fluxo", icon: Plus, to: "/flows" },
    { label: "Testar fluxo", icon: Play, to: "/flows" },
    { label: "Criar palavra-chave", icon: Zap, to: "/automation/keywords" },
    { label: "Abrir inbox", icon: InboxIcon, to: "/inbox" },
    { label: "Conectar WhatsApp", icon: QrCode, to: "/connections" },
    { label: "Ver Dev Notes", icon: BookOpen, to: "/dev-notes" },
  ];

  return (
    <PageContainer>
      <PageHeader title="Painel" description="Visão geral da operação do MK Flow." />

      <Card className="mb-6 p-4 bg-amber-500/10 border-amber-500/20 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-medium text-foreground">Ambiente MVP em modo mock</div>
          <p className="text-muted-foreground">
            Toda a interface, automação e simulador já funcionam com dados reais no banco. A conexão real com WhatsApp será implementada no backend Node.js (Baileys). Consulte <Link to="/dev-notes" className="text-primary hover:underline">Dev Notes</Link> para o passo a passo.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card className="p-4 bg-card border-border hover:border-border-strong transition-colors group h-full">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{c.label}</span>
                <c.icon className={`h-4 w-4 ${c.accent} opacity-80`} />
              </div>
              <div className="mt-3 font-display text-2xl font-semibold">{c.value}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-4 mt-6">
        <Card className="p-5 bg-card border-border">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Conexão WhatsApp</div>
              {conn.total === 0 ? (
                <div className="font-medium">Nenhuma instância criada ainda</div>
              ) : (
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <InstanceStatusBadge status={conn.primaryStatus === "none" ? "disconnected" : conn.primaryStatus} />
                  {conn.primaryName && <span className="text-sm text-muted-foreground truncate">{conn.primaryName}</span>}
                  {conn.total > 1 && <Badge variant="outline" className="text-xs">+{conn.total - 1}</Badge>}
                </div>
              )}
            </div>
            <Button asChild variant={conn.connected ? "outline" : "default"} size="sm">
              <Link to="/connections">
                {conn.connected ? "Gerenciar" : "Conectar"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="p-5 bg-card border-border">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Atalhos</div>
          <div className="grid grid-cols-2 gap-2">
            {shortcuts.map((sc) => (
              <Button key={sc.label} asChild variant="outline" size="sm" className="justify-start">
                <Link to={sc.to}>
                  <sc.icon className="h-4 w-4 mr-2" /> {sc.label}
                </Link>
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
