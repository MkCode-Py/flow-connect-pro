import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreVertical, Pencil, Trash2, X, Zap } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

type Kw = {
  id: string; name: string; flow_id: string | null;
  match_rule: "contains" | "starts_with" | "exact"; terms: string[];
  is_active: boolean; executions: number;
};

const RULE_LABEL = { contains: "Contém", starts_with: "Começa com", exact: "É exatamente" } as const;

export default function Keywords() {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState("keywords");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; kw?: Kw | null }>({ open: false });

  const keywords = useQuery({
    queryKey: ["keywords", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("keywords").select("*").eq("owner_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Kw[];
    },
  });

  const flows = useQuery({
    queryKey: ["flows-pick-kw", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("flows").select("id,name").eq("owner_id", user!.id).order("name")).data ?? [],
  });

  const upsert = useMutation({
    mutationFn: async (kw: Partial<Kw> & { id?: string }) => {
      if (kw.id) {
        const { error } = await supabase.from("keywords").update({
          name: kw.name, flow_id: kw.flow_id, match_rule: kw.match_rule, terms: kw.terms, is_active: kw.is_active,
        }).eq("id", kw.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("keywords").insert({
          owner_id: user!.id, name: kw.name!, flow_id: kw.flow_id ?? null,
          match_rule: kw.match_rule ?? "contains", terms: kw.terms ?? [], is_active: kw.is_active ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["keywords"] }); setDialog({ open: false }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("keywords").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["keywords"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("keywords").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["keywords"] }),
  });

  const filtered = (keywords.data ?? []).filter((k) => !query || k.name.toLowerCase().includes(query.toLowerCase()) || k.terms.some((t) => t.toLowerCase().includes(query.toLowerCase())));

  return (
    <PageContainer>
      <PageHeader
        title="Automação"
        description="Configure gatilhos que disparam fluxos quando o contato envia uma mensagem."
        actions={<Button onClick={() => setDialog({ open: true, kw: null })}><Plus className="h-4 w-4 mr-2" /> Criar palavra-chave</Button>}
      />

      <Tabs value={tab} onValueChange={(v) => { setTab(v); if (v !== "keywords") nav(`/automation/${v}`); }}>
        <TabsList>
          <TabsTrigger value="keywords">Palavras-chave</TabsTrigger>
          <TabsTrigger value="sequences">Sequências</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">{filtered.length} palavra{filtered.length === 1 ? "" : "s"}-chave</div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar..." className="pl-8" />
        </div>
      </div>

      <Card className="mt-3 bg-card border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Iniciar fluxo</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead className="text-center">Execuções</TableHead>
              <TableHead className="w-20" />
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Crie uma palavra-chave para disparar um fluxo quando o contato escrever algo específico.
              </TableCell></TableRow>
            )}
            {filtered.map((k) => {
              const flow = (flows.data ?? []).find((f) => f.id === k.flow_id);
              return (
                <TableRow key={k.id} className="border-border">
                  <TableCell>
                    <div className="font-medium">{k.name}</div>
                    <div className="text-xs text-muted-foreground">{flow ? `→ ${flow.name}` : "Sem fluxo vinculado"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">{RULE_LABEL[k.match_rule]}</Badge>
                      {k.terms.map((t) => (<Badge key={t} variant="secondary" className="text-[11px] bg-accent/10 text-accent border-accent/20">{t}</Badge>))}
                      {k.terms.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground tabular-nums">{k.executions}</TableCell>
                  <TableCell><Switch checked={k.is_active} onCheckedChange={(v) => toggle.mutate({ id: k.id, is_active: v })} /></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDialog({ open: true, kw: k })}><Pencil className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("Excluir?")) del.mutate(k.id); }}><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <KeywordDialog
        open={dialog.open}
        kw={dialog.kw}
        flows={flows.data ?? []}
        onOpenChange={(o) => setDialog({ open: o })}
        onSave={(kw) => upsert.mutate(kw)}
      />
    </PageContainer>
  );
}

function KeywordDialog({ open, onOpenChange, kw, flows, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void; kw?: Kw | null;
  flows: Array<{ id: string; name: string }>;
  onSave: (k: Partial<Kw> & { id?: string }) => void;
}) {
  const [name, setName] = useState("");
  const [flowId, setFlowId] = useState<string>("");
  const [rule, setRule] = useState<Kw["match_rule"]>("contains");
  const [terms, setTerms] = useState<string[]>([]);
  const [termInput, setTermInput] = useState("");
  const [active, setActive] = useState(true);

  function reset(k?: Kw | null) {
    setName(k?.name ?? "");
    setFlowId(k?.flow_id ?? "");
    setRule(k?.match_rule ?? "contains");
    setTerms(k?.terms ?? []);
    setTermInput("");
    setActive(k?.is_active ?? true);
  }

  function addTerm() {
    const t = termInput.trim();
    if (!t) return;
    if (!terms.includes(t)) setTerms([...terms, t]);
    setTermInput("");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (o) reset(kw); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{kw ? "Editar palavra-chave" : "Nova palavra-chave"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Pagamento Pix" />
          </div>
          <div>
            <Label>Fluxo a disparar</Label>
            <Select value={flowId || "none"} onValueChange={(v) => setFlowId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem fluxo</SelectItem>
                {flows.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Regra de correspondência</Label>
            <Select value={rule} onValueChange={(v) => setRule(v as Kw["match_rule"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contém</SelectItem>
                <SelectItem value="starts_with">Começa com</SelectItem>
                <SelectItem value="exact">É exatamente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Palavras / frases</Label>
            <div className="flex gap-2">
              <Input value={termInput} onChange={(e) => setTermInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTerm())} placeholder="ex: pix, pagamento, preço" />
              <Button type="button" variant="outline" onClick={addTerm}>Adicionar</Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {terms.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1">{t}<button type="button" onClick={() => setTerms(terms.filter((x) => x !== t))}><X className="h-3 w-3" /></button></Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} />
            <Label className="cursor-pointer">Ativo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave({ id: kw?.id, name, flow_id: flowId || null, match_rule: rule, terms, is_active: active })}>{kw ? "Salvar" : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
