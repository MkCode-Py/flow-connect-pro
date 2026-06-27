import { useMemo, useState } from "react";
import { FlaskConical, Plus, Search, Sparkles, Zap } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AutomationTabs } from "@/features/automation/shared/AutomationTabs";
import { KeywordDialog } from "../components/KeywordDialog";
import { KeywordTestPanel } from "../components/KeywordTestPanel";
import { KeywordsTable } from "../components/KeywordsTable";
import { useDeleteKeyword, useDuplicateKeyword, useFlowsPicker, useKeywords, useSeedExampleKeywords, useToggleKeyword, useUpsertKeyword } from "../hooks/useKeywords";
import type { KeywordRule } from "../types";

export default function KeywordsPage() {
  const keywordsQ = useKeywords();
  const flowsQ = useFlowsPicker();
  const upsert = useUpsertKeyword();
  const toggle = useToggleKeyword();
  const del = useDeleteKeyword();
  const dup = useDuplicateKeyword();
  const seed = useSeedExampleKeywords();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [flowFilter, setFlowFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KeywordRule | null>(null);
  const [deleting, setDeleting] = useState<KeywordRule | null>(null);
  const [testOpen, setTestOpen] = useState(false);

  const rules = keywordsQ.data ?? [];
  const flows = flowsQ.data ?? [];

  const filtered = useMemo(() => {
    return rules.filter((r) => {
      if (statusFilter === "active" && !r.is_active) return false;
      if (statusFilter === "inactive" && r.is_active) return false;
      if (flowFilter !== "all" && r.flow_id !== flowFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const inName = r.name.toLowerCase().includes(q);
        const inTerms = r.terms.some((t) => t.toLowerCase().includes(q));
        if (!inName && !inTerms) return false;
      }
      return true;
    });
  }, [rules, search, statusFilter, flowFilter]);

  function openCreate() { setEditing(null); setDialogOpen(true); }
  function openEdit(r: KeywordRule) { setEditing(r); setDialogOpen(true); }
  function openTest() { setTestOpen(true); }

  return (
    <PageContainer>
      <PageHeader
        title="Automação"
        description="Configure gatilhos que disparam fluxos quando o contato envia uma mensagem. Automação é sempre reativa — não há disparo em massa."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openTest} disabled={!rules.length}>
              <FlaskConical className="h-4 w-4 mr-2" /> Testar mensagem
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Nova palavra-chave
            </Button>
          </div>
        }
      />

      <AutomationTabs value="keywords" />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {keywordsQ.isLoading ? "Carregando…" : `${filtered.length} de ${rules.length} regra${rules.length === 1 ? "" : "s"}`}
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="inactive">Inativas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={flowFilter} onValueChange={setFlowFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os fluxos</SelectItem>
              {flows.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome ou termo..." className="pl-8" />
          </div>
        </div>
      </div>

      <Card className="mt-3 bg-card border-border overflow-hidden">
        {keywordsQ.isLoading && (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        )}

        {keywordsQ.isError && (
          <div className="p-8 text-center text-sm text-destructive">
            Não foi possível carregar suas palavras-chave. Tente novamente em instantes.
          </div>
        )}

        {!keywordsQ.isLoading && !keywordsQ.isError && rules.length === 0 && (
          <div className="p-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
              <Zap className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-medium">Crie sua primeira palavra-chave</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Quando o cliente digitar termos como "preço", "pix" ou "pedido", o fluxo vinculado é iniciado automaticamente.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Nova palavra-chave</Button>
              {flows.length > 0 && (
                <Button variant="outline" onClick={() => seed.mutate(flows[0].id)} disabled={seed.isPending}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {seed.isPending ? "Criando..." : "Inserir 4 exemplos"}
                </Button>
              )}
            </div>
            {flows.length === 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                Crie um fluxo em <strong>Fluxos</strong> antes de cadastrar regras.
              </p>
            )}
          </div>
        )}

        {!keywordsQ.isLoading && rules.length > 0 && filtered.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Nenhum resultado para os filtros aplicados.
          </div>
        )}

        {filtered.length > 0 && (
          <KeywordsTable
            rules={filtered}
            flows={flows}
            onEdit={openEdit}
            onDuplicate={(r) => dup.mutate(r)}
            onDelete={(r) => setDeleting(r)}
            onToggle={(r, v) => toggle.mutate({ id: r.id, is_active: v })}
            onTest={() => openTest()}
          />
        )}
      </Card>

      <KeywordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        flows={flows}
        saving={upsert.isPending}
        onSubmit={(values) => upsert.mutate(values, { onSuccess: () => setDialogOpen(false) })}
      />

      <KeywordTestPanel open={testOpen} onOpenChange={setTestOpen} rules={rules} flows={flows} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir palavra-chave?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta regra deixará de iniciar fluxos automaticamente. O fluxo vinculado <strong>não</strong> será excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleting) del.mutate(deleting.id);
                setDeleting(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
