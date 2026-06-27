import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessagesSquare, Search } from "lucide-react";
import type { VariableContact } from "@/lib/contactVariables";
import { resolveContactVariables } from "@/lib/contactVariables";

export type QuickReplyItem = {
  id: string;
  shortcut: string;
  title: string | null;
  category: string | null;
  content: string;
  is_active: boolean;
};

export function QuickReplyPicker({
  items,
  contact,
  onPick,
}: {
  items: QuickReplyItem[];
  contact: VariableContact;
  onPick: (resolved: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const active = items.filter((i) => i.is_active);
    if (!q) return active;
    return active.filter(
      (i) =>
        i.shortcut.toLowerCase().includes(q) ||
        (i.title ?? "").toLowerCase().includes(q) ||
        i.content.toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9" aria-label="Respostas rápidas">
          <MessagesSquare className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-[340px] p-0">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Buscar resposta rápida..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
        <ScrollArea className="max-h-72">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">Nenhuma resposta rápida encontrada.</div>
          )}
          <ul className="divide-y divide-border">
            {filtered.map((q) => (
              <li key={q.id}>
                <button
                  type="button"
                  className="w-full text-left p-2.5 hover:bg-surface-2"
                  onClick={() => {
                    onPick(resolveContactVariables(q.content, contact));
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="font-mono text-[10px] py-0">{q.shortcut}</Badge>
                    {q.category && <Badge variant="outline" className="text-[10px] py-0">{q.category}</Badge>}
                    {q.title && <span className="text-xs font-medium truncate">{q.title}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{q.content}</p>
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
