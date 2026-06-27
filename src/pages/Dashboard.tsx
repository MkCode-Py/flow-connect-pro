import { PageContainer, PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Users, Workflow, Zap, Smartphone, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useConnectionSummary } from "@/features/connections/hooks/useConnectionSummary";
import { InstanceStatusBadge } from "@/features/connections/components/InstanceStatusBadge";

export default function Dashboard() {
  const { user } = useAuth();

  const counts = useQuery({
    queryKey: ["dashboard-counts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [flows, kws, contacts, convos] = await Promise.all([
        supabase.from("flows").select("*", { count: "exact", head: true }).eq("owner_id", user!.id),
        supabase.from("keywords").select("*", { count: "exact", head: true }).eq("owner_id", user!.id),
        supabase.from("contacts").select("*", { count: "exact", head: true }).eq("owner_id", user!.id),
        supabase.from("conversations").select("*", { count: "exact", head: true }).eq("owner_id", user!.id),
      ]);
      return {
        flows: flows.count ?? 0, keywords: kws.count ?? 0,
        contacts: contacts.count ?? 0, conversations: convos.count ?? 0,
      };
    },
  });

  const stats = [
    { label: "Fluxos", value: counts.data?.flows ?? 0, icon: Workflow, to: "/flows" },
    { label: "Palavras-chave", value: counts.data?.keywords ?? 0, icon: Zap, to: "/automation/keywords" },
    { label: "Conversas", value: counts.data?.conversations ?? 0, icon: MessageSquare, to: "/inbox" },
    { label: "Contatos", value: counts.data?.contacts ?? 0, icon: Users, to: "/contacts" },
  ];

  const conn = useConnectionSummary();

  return (
    <PageContainer>
      <PageHeader title="Painel" description="Visão geral da sua operação no MK Flow." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to}>
            <Card className="p-5 bg-card border-border hover:border-border-strong transition-colors group">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</span>
                <s.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="mt-3 font-display text-3xl font-semibold">{s.value}</div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6 p-5 bg-card border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-11 w-11 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Conexão WhatsApp</div>
            {conn.total === 0 ? (
              <div className="font-medium">Nenhuma instância criada ainda</div>
            ) : (
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <InstanceStatusBadge status={conn.primaryStatus === "none" ? "disconnected" : conn.primaryStatus} />
                {conn.primaryName && <span className="text-sm text-muted-foreground truncate">{conn.primaryName}</span>}
                {conn.total > 1 && <span className="text-xs text-muted-foreground">+{conn.total - 1} outras</span>}
              </div>
            )}
          </div>
        </div>
        <Button asChild variant={conn.connected ? "outline" : "default"}>
          <Link to="/connections">
            {conn.connected ? "Gerenciar conexões" : "Conectar WhatsApp"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </Card>

      <Card className="mt-4 p-6 bg-gradient-surface border-border">
        <h2 className="font-display text-lg font-semibold mb-1">Bem-vindo ao MK Flow WhatsApp</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Crie fluxos visuais arrastando blocos, defina respostas por palavra-chave e gerencie todo o atendimento em um único lugar. A conexão real com o WhatsApp será habilitada via QR Code quando o backend Baileys estiver plugado.
        </p>
      </Card>
    </PageContainer>
  );
}
