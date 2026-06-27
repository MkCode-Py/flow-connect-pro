import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, MoreVertical, Pencil, Play, Plus, Search, Trash2, Webhook as WebhookIcon, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageContainer, PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AutomationTabs } from "@/features/automation/shared/AutomationTabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

type Webhook = {
  id: string; owner_id: string; name: string; url: string; method: string; event: string;
  headers: Record<string, string>; body: Record<string, unknown>;
  is_active: boolean; last_tested_at: string | null; last_test_result: { success: boolean; mock: boolean; message: string } | null;
  created_at: string; updated_at: string;
};

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const EVENTS: Array<{ value: string; label: string }> = [
  { value: "message.received", label: "Mensagem recebida" },
  { value: "message.sent", label: "Mensagem enviada" },
  { value: "automation.finished", label: "Automação finalizada" },
  { value: "connection.open", label: "Conexão aberta" },
  { value: "connection.closed", label: "Conexão encerrada" },
];

export default function WebhooksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; editing: Webhook | null }>({ open: false, editing: null });
  const [deleting, setDeleting] = useState<Webhook | null>(null);

  const hooksQ = useQuery({
    queryKey: ["webhooks", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Webhook[]> => {
      const { data, error } = await supabase.from("webhooks").select("*").eq("owner_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((h: any) => ({
        ...h,
        headers: (h.headers ?? {}) as Record<string, string>,
        body: (h.body ?? {}) as Record<string, unknown>,
        last_test_result: h.last_test_result ?? null,
      })) as Webhook[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (v: { id?: string; name: string; url: string; method: string; event: string; headers: Record<string, string>; body: Record<string, unknown>; is_active: boolean }) => {
      const payload = { name: v.name.trim(), url: v.url.trim(), method: v.method, event: v.event, headers: v.headers, body: v.body, is_active: v.is_active };
      if (v.id) {
        const { error } = await supabase.from("webhooks").update(payload).eq("id", v.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("webhooks").insert({ ...payload, owner_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["webhooks"] }); setDialog({ open: false, editing: null }); toast({ title: "Webhook salvo" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("webhooks").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("webhooks").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["webhooks"] }); toast({ title: "Webhook excluído" }); },
  });

  const testMock = useMutation({
    mutationFn: async (w: Webhook) => {
      // Não faz request real — apenas registra resultado mock.
      const result = { success: true, mock: true, message: "Webhook simulado com sucesso" };
      const { error } = await supabase
        .from("webhooks")
        .update({ last_tested_at: new Date().toISOString(), last_test_result: result })
        .eq("id", w.id);
      if (error) throw error;
      return result;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["webhooks"] }); toast({ title: "Teste mock executado", description: "Nenhuma requisição real foi enviada." }); },
  });

  const hooks = hooksQ.data ?? [];
  const filtered = useMemo(
    () => hooks.filter((h) => !search || h.name.toLowerCase().includes(search.toLowerCase()) || h.url.toLowerCase().includes(search.toLowerCase())),
    [hooks, search]
  );

  return (
    <PageContainer>
      <PageHeader
        title="Automação"
        description="Cadastre webhooks para notificar sistemas externos. A execução real será feita pelo backend."
        actions={<Button onClick={() => setDialog({ open: true, editing: null })}><Plus className="h-4 w-4 mr-2" /> Novo webhook</Button>}
      />

      <AutomationTabs value="webhooks" />

      <Alert className="mt-4 border-warning/40 bg-warning/5">
        <AlertCircle className="h-4 w-4 text-warning" />
        <AlertTitle>Execução real ainda não está habilitada</AlertTitle>
        <AlertDescription>
          O teste desta tela é apenas mock — nenhuma requisição HTTP é enviada. O disparo real será feito pelo backend Node.js quando os eventos do WhatsApp começarem a fluir.
        </AlertDescription>
      </Alert>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {hooksQ.isLoading ? "Carregando…" : `${filtered.length} webhook${filtered.length === 1 ? "" : "s"}`}
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-8" />
        </div>
      </div>

      <Card className="mt-3 bg-card border-border overflow-hidden">
        {hooksQ.isLoading && <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
        {!hooksQ.isLoading && hooks.length === 0 && (
          <div className="p-12 text-center">
            <WebhookIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/60" />
            <h3 className="font-medium">Nenhum webhook cadastrado</h3>
            <p className="text-sm text-muted-foreground mt-1">Configure um para preparar a integração futura.</p>
            <Button className="mt-4" onClick={() => setDialog({ open: true, editing: null })}><Plus className="h-4 w-4 mr-2" /> Novo webhook</Button>
          </div>
        )}
        {filtered.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead className="w-20">Método</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Último teste</TableHead>
                <TableHead className="w-20 text-center">Ativo</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((w) => (
                <TableRow key={w.id} className="border-border">
                  <TableCell><div className="font-medium text-sm">{w.name}</div></TableCell>
                  <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{EVENTS.find((e) => e.value === w.event)?.label ?? w.event}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] font-mono">{w.method}</Badge></TableCell>
                  <TableCell className="max-w-[260px]"><div className="text-xs font-mono truncate text-muted-foreground">{w.url}</div></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {w.last_tested_at ? (
                      <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> {formatDistanceToNow(new Date(w.last_tested_at), { addSuffix: true, locale: ptBR })}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-center"><Switch checked={w.is_active} onCheckedChange={(v) => toggle.mutate({ id: w.id, is_active: v })} /></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDialog({ open: true, editing: w })}><Pencil className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => testMock.mutate(w)}><Play className="h-4 w-4 mr-2" /> Testar mock</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(w)}><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <WebhookDialog
        open={dialog.open}
        editing={dialog.editing}
        saving={upsert.isPending}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        onSubmit={(v) => upsert.mutate(v)}
        onTestMock={(w) => testMock.mutate(w)}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir webhook?</AlertDialogTitle>
            <AlertDialogDescription>O sistema externo deixará de ser notificado nos eventos selecionados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleting) del.mutate(deleting.id); setDeleting(null); }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

type HeaderRow = { key: string; value: string };

function WebhookDialog({ open, onOpenChange, editing, saving, onSubmit, onTestMock }: {
  open: boolean; onOpenChange: (o: boolean) => void; editing: Webhook | null; saving: boolean;
  onSubmit: (v: { id?: string; name: string; url: string; method: string; event: string; headers: Record<string, string>; body: Record<string, unknown>; is_active: boolean }) => void;
  onTestMock: (w: Webhook) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<string>("POST");
  const [event, setEvent] = useState<string>("message.received");
  const [headers, setHeaders] = useState<HeaderRow[]>([]);
  const [bodyText, setBodyText] = useState("{}");
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [mockResult, setMockResult] = useState<{ success: boolean; mock: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name); setUrl(editing.url); setMethod(editing.method); setEvent(editing.event);
      setHeaders(Object.entries(editing.headers ?? {}).map(([key, value]) => ({ key, value: String(value) })));
      setBodyText(JSON.stringify(editing.body ?? {}, null, 2));
      setActive(editing.is_active);
      setMockResult(editing.last_test_result ?? null);
    } else {
      setName(""); setUrl(""); setMethod("POST"); setEvent("message.received");
      setHeaders([]); setBodyText("{}"); setActive(false); setMockResult(null);
    }
    setBodyError(null);
  }, [open, editing]);

  function parseBody(): Record<string, unknown> | null {
    try {
      const parsed = bodyText.trim() ? JSON.parse(bodyText) : {};
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("O body precisa ser um objeto JSON.");
      setBodyError(null);
      return parsed as Record<string, unknown>;
    } catch (e: any) {
      setBodyError(e.message ?? "JSON inválido");
      return null;
    }
  }

  function submit() {
    const body = parseBody();
    if (body === null) return;
    const headersObj: Record<string, string> = {};
    for (const h of headers) if (h.key.trim()) headersObj[h.key.trim()] = h.value;
    onSubmit({ id: editing?.id, name, url, method, event, headers: headersObj, body, is_active: active });
  }

  function runMock() {
    const result = { success: true, mock: true, message: "Webhook simulado com sucesso" };
    setMockResult(result);
    if (editing) onTestMock(editing);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar webhook" : "Novo webhook"}</DialogTitle>
          <DialogDescription>Nenhuma requisição real é feita nesta tela. O backend Node.js executará os disparos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Notificar CRM" /></div>
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <div>
              <Label>Método</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.exemplo.com/hook" /></div>
          </div>
          <div>
            <Label>Evento</Label>
            <Select value={event} onValueChange={setEvent}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EVENTS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label>Headers</Label>
            <div className="space-y-2">
              {headers.map((h, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input value={h.key} placeholder="Authorization" onChange={(e) => setHeaders((arr) => arr.map((r, idx) => idx === i ? { ...r, key: e.target.value } : r))} />
                  <Input value={h.value} placeholder="Bearer ..." onChange={(e) => setHeaders((arr) => arr.map((r, idx) => idx === i ? { ...r, value: e.target.value } : r))} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setHeaders((arr) => arr.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setHeaders((arr) => [...arr, { key: "", value: "" }])}>+ Adicionar header</Button>
            </div>
          </div>

          <div>
            <Label>Body (JSON)</Label>
            <Textarea rows={6} value={bodyText} onChange={(e) => setBodyText(e.target.value)} className="font-mono text-xs" />
            {bodyError && <p className="text-xs text-destructive mt-1">{bodyError}</p>}
          </div>

          <div className="flex items-center gap-3"><Switch checked={active} onCheckedChange={setActive} /><Label className="cursor-pointer">{active ? "Ativo" : "Inativo"}</Label></div>

          <Card className="p-3 bg-surface-2 border-dashed">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">Testar mock — sem requisição real.</div>
              <Button type="button" variant="outline" size="sm" onClick={runMock}><Play className="h-3.5 w-3.5 mr-1" /> Testar mock</Button>
            </div>
            {mockResult && (
              <pre className="mt-2 bg-background border border-border rounded p-2 text-[11px] font-mono overflow-x-auto">
{JSON.stringify(mockResult, null, 2)}
              </pre>
            )}
          </Card>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={saving || !name.trim() || !url.trim()} onClick={submit}>{saving ? "Salvando..." : editing ? "Salvar" : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
