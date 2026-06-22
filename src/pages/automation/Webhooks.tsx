import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Webhook as WebhookIcon } from "lucide-react";
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

export default function Webhooks() {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("POST");
  const [event, setEvent] = useState("message.received");

  const hooks = useQuery({
    queryKey: ["webhooks", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("webhooks").select("*").eq("owner_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });
  const create = useMutation({
    mutationFn: async () => { await supabase.from("webhooks").insert({ owner_id: user!.id, name, url, method, event, is_active: false }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["webhooks"] }); setDialog(false); setName(""); setUrl(""); },
  });
  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => { await supabase.from("webhooks").update({ is_active }).eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("webhooks").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  return (
    <PageContainer>
      <PageHeader title="Automação" description="Webhooks notificam sistemas externos. Os disparos reais serão feitos pelo backend." actions={<Button onClick={() => setDialog(true)}><Plus className="h-4 w-4 mr-2" /> Novo webhook</Button>} />
      <Tabs value="webhooks" onValueChange={(v) => nav(`/automation/${v}`)}>
        <TabsList>
          <TabsTrigger value="keywords">Palavras-chave</TabsTrigger>
          <TabsTrigger value="sequences">Sequências</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {(hooks.data ?? []).map((w) => (
          <Card key={w.id} className="p-4 bg-card border-border flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2"><Badge variant="outline" className="text-[10px]">{w.method}</Badge><div className="font-medium truncate">{w.name}</div></div>
              <div className="text-xs text-muted-foreground mt-1 truncate font-mono">{w.url}</div>
              <Badge variant="outline" className="mt-2 text-[10px]">Evento: {w.event}</Badge>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Switch checked={w.is_active} onCheckedChange={(v) => toggle.mutate({ id: w.id, is_active: v })} />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Excluir?")) del.mutate(w.id); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </Card>
        ))}
        {(hooks.data ?? []).length === 0 && <Card className="p-8 col-span-full border-dashed text-center text-muted-foreground"><WebhookIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhum webhook configurado.</Card>}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo webhook</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." /></div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Método</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["GET", "POST", "PUT", "DELETE"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Evento</Label>
                <Select value={event} onValueChange={setEvent}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="message.received">Mensagem recebida</SelectItem>
                    <SelectItem value="message.sent">Mensagem enviada</SelectItem>
                    <SelectItem value="automation.finished">Automação finalizada</SelectItem>
                    <SelectItem value="connection.open">Conexão aberta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button onClick={() => name.trim() && url.trim() && create.mutate()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
