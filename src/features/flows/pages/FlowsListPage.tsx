import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { DefaultFlowsSection } from "../components/DefaultFlowsSection";
import { FoldersGrid } from "../components/FoldersGrid";
import { FlowsFilters, type FlowFiltersState } from "../components/FlowsFilters";
import { FlowsTable, type SortDir, type SortKey } from "../components/FlowsTable";
import {
  CreateFlowDialog, DeleteFlowDialog, DeleteFolderDialog, FolderFormDialog, MoveFlowDialog, RenameFlowDialog,
} from "../components/Dialogs";
import {
  useCreateFlow, useCreateFolder, useDeleteFlow, useDeleteFolder, useDuplicateFlow,
  useEnsureDefaultFlows, useFlows, useFoldersWithCount, useRenameFolder, useToggleFlowActive, useUpdateFlow,
  type FlowRow,
} from "../hooks";
import { getTemplateGraph } from "../utils/templates";

const DEFAULT_FILTERS: FlowFiltersState = { query: "", folderId: "all", kind: "all", status: "all" };

export default function FlowsListPage() {
  const navigate = useNavigate();

  const flowsQ = useFlows();
  const { data: foldersWithCount, isLoading: foldersLoading } = useFoldersWithCount();
  useEnsureDefaultFlows(flowsQ.data);

  // Mutations
  const createFlow = useCreateFlow();
  const updateFlow = useUpdateFlow();
  const deleteFlow = useDeleteFlow();
  const duplicateFlow = useDuplicateFlow();
  const toggleActive = useToggleFlowActive();
  const createFolder = useCreateFolder();
  const renameFolder = useRenameFolder();
  const deleteFolder = useDeleteFolder();

  // Filters + sort + selection
  const [filters, setFilters] = useState<FlowFiltersState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "updated", dir: "desc" });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [folderCreateOpen, setFolderCreateOpen] = useState(false);
  const [folderRename, setFolderRename] = useState<{ id: string; name: string } | null>(null);
  const [folderDelete, setFolderDelete] = useState<{ id: string; name: string; count: number } | null>(null);
  const [flowRename, setFlowRename] = useState<FlowRow | null>(null);
  const [flowMove, setFlowMove] = useState<FlowRow | null>(null);
  const [flowDelete, setFlowDelete] = useState<FlowRow | null>(null);

  const allFlows = flowsQ.data ?? [];
  const customFlows = useMemo(() => allFlows.filter((f) => f.kind === "custom"), [allFlows]);
  const defaultFlows = useMemo(() => allFlows.filter((f) => f.kind !== "custom"), [allFlows]);
  const noFolderCount = useMemo(() => customFlows.filter((f) => !f.folder_id).length, [customFlows]);
  const foldersList = foldersWithCount ?? [];
  const foldersById = useMemo(() => new Map(foldersList.map((f) => [f.id, f.name])), [foldersList]);

  const filtered = useMemo(() => {
    let list = [...allFlows]; // include defaults in table too? UX choice: only customs in main table; defaults appear in section above.
    list = list.filter((f) => f.kind === "custom");
    if (filters.folderId === "none") list = list.filter((f) => !f.folder_id);
    else if (filters.folderId !== "all") list = list.filter((f) => f.folder_id === filters.folderId);
    if (filters.kind !== "all") list = list.filter((f) => f.kind === filters.kind);
    if (filters.status === "active") list = list.filter((f) => f.is_active);
    if (filters.status === "inactive") list = list.filter((f) => !f.is_active);
    if (filters.query) {
      const q = filters.query.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const m = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "name") return a.name.localeCompare(b.name) * m;
      return (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * m;
    });
    return list;
  }, [allFlows, filters, sort]);

  // ----- Handlers -----
  const handleCreate: React.ComponentProps<typeof CreateFlowDialog>["onSubmit"] = async (v) => {
    const created = await createFlow.mutateAsync({
      name: v.name,
      folder_id: v.folder_id,
      kind: v.kind,
      graph: v.templateId ? getTemplateGraph(v.templateId) : undefined,
    });
    toast.success("Fluxo criado", { description: "Abrindo o editor visual..." });
    navigate(`/flows/${created.id}`);
  };

  function handleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  return (
    <PageContainer>
      <PageHeader
        title="Fluxos de conversa"
        description="Organize seus fluxos, respostas automáticas e automações de atendimento."
        actions={
          <>
            <Button variant="outline" onClick={() => setFolderCreateOpen(true)}>
              <FolderPlus className="h-4 w-4 mr-2" /> Criar pasta
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Criar novo fluxo
            </Button>
          </>
        }
      />

      <div className="space-y-8">
        <DefaultFlowsSection flows={defaultFlows} isLoading={flowsQ.isLoading} />

        <section className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Todos os fluxos</h2>
            <p className="text-sm text-muted-foreground">Filtre por pasta, tipo ou status para encontrar rapidamente.</p>
          </div>

          <FoldersGrid
            folders={foldersList}
            selectedFolderId={filters.folderId}
            totalCount={customFlows.length}
            noFolderCount={noFolderCount}
            onSelect={(id) => setFilters((f) => ({ ...f, folderId: id }))}
            onRename={(fo) => setFolderRename({ id: fo.id, name: fo.name })}
            onDelete={(fo) => setFolderDelete({ id: fo.id, name: fo.name, count: fo.count })}
          />

          <FlowsFilters value={filters} onChange={setFilters} folders={foldersList} />

          {flowsQ.isError && (
            <div className="text-sm text-destructive py-4">
              Erro ao carregar fluxos: {(flowsQ.error as Error).message}
            </div>
          )}

          <FlowsTable
            flows={filtered}
            foldersById={foldersById}
            isLoading={flowsQ.isLoading || foldersLoading}
            selected={selected}
            onToggleSelect={(id) =>
              setSelected((prev) => {
                const next = new Set(prev);
                next.has(id) ? next.delete(id) : next.add(id);
                return next;
              })
            }
            onToggleSelectAll={(all) => setSelected(all ? new Set(filtered.map((f) => f.id)) : new Set())}
            sort={sort}
            onSort={handleSort}
            onOpen={(f) => navigate(`/flows/${f.id}`)}
            onRename={(f) => setFlowRename(f)}
            onDuplicate={async (f) => {
              const created = await duplicateFlow.mutateAsync(f.id);
              toast.success(`"${f.name}" duplicado`, {
                description: `Criado como "${created.name}" (inativo).`,
                action: { label: "Abrir", onClick: () => navigate(`/flows/${created.id}`) },
              });
            }}
            onMove={(f) => setFlowMove(f)}
            onToggleActive={async (f) => {
              try {
                await toggleActive.mutateAsync({ id: f.id, is_active: !f.is_active });
                toast.success(f.is_active ? "Fluxo desativado" : "Fluxo ativado");
              } catch (e) {
                toast.error("Erro ao alterar status", { description: (e as Error).message });
              }
            }}
            onDelete={(f) => setFlowDelete(f)}
            onCreate={() => setCreateOpen(true)}
          />
        </section>
      </div>

      {/* Dialogs */}
      <CreateFlowDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        folders={foldersList}
        initialFolderId={filters.folderId !== "all" && filters.folderId !== "none" ? filters.folderId : null}
        onSubmit={handleCreate}
      />

      <FolderFormDialog
        open={folderCreateOpen}
        onOpenChange={setFolderCreateOpen}
        title="Nova pasta"
        submitLabel="Criar pasta"
        onSubmit={async (name) => {
          await createFolder.mutateAsync(name);
          toast.success("Pasta criada");
        }}
      />

      <FolderFormDialog
        open={!!folderRename}
        onOpenChange={(o) => !o && setFolderRename(null)}
        title="Renomear pasta"
        submitLabel="Salvar"
        initialName={folderRename?.name ?? ""}
        onSubmit={async (name) => {
          if (!folderRename) return;
          await renameFolder.mutateAsync({ id: folderRename.id, name });
          toast.success("Pasta renomeada");
        }}
      />

      <DeleteFolderDialog
        open={!!folderDelete}
        onOpenChange={(o) => !o && setFolderDelete(null)}
        folderName={folderDelete?.name ?? ""}
        flowCount={folderDelete?.count ?? 0}
        onConfirm={async (moveFlows) => {
          if (!folderDelete) return;
          await deleteFolder.mutateAsync({ id: folderDelete.id, moveFlowsToNoFolder: moveFlows });
          if (filters.folderId === folderDelete.id) setFilters((f) => ({ ...f, folderId: "all" }));
          toast.success("Pasta excluída");
        }}
      />

      <RenameFlowDialog
        open={!!flowRename}
        onOpenChange={(o) => !o && setFlowRename(null)}
        initialName={flowRename?.name ?? ""}
        onSubmit={async (name) => {
          if (!flowRename) return;
          await updateFlow.mutateAsync({ id: flowRename.id, name });
          toast.success("Fluxo renomeado");
        }}
      />

      <MoveFlowDialog
        open={!!flowMove}
        onOpenChange={(o) => !o && setFlowMove(null)}
        folders={foldersList}
        currentFolderId={flowMove?.folder_id ?? null}
        onSubmit={async (folderId) => {
          if (!flowMove) return;
          await updateFlow.mutateAsync({ id: flowMove.id, folder_id: folderId });
          toast.success("Fluxo movido");
        }}
      />

      <DeleteFlowDialog
        open={!!flowDelete}
        onOpenChange={(o) => !o && setFlowDelete(null)}
        flowName={flowDelete?.name ?? ""}
        onConfirm={async () => {
          if (!flowDelete) return;
          await deleteFlow.mutateAsync(flowDelete.id);
          toast.success("Fluxo excluído");
        }}
      />
    </PageContainer>
  );
}
