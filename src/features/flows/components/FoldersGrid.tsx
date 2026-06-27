import { Folder, FolderOpen, MoreVertical, Pencil, Trash2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type FolderCount = { id: string; name: string; count: number };

export function FoldersGrid({
  folders, selectedFolderId, totalCount, noFolderCount, onSelect, onRename, onDelete,
}: {
  folders: FolderCount[];
  selectedFolderId: string;       // "all" | "none" | id
  totalCount: number;
  noFolderCount: number;
  onSelect: (id: string) => void;
  onRename: (folder: FolderCount) => void;
  onDelete: (folder: FolderCount) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
      <SystemChip
        active={selectedFolderId === "all"}
        icon={<Inbox className="h-4 w-4" />}
        label="Todos"
        count={totalCount}
        onClick={() => onSelect("all")}
      />
      <SystemChip
        active={selectedFolderId === "none"}
        icon={<Folder className="h-4 w-4" />}
        label="Sem pasta"
        count={noFolderCount}
        onClick={() => onSelect("none")}
      />
      {folders.map((f) => {
        const active = selectedFolderId === f.id;
        return (
          <div
            key={f.id}
            className={`group relative flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-all ${
              active ? "border-primary/50 bg-primary/5" : "border-border/70 bg-card hover:border-border-strong"
            }`}
            onClick={() => onSelect(f.id)}
          >
            {active ? <FolderOpen className="h-4 w-4 text-primary shrink-0" /> : <Folder className="h-4 w-4 text-muted-foreground shrink-0" />}
            <span className="flex-1 min-w-0 text-sm font-medium truncate">{f.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{f.count}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 -mr-1 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => onSelect(f.id)}>
                  <FolderOpen className="h-4 w-4 mr-2" /> Ver fluxos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRename(f)}>
                  <Pencil className="h-4 w-4 mr-2" /> Renomear
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(f)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
    </div>
  );
}

function SystemChip({ active, icon, label, count, onClick }: {
  active: boolean; icon: React.ReactNode; label: string; count: number; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-all text-left ${
        active ? "border-primary/50 bg-primary/5" : "border-border/70 bg-card hover:border-border-strong"
      }`}
    >
      <span className={active ? "text-primary" : "text-muted-foreground"}>{icon}</span>
      <span className="flex-1 text-sm font-medium truncate">{label}</span>
      <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
    </button>
  );
}
