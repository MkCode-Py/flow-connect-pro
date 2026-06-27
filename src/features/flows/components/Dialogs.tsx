import { useEffect, useState } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FLOW_KIND_LABEL, type FlowKind } from "../types";
import { FLOW_TEMPLATES, type FlowTemplateId } from "../utils/templates";

const nameSchema = z.string().trim().min(1, "Informe um nome").max(80, "Máximo de 80 caracteres");

/* ----------------------------- Folder dialogs ----------------------------- */

export function FolderFormDialog({
  open, onOpenChange, onSubmit, initialName = "", title, submitLabel,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (name: string) => Promise<void> | void;
  initialName?: string;
  title: string;
  submitLabel: string;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setName(initialName); setError(null); } }, [open, initialName]);

  async function handleSubmit() {
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setSaving(true);
    try { await onSubmit(parsed.data); onOpenChange(false); }
    catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Pastas ajudam a organizar fluxos por contexto, time ou campanha.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="folder-name">Nome da pasta</Label>
          <Input id="folder-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Vendas, Suporte, Recuperação" onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteFolderDialog({
  open, onOpenChange, folderName, flowCount, onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  folderName: string;
  flowCount: number;
  onConfirm: (moveFlows: boolean) => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  async function run(move: boolean) {
    setBusy(true);
    try { await onConfirm(move); onOpenChange(false); } finally { setBusy(false); }
  }
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir pasta "{folderName}"?</AlertDialogTitle>
          <AlertDialogDescription>
            {flowCount > 0
              ? `Esta pasta contém ${flowCount} fluxo(s). Você pode movê-los para "Sem pasta" ou cancelar.`
              : "Esta pasta está vazia e será removida permanentemente."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          {flowCount > 0 && (
            <Button variant="outline" disabled={busy} onClick={() => run(true)}>
              Mover fluxos e excluir
            </Button>
          )}
          {flowCount === 0 && (
            <AlertDialogAction disabled={busy} onClick={() => run(false)}>Excluir</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ------------------------------ Flow dialogs ------------------------------ */

const CUSTOM_KINDS: FlowKind[] = ["custom", "welcome", "default_reply", "media_default", "post_service"];

export function CreateFlowDialog({
  open, onOpenChange, folders, initialFolderId, onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  folders: { id: string; name: string }[];
  initialFolderId: string | null;
  onSubmit: (v: { name: string; folder_id: string | null; kind: FlowKind; templateId?: FlowTemplateId }) => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [folder, setFolder] = useState<string>("none");
  const [kind, setKind] = useState<FlowKind>("custom");
  const [origin, setOrigin] = useState<"empty" | "template">("empty");
  const [templateId, setTemplateId] = useState<FlowTemplateId>("support");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(""); setFolder(initialFolderId ?? "none");
      setKind("custom"); setOrigin("empty"); setTemplateId("support"); setError(null);
    }
  }, [open, initialFolderId]);

  async function handle() {
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setSaving(true);
    try {
      await onSubmit({
        name: parsed.data,
        folder_id: folder === "none" ? null : folder,
        kind,
        templateId: origin === "template" ? templateId : undefined,
      });
      onOpenChange(false);
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar novo fluxo</DialogTitle>
          <DialogDescription>Depois de criar, você será levado para o editor visual.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="flow-name">Nome do fluxo</Label>
            <Input id="flow-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Boas-vindas para novos contatos" />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as FlowKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CUSTOM_KINDS.map((k) => <SelectItem key={k} value={k}>{FLOW_KIND_LABEL[k]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Como começar</Label>
            <RadioGroup value={origin} onValueChange={(v) => setOrigin(v as "empty" | "template")} className="grid grid-cols-1 gap-2">
              <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-primary/40 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <RadioGroupItem value="empty" className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Fluxo vazio</div>
                  <div className="text-xs text-muted-foreground">Começa apenas com o bloco inicial.</div>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-primary/40 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <RadioGroupItem value="template" className="mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">A partir de um modelo</div>
                  <div className="text-xs text-muted-foreground mb-2">Comece com uma estrutura pronta para editar.</div>
                  {origin === "template" && (
                    <Select value={templateId} onValueChange={(v) => setTemplateId(v as FlowTemplateId)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FLOW_TEMPLATES.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            <div>
                              <div className="text-sm">{t.name}</div>
                              <div className="text-xs text-muted-foreground">{t.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </label>
            </RadioGroup>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handle} disabled={saving}>Criar e abrir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RenameFlowDialog({
  open, onOpenChange, initialName, onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialName: string;
  onSubmit: (name: string) => Promise<void> | void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setName(initialName); setError(null); } }, [open, initialName]);

  async function handle() {
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setSaving(true);
    try { await onSubmit(parsed.data); onOpenChange(false); }
    catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Renomear fluxo</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rename-flow">Novo nome</Label>
          <Input id="rename-flow" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handle()} />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handle} disabled={saving}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MoveFlowDialog({
  open, onOpenChange, folders, currentFolderId, onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  folders: { id: string; name: string }[];
  currentFolderId: string | null;
  onSubmit: (folderId: string | null) => Promise<void> | void;
}) {
  const [folder, setFolder] = useState<string>(currentFolderId ?? "none");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setFolder(currentFolderId ?? "none"); }, [open, currentFolderId]);

  async function handle() {
    setSaving(true);
    try { await onSubmit(folder === "none" ? null : folder); onOpenChange(false); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover para pasta</DialogTitle>
          <DialogDescription>Escolha a pasta de destino para este fluxo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Pasta</Label>
          <Select value={folder} onValueChange={setFolder}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Sem pasta</SelectItem>
              {folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handle} disabled={saving}>Mover</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteFlowDialog({
  open, onOpenChange, flowName, onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  flowName: string;
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir fluxo "{flowName}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação é permanente. O fluxo e seu desenho serão removidos. Automatizações conectadas a ele perderão a referência.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={async () => { setBusy(true); try { await onConfirm(); onOpenChange(false); } finally { setBusy(false); } }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
