import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw, CheckCircle2, Smartphone, ShieldAlert } from "lucide-react";
import { whatsapp } from "@/integrations/whatsapp";
import { useRegenerateQr, useSimulateConnection, useUpdateLastQr } from "../hooks/useInstances";
import type { WAInstance } from "../types";
import { InstanceStatusBadge } from "./InstanceStatusBadge";
import { toast } from "sonner";

export function QrConnectDialog({
  instance, open, onOpenChange, onConnected,
}: {
  instance: WAInstance | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConnected: (instanceId: string, phone: string) => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());
  const regen = useRegenerateQr();
  const simulate = useSimulateConnection();
  const updateLastQr = useUpdateLastQr();
  const generatedFor = useRef<string | null>(null);

  // Generate first QR on open
  useEffect(() => {
    if (!open || !instance) {
      setQr(null); setExpiresAt(null); setDataUrl(null); generatedFor.current = null;
      return;
    }
    if (generatedFor.current === instance.id) return;
    generatedFor.current = instance.id;
    (async () => {
      const res = await regen.mutateAsync(instance.id);
      setQr(res.qr);
      setExpiresAt(res.expiresAt);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, instance?.id]);

  // Render QR as PNG dataURL
  useEffect(() => {
    if (!qr) return;
    QRCode.toDataURL(qr, { width: 260, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [qr]);

  // Persist last_qr (debounced via mutation queue)
  useEffect(() => {
    if (qr && instance) updateLastQr.mutate({ id: instance.id, qr });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qr]);

  // Tick + auto-regenerate on expiry
  useEffect(() => {
    if (!open || !instance) return;
    const t = setInterval(async () => {
      setNow(new Date());
      if (expiresAt && expiresAt.getTime() <= Date.now()) {
        const res = await whatsapp.generateQrCode(instance.id);
        setQr(res.qr);
        setExpiresAt(res.expiresAt);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [open, instance, expiresAt]);

  const secondsLeft = useMemo(
    () => (expiresAt ? Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / 1000)) : 0),
    [expiresAt, now],
  );

  if (!instance) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Conectar meu WhatsApp
          </DialogTitle>
          <DialogDescription>
            Aponte a câmera do seu celular para o QR Code abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between text-sm">
          <div>
            <div className="font-medium">{instance.name}</div>
            {instance.description && <div className="text-xs text-muted-foreground">{instance.description}</div>}
          </div>
          <InstanceStatusBadge status={instance.status} />
        </div>

        <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
          <li>Abra o WhatsApp no seu celular.</li>
          <li>Toque em <strong>Aparelhos conectados</strong>.</li>
          <li>Toque em <strong>Conectar um aparelho</strong>.</li>
          <li>Aponte a câmera para o QR Code abaixo.</li>
        </ol>

        <div className="flex flex-col items-center gap-3 py-2">
          <div className="bg-white p-3 rounded-xl shadow-sm relative">
            {dataUrl ? (
              <img src={dataUrl} alt="QR Code mockado" width={240} height={240} className="block" />
            ) : (
              <div className="h-[240px] w-[240px] animate-pulse bg-muted rounded" />
            )}
          </div>
          <div className="text-xs text-muted-foreground">Novo QR em <span className="font-mono text-foreground">{secondsLeft}s</span></div>
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1.5">
            <ShieldAlert className="h-3 w-3" />
            QR de demonstração — modo mock
          </Badge>
          <p className="text-[11px] text-muted-foreground text-center max-w-xs">
            Nesta versão, o QR Code é mockado. A conexão real será implementada depois no backend Node.js (Baileys / whatsapp-web.js).
          </p>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                const res = await regen.mutateAsync(instance.id);
                setQr(res.qr); setExpiresAt(res.expiresAt);
                toast.success("Novo QR gerado");
              }}
              disabled={regen.isPending}
            >
              <RefreshCcw className="h-4 w-4 mr-1.5" /> Gerar novo QR
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          </div>
          <Button
            onClick={async () => {
              const phone = await simulate.mutateAsync(instance.id);
              toast.success("Instância conectada em modo mock.");
              onConnected(instance.id, phone);
              onOpenChange(false);
            }}
            disabled={simulate.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Simular conexão bem-sucedida
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
