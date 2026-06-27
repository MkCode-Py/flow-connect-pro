import { Badge } from "@/components/ui/badge";
import { Bot, BotOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function AutomationStatusBadge({ paused, className }: { paused: boolean; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-[10px]",
        paused
          ? "bg-warning/10 text-warning border-warning/30"
          : "bg-primary/10 text-primary border-primary/30",
        className,
      )}
    >
      {paused ? <BotOff className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
      {paused ? "Automação pausada" : "Automação ativa"}
    </Badge>
  );
}
