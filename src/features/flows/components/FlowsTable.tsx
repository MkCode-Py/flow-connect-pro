import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpDown, Copy, Folder, MoreVertical, Pencil, Power, PowerOff, Trash2, Workflow } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FLOW_KIND_LABEL } from "../types";
import type { FlowRow } from "../hooks";

type FoldersById = Map<string, string>;

export type SortKey = "name" | "updated";
export type SortDir = "asc" | "desc";

export type FlowTableProps = {
  flows: FlowRow[];
  foldersById: FoldersById;
  isLoading: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (all: boolean) => void;
  sort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
  onOpen: (flow: FlowRow) => void;
  onRename: (flow: FlowRow) => void;
  onDuplicate: (flow: FlowRow) => void;
  onMove: (flow: FlowRow) => void;
  onToggleActive: (flow: FlowRow) => void;
  onDelete: (flow: FlowRow) => void;
  onCreate: () => void;
};

export function FlowsTable(props: FlowTableProps) {
  const { flows, isLoading } = props;

  if (isLoading) {
    return (
      <Card className="overflow-hidden border-border/70">
        <div className="p-3 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </Card>
    );
  }

  if (flows.length === 0) {
    return <EmptyState onCreate={props.onCreate} />;
  }

  return (
    <>
      {/* Desktop */}
      <Card className="hidden md:block overflow-hidden border-border/70">
        <Table>
          <TableHeader>
            <TableRow className="border-border/70 hover:bg-transparent bg-muted/30">
              <TableHead className="w-10">
                <Checkbox
                  checked={props.selected.size > 0 && props.selected.size === flows.length}
                  onCheckedChange={(c) => props.onToggleSelectAll(!!c)}
                />
              </TableHead>
              <SortableHead label="Nome" sortKey="name" {...props.sort} onSort={props.onSort} />
              <TableHead>Pasta</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Conexões</TableHead>
              <TableHead className="text-center">Execuções</TableHead>
              <TableHead className="text-center">CTR</TableHead>
              <SortableHead label="Última alteração" sortKey="updated" {...props.sort} onSort={props.onSort} />
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {flows.map((f) => (
              <FlowTableRow key={f.id} flow={f} {...props} />
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {flows.map((f) => (
          <FlowMobileCard key={f.id} flow={f} {...props} />
        ))}
      </div>
    </>
  );
}

function SortableHead({ label, sortKey, key: _k, dir, onSort, ...rest }: { label: string; sortKey: SortKey; key?: SortKey; dir: SortDir; onSort: (k: SortKey) => void } & { key: SortKey }) {
  const active = rest.key === sortKey;
  return (
    <TableHead>
      <button type="button" onClick={() => onSort(sortKey)} className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${active ? "text-foreground" : ""}`}>
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? "opacity-100" : "opacity-40"}`} />
        {active && <span className="text-[10px] text-muted-foreground">{dir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </TableHead>
  );
}

function FlowTableRow({ flow, foldersById, selected, onToggleSelect, onOpen, onRename, onDuplicate, onMove, onToggleActive, onDelete }: { flow: FlowRow } & FlowTableProps) {
  const isDefault = flow.kind !== "custom";
  return (
    <TableRow className="border-border/60 hover:bg-muted/30">
      <TableCell><Checkbox checked={selected.has(flow.id)} onCheckedChange={() => onToggleSelect(flow.id)} /></TableCell>
      <TableCell>
        <Link to={`/flows/${flow.id}`} className="font-medium hover:text-primary transition-colors">{flow.name}</Link>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {flow.folder_id ? (
          <span className="inline-flex items-center gap-1.5"><Folder className="h-3.5 w-3.5" />{foldersById.get(flow.folder_id) ?? "—"}</span>
        ) : <span className="text-muted-foreground/60">—</span>}
      </TableCell>
      <TableCell><KindBadge kind={flow.kind} /></TableCell>
      <TableCell className="text-center">
        <Switch checked={flow.is_active} onCheckedChange={() => onToggleActive(flow)} aria-label="Ativar fluxo" />
      </TableCell>
      <TableCell className="text-center text-sm text-muted-foreground tabular-nums">{flow.connections || "—"}</TableCell>
      <TableCell className="text-center text-sm text-muted-foreground tabular-nums">{flow.executions || "—"}</TableCell>
      <TableCell className="text-center text-sm text-muted-foreground tabular-nums">{flow.ctr ? `${Number(flow.ctr).toFixed(1)}%` : "—"}</TableCell>
      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
        {format(new Date(flow.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
      </TableCell>
      <TableCell>
        <RowActionsMenu flow={flow} isDefault={isDefault} onOpen={onOpen} onRename={onRename} onDuplicate={onDuplicate} onMove={onMove} onToggleActive={onToggleActive} onDelete={onDelete} />
      </TableCell>
    </TableRow>
  );
}

function FlowMobileCard({ flow, foldersById, onOpen, onRename, onDuplicate, onMove, onToggleActive, onDelete }: { flow: FlowRow } & FlowTableProps) {
  const isDefault = flow.kind !== "custom";
  return (
    <Card className="p-3 border-border/70 bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link to={`/flows/${flow.id}`} className="font-medium hover:text-primary transition-colors block truncate">{flow.name}</Link>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <KindBadge kind={flow.kind} />
            {flow.folder_id && <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Folder className="h-3 w-3" />{foldersById.get(flow.folder_id)}</span>}
          </div>
        </div>
        <RowActionsMenu flow={flow} isDefault={isDefault} onOpen={onOpen} onRename={onRename} onDuplicate={onDuplicate} onMove={onMove} onToggleActive={onToggleActive} onDelete={onDelete} />
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{flow.executions || 0} exec</span>
          <span>{flow.connections || 0} conex</span>
          <span>{flow.ctr ? `${Number(flow.ctr).toFixed(1)}%` : "—"} CTR</span>
        </div>
        <Switch checked={flow.is_active} onCheckedChange={() => onToggleActive(flow)} />
      </div>
    </Card>
  );
}

function RowActionsMenu({ flow, isDefault, onOpen, onRename, onDuplicate, onMove, onToggleActive, onDelete }: {
  flow: FlowRow; isDefault: boolean;
  onOpen: (f: FlowRow) => void;
  onRename: (f: FlowRow) => void;
  onDuplicate: (f: FlowRow) => void;
  onMove: (f: FlowRow) => void;
  onToggleActive: (f: FlowRow) => void;
  onDelete: (f: FlowRow) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => onOpen(flow)}><Pencil className="h-4 w-4 mr-2" /> Abrir editor</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRename(flow)}><Pencil className="h-4 w-4 mr-2" /> Renomear</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDuplicate(flow)}><Copy className="h-4 w-4 mr-2" /> Duplicar</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMove(flow)}><Folder className="h-4 w-4 mr-2" /> Mover para pasta</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleActive(flow)}>
          {flow.is_active ? <><PowerOff className="h-4 w-4 mr-2" /> Desativar</> : <><Power className="h-4 w-4 mr-2" /> Ativar</>}
        </DropdownMenuItem>
        {!isDefault && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(flow)}>
              <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function KindBadge({ kind }: { kind: FlowRow["kind"] }) {
  const map: Record<FlowRow["kind"], string> = {
    custom: "bg-muted text-muted-foreground border-border",
    welcome: "bg-primary/15 text-primary border-primary/30",
    default_reply: "bg-accent/15 text-accent border-accent/30",
    media_default: "bg-warning/15 text-warning border-warning/30",
    post_service: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return <Badge variant="outline" className={`${map[kind]} font-normal`}>{FLOW_KIND_LABEL[kind]}</Badge>;
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="border-dashed border-border-strong/60 bg-card/50">
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Workflow className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-display text-base font-semibold">Nenhum fluxo encontrado</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Crie seu primeiro fluxo para começar a automatizar suas conversas no WhatsApp.
        </p>
        <Button onClick={onCreate} className="mt-5">Criar novo fluxo</Button>
      </div>
    </Card>
  );
}
