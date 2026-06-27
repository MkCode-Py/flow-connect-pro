import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { QrCode, Plus } from "lucide-react";

export function NewInstanceDialog({
  open, onOpenChange, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: { name: string; description?: string; connectNow: boolean }) => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState<"connect" | "save" | null>(null);

  const reset = () => { setName(""); setDescription(""); setBusy(null); };

  const submit = async (connectNow: boolean) => {
    if (!name.trim()) return;
    setBusy(connectNow ? "connect" : "save");
    try {
      await onSubmit({ name: name.trim(), description: description.trim() || undefined, connectNow });
      reset();
      onOpenChange(false);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova instância WhatsApp</DialogTitle>
          <DialogDescription>
            Cada instância representa um número WhatsApp. Você pode criar agora e conectar depois.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Vendas, Suporte, Pós-venda" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição <span className="text-muted-foreground">(opcional)</span></Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Para que esse número será usado?" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="outline" disabled={!name.trim() || busy !== null} onClick={() => submit(false)}>
            <Plus className="h-4 w-4 mr-1.5" />
            {busy === "save" ? "Criando..." : "Criar sem conectar"}
          </Button>
          <Button disabled={!name.trim() || busy !== null} onClick={() => submit(true)}>
            <QrCode className="h-4 w-4 mr-1.5" />
            {busy === "connect" ? "Criando..." : "Criar e conectar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
