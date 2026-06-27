import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import { QuickReplyPicker, type QuickReplyItem } from "./QuickReplyPicker";
import { resolveContactVariables, type VariableContact } from "@/lib/contactVariables";
import { cn } from "@/lib/utils";

export function MessageComposer({
  contact,
  quickReplies,
  onSend,
  disabled,
}: {
  contact: VariableContact;
  quickReplies: QuickReplyItem[];
  onSend: (body: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Sugestões /atalho na frente do texto
  const slashSuggestions = useMemo(() => {
    const m = value.match(/^\/(\w*)$/);
    if (!m) return [];
    const term = m[1].toLowerCase();
    return quickReplies
      .filter((q) => q.is_active && q.shortcut.toLowerCase().startsWith(`/${term}`))
      .slice(0, 6);
  }, [value, quickReplies]);

  const applyQuickReply = (qr: QuickReplyItem) => {
    setValue(resolveContactVariables(qr.content, contact));
    requestAnimationFrame(() => ref.current?.focus());
  };

  const handleSend = async () => {
    const v = value.trim();
    if (!v || disabled) return;
    await onSend(v);
    setValue("");
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-surface-1">
      {slashSuggestions.length > 0 && (
        <div className="px-3 py-2 border-b border-border flex flex-wrap gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1 self-center">
            Sugestões
          </span>
          {slashSuggestions.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => applyQuickReply(q)}
              className="text-xs px-2 py-1 rounded-md bg-surface-2 hover:bg-surface-3 border border-border flex items-center gap-1.5"
            >
              <Badge variant="secondary" className="font-mono text-[10px] py-0">{q.shortcut}</Badge>
              <span className="truncate max-w-[160px] text-muted-foreground">{q.title ?? q.content}</span>
            </button>
          ))}
        </div>
      )}
      <div className="p-2.5 flex items-end gap-2">
        <QuickReplyPicker items={quickReplies} contact={contact} onPick={(v) => setValue(v)} />
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          placeholder="Digite uma mensagem ou /atalho... (Enter envia, Shift+Enter quebra linha)"
          rows={1}
          disabled={disabled}
          className={cn("min-h-[40px] max-h-32 resize-none text-sm")}
        />
        <Button
          type="button"
          onClick={() => void handleSend()}
          disabled={disabled || !value.trim()}
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label="Enviar"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
