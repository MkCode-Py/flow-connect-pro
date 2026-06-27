import { cn } from "@/lib/utils";
import { Bot, User as UserIcon, Headphones, Info } from "lucide-react";
import { format } from "date-fns";
import type { InboxMessage } from "../types";

export function MessageBubble({ m }: { m: InboxMessage }) {
  if (m.direction === "system") {
    return (
      <div className="flex justify-center my-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-surface-2 border border-border rounded-full px-3 py-1">
          <Info className="h-3 w-3" />
          {m.body}
        </div>
      </div>
    );
  }
  const out = m.direction === "out";
  const Icon = m.sent_by === "bot" ? Bot : m.sent_by === "human" ? Headphones : UserIcon;
  const senderLabel = m.sent_by === "bot" ? "Bot" : m.sent_by === "human" ? "Atendente" : "Cliente";

  return (
    <div className={cn("flex gap-2", out ? "justify-end" : "justify-start")}>
      {!out && (
        <div className="h-7 w-7 rounded-full bg-surface-3 flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-3.5 py-2 shadow-card",
          out
            ? m.sent_by === "bot"
              ? "bg-accent/15 border border-accent/30 text-foreground rounded-br-sm"
              : "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-surface-2 text-foreground rounded-bl-sm",
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
        <div
          className={cn(
            "text-[10px] mt-1 flex items-center gap-1",
            out && m.sent_by !== "bot" ? "text-primary-foreground/70 justify-end" : "text-muted-foreground",
            out ? "justify-end" : "",
          )}
        >
          <Icon className="h-2.5 w-2.5" />
          <span>{senderLabel}</span>
          <span>·</span>
          <span>{format(new Date(m.created_at), "HH:mm")}</span>
        </div>
      </div>
    </div>
  );
}
