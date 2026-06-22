import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Folder, FolderPlus, Plus, Search, MoreVertical, Pencil, Copy, Trash2, ChevronDown, ChevronRight, Workflow,
} from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  useFlowFolders, useFlows, useCreateFolder, useRenameFolder, useDeleteFolder,
  useCreateFlow, useUpdateFlow, useDeleteFlow, useDuplicateFlow,
} from "@/features/flows/hooks";
import { FLOW_KIND_LABEL } from "@/features/flows/types";

const DEFAULT_KINDS = ["welcome", "default_reply", "media_default", "post_service"] as const;

export default function FlowsList() {
  const nav = useNavigate();
  const folders = useFlowFolders();
  const flows = useFlows();
  const createFolder = useCreateFolder();
  const renameFolder = useRenameFolder();
  const deleteFolder = useDeleteFolder();
  const createFlow = useCreateFlow();
  const updateFlow = useUpdateFlow();
  const deleteFlow = useDeleteFlow();
  const duplicateFlow = useDuplicateFlow();

  const [query, setQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | "all">("all");
  const [folderDialog, setFolderDialog] = useState<{ open: boolean; id?: string; name?: string }>({ open: false });
  const [flowDialog, setFlowDialog] = useState<{ open: boolean; folder_id?: string | null }>({ open: false });
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; id?: string; name?: string }>({ open: false });

  const customFlows = useMemo(() => (flows.data ?? []).filter((f) => f.kind === "custom"), [flows.data]);
  const defaultFlows = useMemo(() => (flows.data ?? []).filter((f) => f.kind !== "custom"), [flows.data]);

  const filtered = useMemo(() => {
    let list = customFlows;
    if (selectedFolder !== "all") list = list.filter((f) => f.folder_id === selectedFolder);
    if (query) list = list.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));
    return list;
  }, [customFlows, selectedFolder, query]);

  const foldersWithCount = useMemo(() => {
    const map = new Map<string, number>();
    customFlows.forEach((f) => f.folder_id && map.set(f.folder_id, (map.get(f.folder_id) ?? 0) + 1));
    return (folders.data ?? []).map((fo) => ({ ...fo, count: map.get(fo.id) ?? 0 }));
  }, [folders.data, customFlows]);

  async function handleSaveFolder(name: string) {
    if (!name.trim()) return;
    try {
      if (folderDialog.id) await renameFolder.mutateAsync({ id: folderDialog.id, name: name.trim() });
      else await createFolder.mutateAsync(name.trim());
      setFolderDialog({ open: false });
    } catch (e: unknown) {
      toast({ title: "Erro", description: String((e as Error).message), variant: "destructive" });
    }
  }

  async function handleCreateFlow(name: string, folder_id: string | null) {
    if (!name.trim()) return;
    try {
      const created = await createFlow.mutateAsync({ name: name.trim(), folder_id });
      setFlowDialog({ open: false });
      nav(`/flows/${created.id}`);
    } catch (e: unknown) {
      toast({ title: "Erro", description: String((e as Error).message), variant: "destructive" });
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Fluxos de conversa"
        description="Organize seus fluxos em pastas. Os 4 fluxos padrão são acionados automaticamente em momentos-chave."
        actions={
          <>
            <Button variant="outline" onClick={() => setFolderDialog({ open: true })}>
              <FolderPlus className="h-4 w-4 mr-2" /> Criar pasta
            </Button>
            <Button onClick={() => setFlowDialog({ open: true })}>
              <Plus className="h-4 w-4 mr-2" /> Criar novo fluxo
            </Button>
          </>
        }
      />

      <DefaultFlowsSection
        flows={defaultFlows}
        onOpen={(id) => nav(`/flows/${id}`)}
      />

      <div className="mt-8 flex items-center justify-between gap-4">
        <h2 className="font-display text-lg font-semibold">Todos os fluxos</h2>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar fluxo..." className="pl-8" />
        </div>
      </div>

      {foldersWithCount.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
          <FolderCard label="Todos" count={customFlows.length} active={selectedFolder === "all"} onClick={() => setSelectedFolder("all")} />
          {foldersWithCount.map((fo) => (
            <FolderCard
              key={fo.id}
              label={fo.name}
              count={fo.count}
              active={selectedFolder === fo.id}
              onClick={() => setSelectedFolder(fo.id)}
              onRename={() => setFolderDialog({ open: true, id: fo.id, name: fo.name })}
              onDelete={async () => {
                if (!confirm(`Excluir pasta "${fo.name}"? Os fluxos não serão excluídos.`)) return;
                await deleteFolder.mutateAsync(fo.id);
                if (selectedFolder === fo.id) setSelectedFolder("all");
              }}
            />
          ))}
        </div>
      )}

      <Card className="mt-4 bg-card border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-10"><Checkbox /></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="text-center">Conexões</TableHead>
              <TableHead className="text-center">Execuções</TableHead>
              <TableHead className="text-center">CTR %</TableHead>
              <TableHead>Pasta</TableHead>
              <TableHead>Última alteração</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                <Workflow className="h-8 w-8 mx-auto mb-3 opacity-50" />
                Nenhum fluxo aqui ainda. Crie seu primeiro fluxo para começar.
              </TableCell></TableRow>
            )}
            {filtered.map((f) => (
              <TableRow key={f.id} className="border-border">
                <TableCell><Checkbox /></TableCell>
                <TableCell>
                  <Link to={`/flows/${f.id}`} className="font-medium hover:text-primary transition-colors">{f.name}</Link>
                </TableCell>
                <TableCell className="text-center text-muted-foreground">{f.connections || "—"}</TableCell>
                <TableCell className="text-center text-muted-foreground">{f.executions || "—"}</TableCell>
                <TableCell className="text-center text-muted-foreground">{f.ctr ? `${Number(f.ctr).toFixed(1)}%` : "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {foldersWithCount.find((fo) => fo.id === f.folder_id)?.name ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(f.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => nav(`/flows/${f.id}`)}><Pencil className="h-4 w-4 mr-2" /> Abrir editor</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRenameDialog({ open: true, id: f.id, name: f.name })}><Pencil className="h-4 w-4 mr-2" /> Renomear</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateFlow.mutate(f.id)}><Copy className="h-4 w-4 mr-2" /> Duplicar</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <MoveToFolderMenu flowId={f.id} folders={foldersWithCount} currentFolderId={f.folder_id} onMove={(fid) => updateFlow.mutate({ id: f.id, folder_id: fid })} />
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => {
                        if (confirm(`Excluir fluxo "${f.name}"?`)) deleteFlow.mutate(f.id);
                      }}><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Dialogs */}
      <FolderDialog open={folderDialog.open} initialName={folderDialog.name} editing={!!folderDialog.id} onOpenChange={(o) => setFolderDialog({ open: o })} onSave={handleSaveFolder} />
      <FlowDialog open={flowDialog.open} folders={foldersWithCount} initialFolder={selectedFolder === "all" ? null : selectedFolder} onOpenChange={(o) => setFlowDialog({ open: o })} onSave={handleCreateFlow} />
      <RenameFlowDialog
        open={renameDialog.open}
        initialName={renameDialog.name ?? ""}
        onOpenChange={(o) => setRenameDialog({ open: o })}
        onSave={async (name) => {
          if (!renameDialog.id) return;
          await updateFlow.mutateAsync({ id: renameDialog.id, name });
          setRenameDialog({ open: false });
        }}
      />
    </PageContainer>
  );
}

function DefaultFlowsSection({ flows, onOpen }: { flows: Array<{ id: string; kind: string; name: string; graph: unknown }>; onOpen: (id: string) => void; }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-3">
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Fluxos Padrões Básicos
      </button>
      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {DEFAULT_KINDS.map((k) => {
            const f = flows.find((x) => x.kind === k);
            const graph = (f?.graph as { nodes?: unknown[] } | undefined);
            const configured = !!f && (graph?.nodes?.length ?? 0) > 1;
            return (
              <Card
                key={k}
                onClick={() => f && onOpen(f.id)}
                className={`p-4 cursor-pointer transition-all bg-card border ${configured ? "border-border hover:border-primary/50" : "border-dashed border-border-strong/60 hover:border-accent/50"}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">{FLOW_KIND_LABEL[k]}</div>
                    <div className="mt-1 font-medium truncate">{f?.name ?? "—"}</div>
                  </div>
                  {configured ? <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30">Ativo</Badge> : <Badge variant="outline" className="text-muted-foreground">Não configurado</Badge>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FolderCard({ label, count, active, onClick, onRename, onDelete }: { label: string; count: number; active?: boolean; onClick: () => void; onRename?: () => void; onDelete?: () => void; }) {
  return (
    <div className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${active ? "border-primary/50 bg-primary/5" : "border-border hover:border-border-strong bg-card"}`}>
      <button type="button" onClick={onClick} className="flex items-center gap-2 flex-1 min-w-0">
        <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium truncate">{label}</span>
      </button>
      <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
      {(onRename || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"><MoreVertical className="h-3.5 w-3.5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onRename && <DropdownMenuItem onClick={onRename}><Pencil className="h-4 w-4 mr-2" /> Renomear</DropdownMenuItem>}
            {onDelete && <DropdownMenuItem className="text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function MoveToFolderMenu({ folders, currentFolderId, onMove }: { flowId: string; folders: Array<{ id: string; name: string }>; currentFolderId: string | null; onMove: (id: string | null) => void; }) {
  return (
    <>
      <DropdownMenuItem disabled className="text-xs text-muted-foreground">Mover para pasta</DropdownMenuItem>
      <DropdownMenuItem onClick={() => onMove(null)} disabled={!currentFolderId}>— Sem pasta</DropdownMenuItem>
      {folders.map((f) => (
        <DropdownMenuItem key={f.id} disabled={f.id === currentFolderId} onClick={() => onMove(f.id)}>
          <Folder className="h-4 w-4 mr-2" /> {f.name}
        </DropdownMenuItem>
      ))}
    </>
  );
}

function FolderDialog({ open, onOpenChange, onSave, initialName = "", editing }: { open: boolean; onOpenChange: (o: boolean) => void; onSave: (name: string) => void; initialName?: string; editing?: boolean; }) {
  const [name, setName] = useState(initialName);
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (o) setName(initialName); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Renomear pasta" : "Nova pasta"}</DialogTitle>
          <DialogDescription>Organize seus fluxos agrupando por contexto.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Nome da pasta</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ex: Vendas, Suporte..." />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(name)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FlowDialog({ open, onOpenChange, onSave, folders, initialFolder }: { open: boolean; onOpenChange: (o: boolean) => void; onSave: (name: string, folder_id: string | null) => void; folders: Array<{ id: string; name: string }>; initialFolder: string | null; }) {
  const [name, setName] = useState("");
  const [folder, setFolder] = useState<string>(initialFolder ?? "none");
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (o) { setName(""); setFolder(initialFolder ?? "none"); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo fluxo</DialogTitle>
          <DialogDescription>Você será levado para o editor visual.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome do fluxo</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ex: Boas-vindas para novos contatos" />
          </div>
          <div className="space-y-1.5">
            <Label>Pasta</Label>
            <Select value={folder} onValueChange={setFolder}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem pasta</SelectItem>
                {folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(name, folder === "none" ? null : folder)}>Criar e abrir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenameFlowDialog({ open, onOpenChange, onSave, initialName }: { open: boolean; onOpenChange: (o: boolean) => void; onSave: (name: string) => void; initialName: string; }) {
  const [name, setName] = useState(initialName);
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (o) setName(initialName); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Renomear fluxo</DialogTitle></DialogHeader>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(name)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
