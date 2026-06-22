import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreVertical, Pencil, Trash2, MessagesSquare } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export default function QuickReplies() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ open: boolean; id?: string; shortcut?: string; content?: string; category?: string }>({ open: false });

  const qrs = useQuery({
    queryKey: ["quick_replies", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("quick_replies").select("*").eq("owner_id", user!.id).order("shortcut")).data ?? [],
  });

  const upsert = useMutation({
    mutationFn: async (q: { id?: string; shortcut: string; content: string; category?: string | null }) => {
      if (q.id) await supabase.from("quick_replies").update({ shortcut: q.shortcut, content: q.content, category: q.category ?? null }).eq("id", q.id);
      else await supabase.from("quick_replies").insert({ owner_id: user!.id, shortcut: q.shortcut, content: q.content, category: q.category ?? null });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quick_replies"] }); setDialog({ open: false }); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("quick_replies").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quick_replies"] }),
  });

  return (
    <PageContainer>
      <PageHeader title="Respostas rápidas" description="Use atalhos como /ola na inbox para inserir mensagens prontas." actions={<Button onClick={() => setDialog({ open: true })}><Plus className="h-4 w-4 mr-2" /> Nova resposta</Button>} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(qrs.data ?? []).map((q) => (
          <Card key={q.id} className="p-4 bg-card border-border">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="font-mono text-xs">{q.shortcut}</Badge>
                  {q.category && <Badge variant="outline" className="text-[10px]">{q.category}</Badge>}
                </div>
                <p className="text-sm text-foreground/85 line-clamp-3">{q.content}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setDialog({ open: true, id: q.id, shortcut: q.shortcut, content: q.content, category: q.category ?? undefined })}><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("Excluir?")) del.mutate(q.id); }}><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        ))}
        {(qrs.data ?? []).length === 0 && <Card className="p-8 col-span-full border-dashed text-center text-muted-foreground"><MessagesSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhuma resposta rápida ainda.</Card>}
      </div>
      <QRDialog state={dialog} onClose={() => setDialog({ open: false })} onSave={(s, c, cat) => upsert.mutate({ id: dialog.id, shortcut: s, content: c, category: cat })} />
    </PageContainer>
  );
}

function QRDialog({ state, onClose, onSave }: { state: { open: boolean; id?: string; shortcut?: string; content?: string; category?: string }; onClose: () => void; onSave: (s: string, c: string, cat?: string) => void; }) {
  const [shortcut, setShortcut] = useState(state.shortcut ?? "");
  const [content, setContent] = useState(state.content ?? "");
  const [category, setCategory] = useState(state.category ?? "");
  return (
    <Dialog open={state.open} onOpenChange={(o) => { if (!o) onClose(); else { setShortcut(state.shortcut ?? ""); setContent(state.content ?? ""); setCategory(state.category ?? ""); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{state.id ? "Editar resposta" : "Nova resposta rápida"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Atalho</Label><Input value={shortcut} onChange={(e) => setShortcut(e.target.value)} placeholder="/ola" /></div>
          <div><Label>Categoria (opcional)</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Saudação" /></div>
          <div><Label>Conteúdo</Label><Textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => shortcut.trim() && content.trim() && onSave(shortcut.trim(), content.trim(), category.trim() || undefined)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
