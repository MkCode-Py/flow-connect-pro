import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, MoreVertical, Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react";
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

type Sequence = {
  id: string; owner_id: string; name: string; flow_id: string | null;
  interval_minutes: number; is_active: boolean; executions: number;
  notes: string | null; created_at: string; updated_at: string;
};

type Unit = "minutes" | "hours" | "days";

function decomposeInterval(totalMin: number): { value: number; unit: Unit } {
  if (totalMin % 1440 === 0) return { value: totalMin / 1440, unit: "days" };
  if (totalMin % 60 === 0) return { value: totalMin / 60, unit: "hours" };
  return { value: totalMin, unit: "minutes" };
}
function composeInterval(value: number, unit: Unit): number {
  if (unit === "days") return value * 1440;
  if (unit === "hours") return value * 60;
  return value;
}
function formatInterval(min: number) {
  const { value, unit } = decomposeInterval(min);
  const label = unit === "days" ? "dia" : unit === "hours" ? "hora" : "minuto";
  return `${value} ${label}${value === 1 ? "" : "s"}`;
}

export default function SequencesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; editing: Sequence | null }>({ open: false, editing: null });
  const [deleting, setDeleting] = useState<Sequence | null>(null);

  const seqsQ = useQuery({
    queryKey: ["sequences", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Sequence[]> => {
      const { data, error } = await supabase
        .from("sequences")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Sequence[];
    },
  });
  const flowsQ = useQuery({
    queryKey: ["flows-picker", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("flows").select("id,name").eq("owner_id", user!.id).order("name")).data ?? [],
  });

  const upsert = useMutation({
    mutationFn: async (values: { id?: string; name: string; flow_id: string | null; interval_minutes: number; is_active: boolean; notes: string }) => {
      const payload = {
        name: values.name.trim(),
        flow_id: values.flow_id,
        interval_minutes: values.interval_minutes,
        is_active: values.is_active,
        notes: values.notes.trim() || null,
      };
      if (values.id) {
        const { error } = await supabase.from("sequences").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sequences").insert({ ...payload, owner_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sequences"] }); setDialog({ open: false, editing: null }); toast({ title: "Sequência salva" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("sequences").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("sequences").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sequences"] }); toast({ title: "Sequência excluída" }); },
  });

  const seqs = seqsQ.data ?? [];
  const flows = flowsQ.data ?? [];
  const filtered = useMemo(
    () => seqs.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase())),
    [seqs, search]
  );

  return (
    <PageContainer>
      <PageHeader
        title="Automação"
        description="Sequências disparam um fluxo após um intervalo configurado. Apenas configuração — execução real virá do backend."
        actions={<Button onClick={() => setDialog({ open: true, editing: null })}><Plus className="h-4 w-4 mr-2" /> Nova sequência</Button>}
      />

      <AutomationTabs value="sequences" />

      <Alert className="mt-4 border-warning/40 bg-warning/5">
        <AlertCircle className="h-4 w-4 text-warning" />
        <AlertTitle>Execução real ainda não está habilitada</AlertTitle>
        <AlertDescription>
          Nesta versão, a tela apenas cadastra a configuração. O agendamento será executado pelo backend Node.js quando o WhatsApp real estiver conectado. Não há disparo em massa nem broadcast.
        </AlertDescription>
      </Alert>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {seqsQ.isLoading ? "Carregando…" : `${filtered.length} sequência${filtered.length === 1 ? "" : "s"}`}
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-8" />
        </div>
      </div>

      <Card className="mt-3 bg-card border-border overflow-hidden">
        {seqsQ.isLoading && <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
        {!seqsQ.isLoading && seqs.length === 0 && (
          <div className="p-12 text-center">
            <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/60" />
            <h3 className="font-medium">Nenhuma sequência cadastrada</h3>
            <p className="text-sm text-muted-foreground mt-1">Crie uma para preparar a configuração futura.</p>
            <Button className="mt-4" onClick={() => setDialog({ open: true, editing: null })}><Plus className="h-4 w-4 mr-2" /> Nova sequência</Button>
          </div>
        )}
        {filtered.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead>Fluxo vinculado</TableHead>
                <TableHead>Intervalo</TableHead>
                <TableHead className="text-center">Execuções</TableHead>
                <TableHead>Atualizada</TableHead>
                <TableHead className="w-20 text-center">Ativa</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => {
                const flow = flows.find((f) => f.id === s.flow_id);
                return (
                  <TableRow key={s.id} className="border-border">
                    <TableCell><div className="font-medium text-sm">{s.name}</div></TableCell>
                    <TableCell className="text-sm">{flow?.name ?? <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">Sem fluxo</Badge>}</TableCell>
                    <TableCell className="text-sm">{formatInterval(s.interval_minutes)}</TableCell>
                    <TableCell className="text-center tabular-nums text-sm">{s.executions}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(s.updated_at), { addSuffix: true, locale: ptBR })}</TableCell>
                    <TableCell className="text-center"><Switch checked={s.is_active} onCheckedChange={(v) => toggle.mutate({ id: s.id, is_active: v })} /></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDialog({ open: true, editing: s })}><Pencil className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(s)}><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <SequenceDialog
        open={dialog.open}
        editing={dialog.editing}
        flows={flows}
        saving={upsert.isPending}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        onSubmit={(v) => upsert.mutate(v)}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sequência?</AlertDialogTitle>
            <AlertDialogDescription>O fluxo vinculado não será excluído.</AlertDialogDescription>
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

function SequenceDialog({ open, onOpenChange, editing, flows, saving, onSubmit }: {
  open: boolean; onOpenChange: (o: boolean) => void; editing: Sequence | null;
  flows: Array<{ id: string; name: string }>; saving: boolean;
  onSubmit: (v: { id?: string; name: string; flow_id: string | null; interval_minutes: number; is_active: boolean; notes: string }) => void;
}) {
  const [name, setName] = useState("");
  const [flowId, setFlowId] = useState<string>("");
  const [value, setValue] = useState(1);
  const [unit, setUnit] = useState<Unit>("hours");
  const [active, setActive] = useState(false);
  const [notes, setNotes] = useState("");

  useMemo(() => {
    if (!open) return;
    if (editing) {
      const { value: v, unit: u } = decomposeInterval(editing.interval_minutes);
      setName(editing.name); setFlowId(editing.flow_id ?? ""); setValue(v); setUnit(u);
      setActive(editing.is_active); setNotes(editing.notes ?? "");
    } else {
      setName(""); setFlowId(""); setValue(1); setUnit("hours"); setActive(false); setNotes("");
    }
  }, [open, editing]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar sequência" : "Nova sequência"}</DialogTitle>
          <DialogDescription>Configure um disparo agendado de fluxo. A execução real será feita pelo backend.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Pós-venda 24h" /></div>
          <div>
            <Label>Fluxo vinculado</Label>
            <Select value={flowId || ""} onValueChange={setFlowId}>
              <SelectTrigger><SelectValue placeholder="Selecione um fluxo" /></SelectTrigger>
              <SelectContent>{flows.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-[1fr_140px] gap-2">
            <div><Label>Intervalo</Label><Input type="number" min={1} value={value} onChange={(e) => setValue(Math.max(1, Number(e.target.value) || 1))} /></div>
            <div>
              <Label>Unidade</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as Unit)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutos</SelectItem>
                  <SelectItem value="hours">Horas</SelectItem>
                  <SelectItem value="days">Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3"><Switch checked={active} onCheckedChange={setActive} /><Label className="cursor-pointer">{active ? "Ativa" : "Inativa"}</Label></div>
          <div><Label>Observação interna</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={saving || !name.trim() || !flowId}
            onClick={() => onSubmit({ id: editing?.id, name, flow_id: flowId || null, interval_minutes: composeInterval(value, unit), is_active: active, notes })}
          >
            {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
