import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sparkles, Heart, Image as ImageIcon, MessageSquare, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { FlowKind } from "../types";
import type { FlowRow } from "../hooks";

const DEFINITIONS: { kind: FlowKind; title: string; subtitle: string; icon: typeof Sparkles; tone: string }[] = [
  { kind: "welcome",        title: "Fluxo de boas-vindas",       subtitle: "Disparado no primeiro contato.",        icon: Sparkles,     tone: "primary" },
  { kind: "default_reply",  title: "Fluxo de resposta padrão",   subtitle: "Quando nenhuma palavra-chave bate.",    icon: MessageSquare, tone: "accent"  },
  { kind: "media_default",  title: "Fluxo padrão para mídia",    subtitle: "Quando o contato envia áudio/imagem.",  icon: ImageIcon,    tone: "warning" },
  { kind: "post_service",   title: "Fluxo pós-atendimento",      subtitle: "Após encerrar uma conversa.",           icon: Heart,        tone: "destructive" },
];

function isConfigured(graph: unknown): boolean {
  const g = graph as { nodes?: unknown[] } | null;
  return !!g && Array.isArray(g.nodes) && g.nodes.length > 1;
}

export function DefaultFlowsSection({ flows, isLoading }: { flows: FlowRow[]; isLoading: boolean }) {
  const navigate = useNavigate();

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-semibold">Fluxos padrões básicos</h2>
        <p className="text-sm text-muted-foreground">
          Quatro fluxos especiais disparados automaticamente em momentos-chave do atendimento.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {DEFINITIONS.map((def) => {
          const flow = flows.find((f) => f.kind === def.kind);
          const configured = isConfigured(flow?.graph);
          const Icon = def.icon;
          if (isLoading || !flow) {
            return <Skeleton key={def.kind} className="h-[150px] rounded-xl" />;
          }
          return (
            <Card
              key={def.kind}
              className="group p-4 bg-card border-border/70 hover:border-primary/40 hover:shadow-[var(--shadow-card)] transition-all cursor-pointer flex flex-col gap-3"
              onClick={() => navigate(`/flows/${flow.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-${def.tone}/15 text-${def.tone}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                {configured ? (
                  <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">Configurado</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground border-dashed">Não configurado</Badge>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm leading-tight">{def.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{def.subtitle}</div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Editado {formatDistanceToNow(new Date(flow.updated_at), { addSuffix: true, locale: ptBR })}
                </span>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-primary group-hover:translate-x-0.5 transition-transform" onClick={(e) => { e.stopPropagation(); navigate(`/flows/${flow.id}`); }}>
                  Editar <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
