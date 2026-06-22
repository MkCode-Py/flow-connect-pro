import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, QrCode, RefreshCcw, Trash2, Unplug, Smartphone, MoreVertical } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { whatsapp } from "@/integrations/whatsapp";
import { toast } from "@/hooks/use-toast";

const STATUS_LABEL: Record<string, string> = {
  disconnected: "Desconectado", qr: "Aguardando QR", connecting: "Conectando",
  connected: "Conectado", error: "Erro",
};
const STATUS_TONE: Record<string, string> = {
  disconnected: "bg-muted text-muted-foreground",
  qr: "bg-warning/15 text-warning border-warning/30",
  connecting: "bg-accent/15 text-accent border-accent/30",
  connected: "bg-primary/15 text-primary border-primary/30",
  error: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function Connections() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [qrFor, setQrFor] = useState<string | null>(null);

  const instances = useQuery({
    queryKey: ["wa-instances", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("whatsapp_instances").select("*").eq("owner_id", user!.id).order("created_at")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from("whatsapp_instances").insert({ owner_id: user!.id, name }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wa-instances"] }); setCreateOpen(false); },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("whatsapp_instances").update({ status: status as never }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-instances"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_instances").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-instances"] }),
  });

  return (
    <PageContainer>
      <PageHeader
        title="Conexões"
        description="Cada instância representa um número WhatsApp. A conexão real será habilitada quando o backend Baileys estiver plugado."
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nova instância</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(instances.data ?? []).map((i) => (
          <Card key={i.id} className="p-5 bg-card border-border hover:border-border-strong transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center"><Smartphone className="h-5 w-5 text-primary" /></div>
                <div>
                  <div className="font-medium">{i.name}</div>
                  <Badge variant="outline" className={STATUS_TONE[i.status] ?? ""}>{STATUS_LABEL[i.status] ?? i.status}</Badge>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={async () => { await setStatus.mutateAsync({ id: i.id, status: "disconnected" }); await whatsapp.deleteSession(i.id); }}><Trash2 className="h-4 w-4 mr-2" /> Apagar sessão</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("Remover instância?")) del.mutate(i.id); }}><Trash2 className="h-4 w-4 mr-2" /> Remover instância</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-4 flex gap-2">
              {i.status === "connected" ? (
                <Button variant="outline" className="flex-1" onClick={async () => { await whatsapp.disconnectInstance(i.id); await setStatus.mutateAsync({ id: i.id, status: "disconnected" }); }}>
                  <Unplug className="h-4 w-4 mr-2" /> Desconectar
                </Button>
              ) : (
                <Button className="flex-1" onClick={async () => { await setStatus.mutateAsync({ id: i.id, status: "qr" }); setQrFor(i.id); }}>
                  <QrCode className="h-4 w-4 mr-2" /> {i.status === "disconnected" ? "Conectar" : "Reconectar"}
                </Button>
              )}
            </div>
          </Card>
        ))}

        {(instances.data ?? []).length === 0 && (
          <Card className="p-12 border-dashed border-border md:col-span-2 lg:col-span-3 text-center text-muted-foreground">
            Nenhuma instância criada ainda.
          </Card>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova instância WhatsApp</DialogTitle>
            <DialogDescription>Dê um nome para identificar este número.</DialogDescription>
          </DialogHeader>
          <NewInstanceForm onSave={(name) => create.mutate(name)} />
        </DialogContent>
      </Dialog>

      <QrDialog
        instanceId={qrFor}
        onClose={() => setQrFor(null)}
        onConnected={async (id) => { await setStatus.mutateAsync({ id, status: "connected" }); setQrFor(null); toast({ title: "Instância conectada (mock)" }); }}
      />
    </PageContainer>
  );
}

function NewInstanceForm({ onSave }: { onSave: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <>
      <div className="space-y-1.5">
        <Label>Nome da instância</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Vendas / Suporte" autoFocus />
      </div>
      <DialogFooter className="mt-4">
        <Button onClick={() => name.trim() && onSave(name.trim())}>Criar</Button>
      </DialogFooter>
    </>
  );
}

function QrDialog({ instanceId, onClose, onConnected }: { instanceId: string | null; onClose: () => void; onConnected: (id: string) => void; }) {
  const [qr, setQr] = useState<string | null>(null);
  const [expires, setExpires] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!instanceId) { setQr(null); setExpires(null); return; }
    let cancelled = false;
    (async () => {
      await whatsapp.connectInstance(instanceId);
      const sub = whatsapp.on("qr.generated", ({ qr, expiresAt }) => {
        if (cancelled) return;
        setQr(qr); setExpires(expiresAt);
      });
      return () => sub();
    })();
    const interval = setInterval(() => {
      setNow(new Date());
      if (expires && expires.getTime() < Date.now() && instanceId) {
        whatsapp.generateQrCode(instanceId);
      }
    }, 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [instanceId]);

  const secondsLeft = expires ? Math.max(0, Math.round((expires.getTime() - now.getTime()) / 1000)) : 0;

  return (
    <Dialog open={!!instanceId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar meu WhatsApp</DialogTitle>
          <DialogDescription>Abra Aparelhos conectados nas configurações do seu WhatsApp, escolha "Conectar um aparelho" e aponte a câmera para o QR abaixo.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3">
          <div className="bg-white p-4 rounded-xl">
            {qr ? <QrSvg payload={qr} /> : <div className="h-[220px] w-[220px] animate-pulse bg-muted rounded" />}
          </div>
          <div className="text-xs text-muted-foreground">Novo QR em {secondsLeft}s</div>
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">QR de demonstração (modo mock)</Badge>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => instanceId && onConnected(instanceId)}>Simular conexão</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** QR mockado — não é um QR válido, apenas representação visual. */
function QrSvg({ payload }: { payload: string }) {
  // gera grid 21x21 determinístico a partir do payload (não é QR real, é visual)
  const cells = useMemo(() => {
    const size = 25;
    const arr: number[] = [];
    let h = 0;
    for (let i = 0; i < payload.length; i++) h = (h * 31 + payload.charCodeAt(i)) >>> 0;
    for (let i = 0; i < size * size; i++) { h = (h * 1103515245 + 12345) >>> 0; arr.push(h % 2); }
    // marcadores nos cantos
    const mark = (cx: number, cy: number) => {
      for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
        const onBorder = x === 0 || x === 6 || y === 0 || y === 6;
        const inner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        arr[(cy + y) * size + (cx + x)] = onBorder || inner ? 1 : 0;
      }
    };
    mark(0, 0); mark(size - 7, 0); mark(0, size - 7);
    return { size, arr };
  }, [payload]);
  const cell = 8;
  return (
    <svg width={cells.size * cell} height={cells.size * cell} className="block">
      {cells.arr.map((v, i) => v ? <rect key={i} x={(i % cells.size) * cell} y={Math.floor(i / cells.size) * cell} width={cell} height={cell} fill="#000" /> : null)}
    </svg>
  );
}
