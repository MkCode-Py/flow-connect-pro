import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, PlayCircle, Link2, MoreVertical, Loader2,
  AlertCircle, CheckCircle2, CircleDot,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { FlowStatus } from "../types";

type Props = {
  name: string;
  onNameChange: (next: string) => void;
  status: FlowStatus;
  lastSavedAt: Date | null;
  onSave: () => void;
  onTest: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onFitView: () => void;
  onToggleMiniMap: () => void;
  miniMapVisible: boolean;
};

const STATUS_STYLES: Record<FlowStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  idle: {
    label: "Salvo",
    cls: "bg-surface-2 text-muted-foreground border-border",
    icon: <CheckCircle2 className="h-3 w-3 text-success" />,
  },
  dirty: {
    label: "Alterações não salvas",
    cls: "bg-warning/10 text-warning border-warning/30",
    icon: <CircleDot className="h-3 w-3" />,
  },
  saving: {
    label: "Salvando...",
    cls: "bg-accent/10 text-accent border-accent/30",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  error: {
    label: "Erro ao salvar",
    cls: "bg-destructive/10 text-destructive border-destructive/40",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

export function EditorTopBar({
  name, onNameChange, status, lastSavedAt, onSave, onTest, onDuplicate, onDelete,
  onFitView, onToggleMiniMap, miniMapVisible,
}: Props) {
  const nav = useNavigate();
  const [localName, setLocalName] = useState(name);

  useEffect(() => { setLocalName(name); }, [name]);

  const s = STATUS_STYLES[status];
  const savedHint = lastSavedAt
    ? `Salvo às ${lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : null;

  return (
    <div className="h-14 px-4 border-b border-border surface-1 flex items-center gap-3 shrink-0">
      <Button variant="ghost" size="sm" onClick={() => nav("/flows")} className="gap-1.5">
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Fluxos</span>
      </Button>

      <div className="h-6 w-px bg-border" />

      <Input
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        onBlur={() => { if (localName.trim() && localName !== name) onNameChange(localName.trim()); }}
        onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); }}
        className="h-9 max-w-sm font-medium border-transparent bg-transparent hover:border-border focus-visible:border-border"
      />

      <div
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors",
          s.cls,
        )}
        title={savedHint ?? undefined}
      >
        {s.icon}
        <span>{s.label}</span>
      </div>

      <div className="flex-1" />

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          navigator.clipboard.writeText(window.location.href);
          toast.success("Link interno copiado");
        }}
      >
        <Link2 className="h-4 w-4 sm:mr-1.5" />
        <span className="hidden sm:inline">Copiar link</span>
      </Button>

      <Button variant="outline" size="sm" onClick={onTest}>
        <PlayCircle className="h-4 w-4 sm:mr-1.5" />
        <span className="hidden sm:inline">Testar</span>
      </Button>

      <Button size="sm" onClick={onSave} disabled={status === "saving"}>
        {status === "saving"
          ? <Loader2 className="h-4 w-4 sm:mr-1.5 animate-spin" />
          : <Save className="h-4 w-4 sm:mr-1.5" />}
        <span className="hidden sm:inline">Salvar</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={onFitView}>Ajustar visualização</DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleMiniMap}>
            {miniMapVisible ? "Ocultar minimapa" : "Mostrar minimapa"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDuplicate}>Duplicar fluxo</DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            Excluir fluxo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
