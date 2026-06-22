import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreVertical, Pencil, Trash2, Users } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export default function Contacts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ open: boolean; id?: string; name?: string; phone?: string; email?: string }>({ open: false });

  const contacts = useQuery({
    queryKey: ["contacts", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("contacts").select("*").eq("owner_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const upsert = useMutation({
    mutationFn: async (c: { id?: string; name: string; phone?: string; email?: string }) => {
      if (c.id) await supabase.from("contacts").update({ name: c.name, phone: c.phone ?? null, email: c.email ?? null }).eq("id", c.id);
      else await supabase.from("contacts").insert({ owner_id: user!.id, name: c.name, phone: c.phone ?? null, email: c.email ?? null });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contacts"] }); setDialog({ open: false }); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("contacts").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });

  return (
    <PageContainer>
      <PageHeader title="Contatos" description="Base de contatos sincronizada com suas conversas." actions={<Button onClick={() => setDialog({ open: true })}><Plus className="h-4 w-4 mr-2" /> Novo contato</Button>} />
      <Card className="bg-card border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(contacts.data ?? []).length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground"><Users className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhum contato cadastrado.</TableCell></TableRow>
            )}
            {(contacts.data ?? []).map((c) => (
              <TableRow key={c.id} className="border-border">
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDialog({ open: true, id: c.id, name: c.name, phone: c.phone ?? undefined, email: c.email ?? undefined })}><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("Excluir?")) del.mutate(c.id); }}><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <ContactDialog state={dialog} onClose={() => setDialog({ open: false })} onSave={(n, p, e) => upsert.mutate({ id: dialog.id, name: n, phone: p, email: e })} />
    </PageContainer>
  );
}

function ContactDialog({ state, onClose, onSave }: { state: { open: boolean; id?: string; name?: string; phone?: string; email?: string }; onClose: () => void; onSave: (n: string, p?: string, e?: string) => void }) {
  const [name, setName] = useState(state.name ?? "");
  const [phone, setPhone] = useState(state.phone ?? "");
  const [email, setEmail] = useState(state.email ?? "");
  return (
    <Dialog open={state.open} onOpenChange={(o) => { if (!o) onClose(); else { setName(state.name ?? ""); setPhone(state.phone ?? ""); setEmail(state.email ?? ""); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{state.id ? "Editar contato" : "Novo contato"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <div><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="55 11 99999-9999" /></div>
          <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => name.trim() && onSave(name.trim(), phone.trim() || undefined, email.trim() || undefined)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
