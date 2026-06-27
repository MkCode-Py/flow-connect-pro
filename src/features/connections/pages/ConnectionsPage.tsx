import { useState } from "react";
import { Plus, Smartphone, ShieldCheck } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

import {
  useInstances, useCreateInstance, useConnectInstance, useDisconnectInstance,
  useReconnectInstance, useDeleteSession, useDeleteInstance,
} from "../hooks/useInstances";
import { SummaryCards } from "../components/SummaryCards";
import { InstancesTable } from "../components/InstancesTable";
import { NewInstanceDialog } from "../components/NewInstanceDialog";
import { QrConnectDialog } from "../components/QrConnectDialog";
import { InstanceStatusBadge } from "../components/InstanceStatusBadge";
import { InstanceLogs } from "../components/InstanceLogs";
import type { WAInstance } from "../types";

type ConfirmKind = "disconnect" | "delete-session" | "delete" | null;

export default function ConnectionsPage() {
  const instances = useInstances();
  const create = useCreateInstance();
  const connect = useConnectInstance();
  const disconnect = useDisconnectInstance();
  const reconnect = useReconnectInstance();
  const deleteSession = useDeleteSession();
  const removeInstance = useDeleteInstance();

  const [newOpen, setNewOpen] = useState(false);
  const [qrInstance, setQrInstance] = useState<WAInstance | null>(null);
  const [detailsInstance, setDetailsInstance] = useState<WAInstance | null>(null);
  const [confirm, setConfirm] = useState<{ kind: ConfirmKind; instance: WAInstance | null }>({ kind: null, instance: null });

  const items = instances.data ?? [];

  const handleAction = async (
    action: "connect" | "reconnect" | "disconnect" | "delete-session" | "delete" | "view",
    i: WAInstance,
  ) => {
    if (action === "view") return setDetailsInstance(i);
    if (action === "connect") {
      await connect.mutateAsync(i.id);
      setQrInstance({ ...i, status: "qr_pending" });
      return;
    }
    if (action === "reconnect") {
      toast.info("Reconectando…");
      await reconnect.mutateAsync(i.id);
      setQrInstance({ ...i, status: "qr_pending" });
      return;
    }
    if (action === "disconnect" || action === "delete-session" || action === "delete") {
      setConfirm({ kind: action, instance: i });
    }
  };

  const runConfirm = async () => {
    if (!confirm.instance || !confirm.kind) return;
    const i = confirm.instance;
    try {
      if (confirm.kind === "disconnect") {
        await disconnect.mutateAsync(i.id);
        toast.success("Instância desconectada");
      } else if (confirm.kind === "delete-session") {
        await deleteSession.mutateAsync(i.id);
        toast.success("Sessão mockada apagada");
      } else if (confirm.kind === "delete") {
        await removeInstance.mutateAsync(i);
        toast.success("Instância removida");
      }
    } finally {
      setConfirm({ kind: null, instance: null });
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Conexões WhatsApp"
        description="Gerencie instâncias conectadas por QR Code e prepare o ambiente para atendimento automatizado."
        actions={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nova instância
          </Button>
        }
      />

      <SummaryCards instances={items} />

      {items.length === 0 ? (
        <Card className="p-10 border-dashed border-border bg-card text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center mb-4">
            <Smartphone className="h-7 w-7 text-primary" />
          </div>
          <h3 className="font-display text-lg font-semibold mb-1">Nenhuma instância criada</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
            Crie sua primeira instância para representar um número WhatsApp. A conexão real via QR Code será habilitada quando o backend Node.js estiver plugado.
          </p>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Criar primeira instância
          </Button>
        </Card>
      ) : (
        <InstancesTable instances={items} onAction={handleAction} />
      )}

      <Card className="mt-5 p-4 bg-card border-border flex items-start gap-3">
        <div className="h-8 w-8 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="text-sm text-muted-foreground">
          <p className="text-foreground font-medium mb-0.5">Uso responsável</p>
          Nenhum disparo em massa, broadcast ou campanha é suportado. Envios futuros via WhatsApp ocorrerão apenas em conversas individuais ou em automações reativas (palavras-chave, fluxos). A integração via WhatsApp Web pode ter instabilidade — use com responsabilidade.
        </div>
      </Card>

      {/* Modais */}
      <NewInstanceDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onSubmit={async ({ name, description, connectNow }) => {
          const inst = await create.mutateAsync({ name, description, connectNow });
          toast.success(`Instância "${name}" criada`);
          if (connectNow) {
            await connect.mutateAsync(inst.id);
            setQrInstance({ ...inst, status: "qr_pending" });
          }
        }}
      />

      <QrConnectDialog
        instance={qrInstance}
        open={!!qrInstance}
        onOpenChange={(v) => !v && setQrInstance(null)}
        onConnected={() => setQrInstance(null)}
      />

      <Sheet open={!!detailsInstance} onOpenChange={(v) => !v && setDetailsInstance(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {detailsInstance && (
            <>
              <SheetHeader>
                <SheetTitle>{detailsInstance.name}</SheetTitle>
                <SheetDescription>{detailsInstance.description ?? "Sem descrição."}</SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-4 text-sm">
                <Field label="Status"><InstanceStatusBadge status={detailsInstance.status} /></Field>
                <Field label="Número conectado">{detailsInstance.connected_phone ?? "—"}</Field>
                <Field label="Sessão salva">{detailsInstance.session_saved ? "Sim" : "Não"}</Field>
                <Field label="Último QR">{detailsInstance.last_qr_at ? new Date(detailsInstance.last_qr_at).toLocaleString("pt-BR") : "—"}</Field>
                <Field label="Última conexão">{detailsInstance.last_seen_at ? new Date(detailsInstance.last_seen_at).toLocaleString("pt-BR") : "—"}</Field>
                <Field label="Última atividade">{detailsInstance.last_activity_at ? new Date(detailsInstance.last_activity_at).toLocaleString("pt-BR") : "—"}</Field>
                {detailsInstance.error_message && (
                  <Field label="Erro">
                    <span className="text-destructive">{detailsInstance.error_message}</span>
                  </Field>
                )}
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Eventos recentes</div>
                  <InstanceLogs instanceId={detailsInstance.id} />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirm.kind} onOpenChange={(v) => !v && setConfirm({ kind: null, instance: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.kind === "disconnect" && "Desconectar instância?"}
              {confirm.kind === "delete-session" && "Apagar sessão mockada?"}
              {confirm.kind === "delete" && "Excluir instância?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.kind === "disconnect" && "A instância ficará offline. A sessão salva pode ser reutilizada ao reconectar."}
              {confirm.kind === "delete-session" && "Isso apagará a sessão mockada desta instância. Será necessário escanear o QR novamente."}
              {confirm.kind === "delete" && "A instância será removida permanentemente. Seus fluxos, contatos e conversas não serão afetados."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={runConfirm}
              className={confirm.kind === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {confirm.kind === "disconnect" && "Desconectar"}
              {confirm.kind === "delete-session" && "Apagar sessão"}
              {confirm.kind === "delete" && "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div>{children}</div>
    </div>
  );
}
