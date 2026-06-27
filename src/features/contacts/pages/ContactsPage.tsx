import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Users, Pencil, Trash2, MessageSquare, MoreVertical, BotOff } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useContacts, useDeleteContact, useEnsureConversationForContact } from "../hooks/useContactsCrud";
import { useTagsList } from "@/features/tags/hooks/useTagsCrud";
import { ContactDrawer } from "../components/ContactDrawer";

export default function ContactsPage() {
  const navigate = useNavigate();
  const contacts = useContacts();
  const tags = useTagsList();
  const del = useDeleteContact();
  const openConv = useEnsureConversationForContact();

  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("__all__");
  const [pausedFilter, setPausedFilter] = useState("__all__");
  const [drawer, setDrawer] = useState<{ open: boolean; id?: string }>({ open: false });

  const filtered = useMemo(() => {
    const items = contacts.data ?? [];
    return items.filter((c) => {
      if (tagFilter !== "__all__" && !c.tags.some((t) => t.id === tagFilter)) return false;
      if (pausedFilter === "paused" && !c.automation_paused) return false;
      if (pausedFilter === "active" && c.automation_paused) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (
          !c.name.toLowerCase().includes(q) &&
          !(c.phone ?? "").toLowerCase().includes(q) &&
          !(c.email ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [contacts.data, query, tagFilter, pausedFilter]);

  return (
    <PageContainer>
      <PageHeader
        title="Contatos"
        description="Gerencie sua base, etiquetas, campos personalizados e abra atendimentos pela inbox."
        actions={
          <Button onClick={() => setDrawer({ open: true })}>
            <Plus className="h-4 w-4 mr-1.5" /> Novo contato
          </Button>
        }
      />

      <Card className="bg-card border-border p-3 flex flex-col md:flex-row gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar nome, telefone ou e-mail..." className="pl-8 h-9" />
        </div>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="h-9 md:w-56"><SelectValue placeholder="Etiqueta" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as etiquetas</SelectItem>
            {(tags.data ?? []).map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={pausedFilter} onValueChange={setPausedFilter}>
          <SelectTrigger className="h-9 md:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Automação: todas</SelectItem>
            <SelectItem value="active">Automação ativa</SelectItem>
            <SelectItem value="paused">Automação pausada</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="bg-card border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="hidden md:table-cell">E-mail</TableHead>
              <TableHead className="hidden md:table-cell">Empresa</TableHead>
              <TableHead>Etiquetas</TableHead>
              <TableHead className="hidden lg:table-cell">Última conversa</TableHead>
              <TableHead className="hidden lg:table-cell">Criado em</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.isLoading && (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
            )}
            {!contacts.isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Nenhum contato encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((c) => (
              <TableRow key={c.id} className="border-border">
                <TableCell>
                  <button
                    type="button"
                    className="font-medium hover:text-primary flex items-center gap-2"
                    onClick={() => setDrawer({ open: true, id: c.id })}
                  >
                    {c.name}
                    {c.automation_paused && (
                      <Badge variant="outline" className="text-[10px] py-0 bg-warning/10 text-warning border-warning/30">
                        <BotOff className="h-3 w-3 mr-0.5" /> Pausada
                      </Badge>
                    )}
                  </button>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">{c.email || "—"}</TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">{c.company || "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {c.tags.slice(0, 3).map((t) => (
                      <span
                        key={t.id}
                        className="text-[10px] px-1.5 py-0.5 rounded-md border"
                        style={{ background: `${t.color}1a`, color: t.color, borderColor: `${t.color}55` }}
                      >
                        {t.name}
                      </span>
                    ))}
                    {c.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{c.tags.length - 3}</span>}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs hidden lg:table-cell">
                  {c.last_conversation_at ? format(new Date(c.last_conversation_at), "dd/MM HH:mm", { locale: ptBR }) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs hidden lg:table-cell">
                  {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDrawer({ open: true, id: c.id })}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          const convId = await openConv.mutateAsync(c.id);
                          navigate(`/inbox/${convId}`);
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" /> Abrir conversa
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => { if (confirm(`Excluir "${c.name}"? Esta ação também remove suas conversas.`)) del.mutate(c.id); }}
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

      <ContactDrawer
        open={drawer.open}
        contactId={drawer.id}
        onOpenChange={(o) => setDrawer({ open: o, id: o ? drawer.id : undefined })}
      />
    </PageContainer>
  );
}
