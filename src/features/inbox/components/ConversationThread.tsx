import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import type { InboxMessage } from "../types";

export function ConversationThread({ messages, loading }: { messages: InboxMessage[]; loading?: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-3">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-10 w-1/2 ml-auto" />
        <Skeleton className="h-16 w-2/3" />
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
        <MessageSquare className="h-10 w-10 opacity-40" />
        Nenhuma mensagem nessa conversa ainda.
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 dot-grid">
      <div className="max-w-2xl mx-auto p-6 space-y-3">
        {messages.map((m) => (
          <MessageBubble key={m.id} m={m} />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
