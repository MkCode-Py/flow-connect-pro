import { useEffect, useMemo, useState } from "react";
import { Plus, MoreVertical, Pencil, Trash2, MessagesSquare, Search, Copy, Power, PowerOff } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuickReplies, useUpsertQuickReply, useDeleteQuickReply, useDuplicateQuickReply, useToggleQuickReplyActive, type QuickReply } from "../hooks/useQuickReplies";
import { resolveContactVariables, AVAILABLE_VARIABLES } from "@/lib/contactVariables";

const SAMPLE_CONTACT = { name: "João Silva", phone: "5511987654321", email: "joao@exemplo.com", company: "Loja do João", custom_fields: { plano: "premium" } };

export default function QuickRepliesPage() {
  const list = useQuickReplies();
  const upsert = useUpsertQuickReply();
  const del = useDeleteQuickReply();
  const dup = useDuplicateQuickReply();
  const toggle = useToggleQuickReplyActive();

  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("__all__");
  const [dialog, setDialog] = useState<{ open: boolean; editing?: QuickReply }>({ open: false });

  const categories = useMemo(() => {
    const set = new Set<string>();
    (list.data ?? []).forEach((q) => q.category && set.add(q.category));
    return Array.from(set).sort();
  }, [list.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (list.data ?? []).filter((r) => {
      if (catFilter !== "__all__" && r.category !== catFilter) return false;
      if (!q) return true;
      return (
        r.shortcut.toLowerCase().includes(q) ||
        (r.title ?? "").toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q)
      );
    });
  }, [list.data, query, catFilter]);

  return (
    <PageContainer>
      <PageHeader
        title="Respostas rápidas"
        description="Atalhos como /pix ou /preco que o atendente usa na inbox. Suportam variáveis do contato."
        actions={
          <Button onClick={() => setDialog({ open: true })}>
            <Plus className="h-4 w-4 mr-1.5" /> Nova resposta
          </Button>
        }
      />

      <Card className="bg-card border-border p-3 flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por atalho, título ou conteúdo..." className="pl-8 h-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="h-9 md:w-56"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as categorias</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <Card className="bg-card border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Atalho</TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="hidden md:table-cell">Categoria</TableHead>
              <TableHead>Conteúdo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Última alteração</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.isLoading && <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!list.isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <MessagesSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Nenhuma resposta rápida.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((q) => (
              <TableRow key={q.id} className="border-border">
                <TableCell><Badge variant="secondary" className="font-mono text-xs">{q.shortcut}</Badge></TableCell>
                <TableCell className="font-medium">{q.title || "—"}</TableCell>
                <TableCell className="hidden md:table-cell">{q.category ? <Badge variant="outline" className="text-[10px]">{q.category}</Badge> : "—"}</TableCell>
                <TableCell className="text-muted-foreground text-xs max-w-[320px] truncate">{q.content}</TableCell>
                <TableCell>
                  <Switch checked={q.is_active} onCheckedChange={(v) => toggle.mutate({ id: q.id, is_active: v })} />
                </TableCell>
                <TableCell className="text-muted-foreground text-xs hidden lg:table-cell">
                  {format(new Date(q.updated_at ?? q.created_at), "dd/MM HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDialog({ open: true, editing: q })}><Pencil className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => dup.mutate(q)}><Copy className="h-4 w-4 mr-2" /> Duplicar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggle.mutate({ id: q.id, is_active: !q.is_active })}>
                        {q.is_active ? <PowerOff className="h-4 w-4 mr-2" /> : <Power className="h-4 w-4 mr-2" />}
                        {q.is_active ? "Desativar" : "Ativar"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => { if (confirm("Excluir resposta rápida?")) del.mutate(q.id); }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <QRDialog
        state={dialog}
        onClose={() => setDialog({ open: false })}
        onSave={(values) => upsert.mutateAsync({ id: dialog.editing?.id, ...values }).then(() => setDialog({ open: false }))}
      />
    </PageContainer>
  );
}

function QRDialog({
  state,
  onClose,
  onSave,
}: {
  state: { open: boolean; editing?: QuickReply };
  onClose: () => void;
  onSave: (values: { shortcut: string; title: string | null; category: string | null; content: string; is_active: boolean }) => Promise<unknown>;
}) {
  const e = state.editing;
  const [shortcut, setShortcut] = useState(e?.shortcut ?? "/");
  const [title, setTitle] = useState(e?.title ?? "");
  const [category, setCategory] = useState(e?.category ?? "");
  const [content, setContent] = useState(e?.content ?? "");
  const [isActive, setIsActive] = useState(e?.is_active ?? true);

  useEffect(() => {
    if (state.open) {
      setShortcut(e?.shortcut ?? "/");
      setTitle(e?.title ?? "");
      setCategory(e?.category ?? "");
      setContent(e?.content ?? "");
      setIsActive(e?.is_active ?? true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, e?.id]);

  const preview = resolveContactVariables(content, SAMPLE_CONTACT);

  return (
    <Dialog open={state.open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{e ? "Editar resposta rápida" : "Nova resposta rápida"}</DialogTitle>
          <DialogDescription>Use variáveis como {"{{primeiro_nome}}"} para personalizar o texto enviado.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Atalho</Label>
              <Input value={shortcut} onChange={(ev) => setShortcut(ev.target.value)} placeholder="/pix" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={category} onChange={(ev) => setCategory(ev.target.value)} placeholder="Pagamento" />
            </div>
          </div>
          <div>
            <Label>Título (interno)</Label>
            <Input value={title} onChange={(ev) => setTitle(ev.target.value)} placeholder="Pagamento por Pix" />
          </div>
          <div>
            <Label>Conteúdo</Label>
            <Textarea rows={5} value={content} onChange={(ev) => setContent(ev.target.value)} placeholder="Olá {{primeiro_nome}}, segue a tabela..." />
            <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-1">
              {AVAILABLE_VARIABLES.map((v) => (
                <button
                  key={v.token}
                  type="button"
                  className="px-1.5 py-0.5 rounded border border-border bg-surface-2 hover:bg-surface-3 font-mono"
                  onClick={() => setContent((c) => (c + " " + v.token).trim())}
                >{v.token}</button>
              ))}
            </div>
          </div>
          <div className="bg-surface-2 border border-border rounded p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Pré-visualização</div>
            <p className="text-sm whitespace-pre-wrap">{preview || <span className="text-muted-foreground">Digite o conteúdo acima...</span>}</p>
          </div>
          <div className="flex items-center justify-between border border-border rounded-lg px-3 py-2 surface-2">
            <Label>Ativa</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave({ shortcut, title: title.trim() || null, category: category.trim() || null, content, is_active: isActive })}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
