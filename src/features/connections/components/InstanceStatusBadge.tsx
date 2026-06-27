import { Badge } from "@/components/ui/badge";
import { WA_STATUS_LABEL, type WAStatus } from "@/integrations/whatsapp/adapter";
import { CheckCircle2, Loader2, QrCode, Unplug, AlertTriangle, RefreshCcw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE: Record<WAStatus, string> = {
  connected: "bg-primary/15 text-primary border-primary/30",
  qr_pending: "bg-warning/15 text-warning border-warning/30",
  connecting: "bg-accent/15 text-accent border-accent/30",
  reconnecting: "bg-accent/15 text-accent border-accent/30",
  disconnected: "bg-muted text-muted-foreground border-border",
  error: "bg-destructive/15 text-destructive border-destructive/30",
  session_expired: "bg-destructive/10 text-destructive border-destructive/30",
};

const ICON: Record<WAStatus, React.ComponentType<{ className?: string }>> = {
  connected: CheckCircle2,
  qr_pending: QrCode,
  connecting: Loader2,
  reconnecting: RefreshCcw,
  disconnected: Unplug,
  error: AlertTriangle,
  session_expired: Clock,
};

export function InstanceStatusBadge({ status, className }: { status: WAStatus; className?: string }) {
  const Icon = ICON[status];
  const spinning = status === "connecting" || status === "reconnecting";
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", TONE[status], className)}>
      <Icon className={cn("h-3 w-3", spinning && "animate-spin")} />
      {WA_STATUS_LABEL[status]}
    </Badge>
  );
}
