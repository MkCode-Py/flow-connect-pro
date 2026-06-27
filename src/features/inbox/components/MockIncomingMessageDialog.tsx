import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Inbox } from "lucide-react";

export function MockIncomingMessageDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (body: string) => Promise<void> | void;
}) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setBody(""); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Inbox className="h-4 w-4 text-primary" /> Simular mensagem do cliente</DialogTitle>
          <DialogDescription>
            Apenas mock — a mensagem é salva como recebida do contato, mas nenhum WhatsApp real é envolvido.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Mensagem recebida</Label>
          <Textarea autoFocus rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ex.: Quero saber o preço" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!body.trim() || sending}
            onClick={async () => {
              setSending(true);
              try { await onSubmit(body.trim()); setBody(""); onOpenChange(false); }
              finally { setSending(false); }
            }}
          >Inserir mensagem</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
