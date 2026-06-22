import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export default function Sequences() {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [name, setName] = useState("");
  const [flowId, setFlowId] = useState<string>("");
  const [minutes, setMinutes] = useState(60);

  const seqs = useQuery({
    queryKey: ["sequences", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("sequences").select("*").eq("owner_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });
  const flows = useQuery({
    queryKey: ["flows-pick-seq", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("flows").select("id,name").eq("owner_id", user!.id).order("name")).data ?? [],
  });
  const create = useMutation({
    mutationFn: async () => {
      await supabase.from("sequences").insert({ owner_id: user!.id, name, flow_id: flowId || null, interval_minutes: minutes, is_active: false });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sequences"] }); setDialog(false); setName(""); setFlowId(""); setMinutes(60); },
  });
  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => { await supabase.from("sequences").update({ is_active }).eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("sequences").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });

  return (
    <PageContainer>
      <PageHeader title="Automação" description="Sequências disparam fluxos em intervalos definidos. Execução real será habilitada pelo backend." actions={<Button onClick={() => setDialog(true)}><Plus className="h-4 w-4 mr-2" /> Nova sequência</Button>} />
      <Tabs value="sequences" onValueChange={(v) => nav(`/automation/${v}`)}>
        <TabsList>
          <TabsTrigger value="keywords">Palavras-chave</TabsTrigger>
          <TabsTrigger value="sequences">Sequências</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {(seqs.data ?? []).map((s) => {
          const f = (flows.data ?? []).find((x) => x.id === s.flow_id);
          return (
            <Card key={s.id} className="p-4 bg-card border-border flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Fluxo: {f?.name ?? "—"} · Intervalo: {s.interval_minutes} min</div>
                <Badge variant="outline" className="mt-2 text-[10px]">Execução real virá do backend</Badge>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={s.is_active} onCheckedChange={(v) => toggle.mutate({ id: s.id, is_active: v })} />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Excluir?")) del.mutate(s.id); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          );
        })}
        {(seqs.data ?? []).length === 0 && <Card className="p-8 col-span-full border-dashed text-center text-muted-foreground"><Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhuma sequência ainda.</Card>}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova sequência</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div>
              <Label>Fluxo</Label>
              <Select value={flowId || "none"} onValueChange={(v) => setFlowId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem fluxo</SelectItem>
                  {(flows.data ?? []).map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Intervalo (minutos)</Label><Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={() => name.trim() && create.mutate()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
