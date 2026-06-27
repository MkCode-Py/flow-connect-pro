import { useMemo, useState } from "react";
import { Plus, MoreVertical, Pencil, Trash2, Tag as TagIcon, Search } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTagsWithCount, useUpsertTag, useDeleteTag } from "../hooks/useTagsCrud";

const COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#ef4444", "#f59e0b", "#06b6d4", "#ec4899", "#84cc16"];

export default function TagsPage() {
  const tags = useTagsWithCount();
  const upsert = useUpsertTag();
  const del = useDeleteTag();

  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; id?: string; name?: string; color?: string }>({ open: false });
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string; count: number } | null>(null);

  const filtered = useMemo(
    () => (tags.data ?? []).filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase())),
    [tags.data, query],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Etiquetas"
        description="Use etiquetas em contatos, condições e ações de fluxo."
        actions={
          <Button onClick={() => setDialog({ open: true })}>
            <Plus className="h-4 w-4 mr-1.5" /> Nova etiqueta
          </Button>
        }
      />

      <Card className="bg-card border-border p-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar etiqueta..." className="pl-8 h-9" />
        </div>
      </Card>

      <Card className="bg-card border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Nome</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead>Contatos</TableHead>
              <TableHead className="hidden md:table-cell">Última alteração</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.isLoading && <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!tags.isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <TagIcon className="h-8 w-8 mx-auto mb-2 opacity-50" /> Nenhuma etiqueta.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((t) => (
              <TableRow key={t.id} className="border-border">
                <TableCell>
                  <span
                    className="text-xs px-2 py-0.5 rounded-md border inline-flex items-center gap-1.5 font-medium"
                    style={{ background: `${t.color}1a`, color: t.color, borderColor: `${t.color}55` }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: t.color }} /> {t.name}
                  </span>
                </TableCell>
                <TableCell><span className="text-xs text-muted-foreground font-mono">{t.color}</span></TableCell>
                <TableCell><span className="text-sm">{t.contacts_count}</span></TableCell>
                <TableCell className="text-muted-foreground text-xs hidden md:table-cell">
                  {format(new Date(t.updated_at ?? t.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDialog({ open: true, id: t.id, name: t.name, color: t.color })}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          if (t.contacts_count > 0) setConfirmDel({ id: t.id, name: t.name, count: t.contacts_count });
                          else del.mutate(t.id);
                        }}
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

      <TagDialog
        state={dialog}
        onClose={() => setDialog({ open: false })}
        onSave={async (name, color) => {
          await upsert.mutateAsync({ id: dialog.id, name, color });
          setDialog({ open: false });
        }}
      />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etiqueta em uso?</AlertDialogTitle>
            <AlertDialogDescription>
              A etiqueta <strong>{confirmDel?.name}</strong> está aplicada em {confirmDel?.count} contato(s).
              Excluir vai remover essas associações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (confirmDel) del.mutate(confirmDel.id); setConfirmDel(null); }}
            >Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

function TagDialog({
  state,
  onClose,
  onSave,
}: {
  state: { open: boolean; id?: string; name?: string; color?: string };
  onClose: () => void;
  onSave: (name: string, color: string) => void;
}) {
  const [name, setName] = useState(state.name ?? "");
  const [color, setColor] = useState(state.color ?? COLORS[0]);

  return (
    <Dialog
      open={state.open}
      onOpenChange={(o) => {
        if (!o) onClose();
        else { setName(state.name ?? ""); setColor(state.color ?? COLORS[0]); }
      }}
    >
      <DialogContent>
        <DialogHeader><DialogTitle>{state.id ? "Editar etiqueta" : "Nova etiqueta"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-offset-card ring-foreground" : ""}`}
                  style={{ background: c }}
                  aria-label={`Cor ${c}`}
                />
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
