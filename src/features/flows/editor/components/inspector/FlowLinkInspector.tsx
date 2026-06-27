import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ChevronDown, Folder } from "lucide-react";
import { FieldError } from "./shared/FieldError";
import { useFlowsLite, useFlowFolders } from "../../hooks/useTaxonomy";
import type { FlowLinkData } from "../../types";
import type { FieldErrors } from "../../schemas/nodeSchemas";

type Props = {
  draft: FlowLinkData;
  setDraft: (next: FlowLinkData) => void;
  errors: FieldErrors;
};

export function FlowLinkInspector({ draft, setDraft, errors }: Props) {
  const { id: currentFlowId } = useParams<{ id: string }>();
  const { data: flows = [] } = useFlowsLite();
  const { data: folders = [] } = useFlowFolders();
  const [open, setOpen] = useState(false);
  const folderMap = useMemo(() => new Map(folders.map((f) => [f.id, f.name])), [folders]);
  const target = flows.find((f) => f.id === draft.targetFlowId);
  const selectableFlows = flows.filter((f) => f.id !== currentFlowId);

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-[11px] text-muted-foreground">Nome do bloco</Label>
        <Input
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          className="h-8 mt-1"
        />
        <FieldError message={errors.label} />
      </div>

      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Fluxo de destino</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full h-9 justify-between font-normal">
              <span className="truncate">
                {target ? target.name : <span className="text-muted-foreground">Selecionar fluxo…</span>}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar fluxo…" />
              <CommandList>
                <CommandEmpty>Nenhum fluxo encontrado.</CommandEmpty>
                <CommandGroup>
                  {selectableFlows.map((f) => (
                    <CommandItem
                      key={f.id}
                      onSelect={() => { setDraft({ ...draft, targetFlowId: f.id }); setOpen(false); }}
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate text-[13px]">{f.name}</span>
                        {f.folder_id && folderMap.get(f.folder_id) && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Folder className="h-2.5 w-2.5" /> {folderMap.get(f.folder_id)}
                          </span>
                        )}
                      </div>
                      {!f.is_active && <span className="text-[10px] text-muted-foreground">inativo</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {!draft.targetFlowId && (
        <Alert className="border-warning/40 bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-[11px]">
            Nenhum fluxo de destino selecionado. O bloco ficará inativo até você escolher um.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-[12px]">Encerrar fluxo atual</Label>
            <p className="text-[10px] text-muted-foreground">Após enviar para o outro fluxo.</p>
          </div>
          <Switch
            checked={draft.endCurrentFlow}
            onCheckedChange={(v) => setDraft({ ...draft, endCurrentFlow: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-[12px]">Manter contexto/variáveis</Label>
            <p className="text-[10px] text-muted-foreground">Carregar dados do contato no novo fluxo.</p>
          </div>
          <Switch
            checked={draft.preserveContext}
            onCheckedChange={(v) => setDraft({ ...draft, preserveContext: v })}
          />
        </div>
      </div>
    </div>
  );
}
