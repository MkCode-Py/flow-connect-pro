import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ConversationStatus } from "../types";

export type InboxFilter = "all" | ConversationStatus | "paused";

export function ConversationFilters({
  value,
  onChange,
  tagId,
  onTagChange,
  tags,
}: {
  value: InboxFilter;
  onChange: (v: InboxFilter) => void;
  tagId: string;
  onTagChange: (v: string) => void;
  tags: Array<{ id: string; name: string; color: string }>;
}) {
  return (
    <div className="space-y-2">
      <Tabs value={value} onValueChange={(v) => onChange(v as InboxFilter)}>
        <TabsList className="w-full h-8 grid grid-cols-3">
          <TabsTrigger value="all" className="text-xs">Todas</TabsTrigger>
          <TabsTrigger value="open" className="text-xs">Abertas</TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">Pendentes</TabsTrigger>
        </TabsList>
        <TabsList className="w-full h-8 grid grid-cols-3 mt-1">
          <TabsTrigger value="resolved" className="text-xs">Resolvidas</TabsTrigger>
          <TabsTrigger value="human_required" className="text-xs">Humano</TabsTrigger>
          <TabsTrigger value="paused" className="text-xs">Pausadas</TabsTrigger>
        </TabsList>
      </Tabs>
      <Select value={tagId} onValueChange={onTagChange}>
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Filtrar por etiqueta" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todas as etiquetas</SelectItem>
          {tags.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                {t.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
