import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FLOW_KIND_LABEL, type FlowKind } from "../types";

export type FlowFiltersState = {
  query: string;
  folderId: string;        // "all" | "none" | folderId
  kind: string;            // "all" | FlowKind
  status: string;          // "all" | "active" | "inactive"
};

const KIND_OPTIONS: FlowKind[] = ["custom", "welcome", "default_reply", "media_default", "post_service"];

export function FlowsFilters({
  value, onChange, folders,
}: {
  value: FlowFiltersState;
  onChange: (next: FlowFiltersState) => void;
  folders: { id: string; name: string }[];
}) {
  const isDefault =
    value.query === "" && value.folderId === "all" && value.kind === "all" && value.status === "all";

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value.query}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
          placeholder="Buscar fluxo por nome..."
          className="pl-8"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 md:flex md:items-center md:gap-2">
        <Select value={value.folderId} onValueChange={(v) => onChange({ ...value, folderId: v })}>
          <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Pasta" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as pastas</SelectItem>
            <SelectItem value="none">Sem pasta</SelectItem>
            {folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={value.kind} onValueChange={(v) => onChange({ ...value, kind: v })}>
          <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {KIND_OPTIONS.map((k) => <SelectItem key={k} value={k}>{FLOW_KIND_LABEL[k]}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={value.status} onValueChange={(v) => onChange({ ...value, status: v })}>
          <SelectTrigger className="w-full md:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!isDefault && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ query: "", folderId: "all", kind: "all", status: "all" })}
          className="text-muted-foreground"
        >
          <X className="h-3.5 w-3.5 mr-1" /> Limpar
        </Button>
      )}
    </div>
  );
}
