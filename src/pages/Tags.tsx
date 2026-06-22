import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreVertical, Pencil, Trash2, Tag as TagIcon } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#ef4444", "#f59e0b", "#06b6d4", "#ec4899"];

export default function Tags() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ open: boolean; id?: string; name?: string; color?: string }>({ open: false });

  const tags = useQuery({
    queryKey: ["tags", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("tags").select("*").eq("owner_id", user!.id).order("name")).data ?? [],
  });

  const upsert = useMutation({
    mutationFn: async ({ id, name, color }: { id?: string; name: string; color: string }) => {
      if (id) await supabase.from("tags").update({ name, color }).eq("id", id);
      else await supabase.from("tags").insert({ owner_id: user!.id, name, color });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tags"] }); setDialog({ open: false }); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("tags").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });

  return (
    <PageContainer>
      <PageHeader title="Etiquetas" description="Usadas em contatos, condições e ações de fluxo." actions={<Button onClick={() => setDialog({ open: true })}><Plus className="h-4 w-4 mr-2" /> Nova etiqueta</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(tags.data ?? []).map((t) => (
          <Card key={t.id} className="p-4 bg-card border-border flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: `${t.color}33`, color: t.color }}><TagIcon className="h-4 w-4" /></span>
              <span className="font-medium truncate">{t.name}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDialog({ open: true, id: t.id, name: t.name, color: t.color })}><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("Excluir?")) del.mutate(t.id); }}><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Card>
        ))}
        {(tags.data ?? []).length === 0 && <Card className="p-8 col-span-full border-dashed text-center text-muted-foreground">Nenhuma etiqueta ainda.</Card>}
      </div>
      <TagDialog state={dialog} onClose={() => setDialog({ open: false })} onSave={(name, color) => upsert.mutate({ id: dialog.id, name, color })} />
    </PageContainer>
  );
}

function TagDialog({ state, onClose, onSave }: { state: { open: boolean; id?: string; name?: string; color?: string }; onClose: () => void; onSave: (name: string, color: string) => void; }) {
  const [name, setName] = useState(state.name ?? "");
  const [color, setColor] = useState(state.color ?? COLORS[0]);
  return (
    <Dialog open={state.open} onOpenChange={(o) => { if (!o) onClose(); else { setName(state.name ?? ""); setColor(state.color ?? COLORS[0]); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{state.id ? "Editar etiqueta" : "Nova etiqueta"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div>
            <Label>Cor</Label>
            <div className="flex gap-2 mt-1">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} className={`h-8 w-8 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-offset-card ring-foreground" : ""}`} style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => name.trim() && onSave(name.trim(), color)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
