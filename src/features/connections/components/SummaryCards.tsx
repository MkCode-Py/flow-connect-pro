import { Card } from "@/components/ui/card";
import { CheckCircle2, QrCode, Unplug, AlertTriangle } from "lucide-react";
import type { WAInstance } from "../types";

export function SummaryCards({ instances }: { instances: WAInstance[] }) {
  const connected = instances.filter((i) => i.status === "connected").length;
  const waiting = instances.filter((i) => i.status === "qr_pending" || i.status === "connecting" || i.status === "reconnecting").length;
  const disconnected = instances.filter((i) => i.status === "disconnected" || i.status === "session_expired").length;
  const errors = instances.filter((i) => i.status === "error").length;

  const items = [
    { label: "Conectadas", value: connected, icon: CheckCircle2, tone: "text-primary bg-primary/15" },
    { label: "Aguardando QR", value: waiting, icon: QrCode, tone: "text-warning bg-warning/15" },
    { label: "Desconectadas", value: disconnected, icon: Unplug, tone: "text-muted-foreground bg-muted" },
    { label: "Com erro", value: errors, icon: AlertTriangle, tone: "text-destructive bg-destructive/15" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {items.map((it) => (
        <Card key={it.label} className="p-4 bg-card border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{it.label}</span>
            <div className={`h-7 w-7 rounded-md flex items-center justify-center ${it.tone}`}>
              <it.icon className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 font-display text-2xl font-semibold">{it.value}</div>
        </Card>
      ))}
    </div>
  );
}
