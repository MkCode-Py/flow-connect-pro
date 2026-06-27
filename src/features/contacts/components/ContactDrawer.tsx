import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, MessageSquare, Plus, Tag as TagIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContacts, useUpsertContact, useApplyContactTagBulk, useEnsureConversationForContact } from "../hooks/useContactsCrud";
import { useTagsList, useUpsertTag } from "@/features/tags/hooks/useTagsCrud";

export function ContactDrawer({
  open,
  contactId,
  onOpenChange,
}: {
  open: boolean;
  contactId?: string;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const contacts = useContacts();
  const tags = useTagsList();
  const upsert = useUpsertContact();
  const applyTag = useApplyContactTagBulk();
  const upsertTag = useUpsertTag();
  const ensureConv = useEnsureConversationForContact();

  const existing = useMemo(
    () => (contacts.data ?? []).find((c) => c.id === contactId),
    [contacts.data, contactId],
  );

  const [form, setForm] = useState({ name: "", phone: "", email: "", company: "", notes: "", automation_paused: false });
  const [fields, setFields] = useState<Record<string, unknown>>({});
  const [newField, setNewField] = useState({ key: "", value: "" });
  const [newTagName, setNewTagName] = useState("");

  useEffect(() => {
    if (open) {
      setForm({
        name: existing?.name ?? "",
        phone: existing?.phone ?? "",
        email: existing?.email ?? "",
        company: existing?.company ?? "",
        notes: existing?.notes ?? "",
        automation_paused: existing?.automation_paused ?? false,
      });
      setFields(existing?.custom_fields ?? {});
    }
  }, [open, existing]);

  const attachedIds = new Set((existing?.tags ?? []).map((t) => t.id));

  const save = async () => {
    const saved = await upsert.mutateAsync({
      id: contactId,
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      company: form.company || null,
      notes: form.notes || null,
      automation_paused: form.automation_paused,
      custom_fields: fields,
    });
    if (!contactId) onOpenChange(false);
    return saved.id;
  };

  const addField = () => {
    const k = newField.key.trim();
    if (!k) return;
    setFields((s) => ({ ...s, [k]: newField.value }));
    setNewField({ key: "", value: "" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{contactId ? "Editar contato" : "Novo contato"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-3 mt-4">
          <div>
            <Label className="text-xs">Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="55 11 99999-9999" />
            </div>
            <div>
              <Label className="text-xs">E-mail</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Empresa</Label>
            <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Observações internas</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex items-center justify-between border border-border rounded-lg px-3 py-2 surface-2">
            <div className="text-sm">Automação pausada</div>
            <Switch checked={form.automation_paused} onCheckedChange={(v) => setForm({ ...form, automation_paused: v })} />
          </div>

          {contactId && (
            <>
              <Separator />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                  <TagIcon className="h-3 w-3" /> Etiquetas
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(existing?.tags ?? []).map((t) => (
                    <span
                      key={t.id}
                      className="text-xs px-2 py-0.5 rounded-md border inline-flex items-center gap-1"
                      style={{ background: `${t.color}1a`, color: t.color, borderColor: `${t.color}55` }}
                    >
                      {t.name}
                      <button type="button" onClick={() => applyTag.mutate({ contactId, tagId: t.id, attach: false })}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]">
                        <Plus className="h-3 w-3 mr-1" /> Adicionar
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-56 p-2">
                      <div className="space-y-1 max-h-56 overflow-auto">
                        {(tags.data ?? []).map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => applyTag.mutate({ contactId, tagId: t.id, attach: !attachedIds.has(t.id) })}
                            className={cn(
                              "w-full text-left text-xs px-2 py-1.5 rounded hover:bg-surface-2 flex items-center gap-2",
                              attachedIds.has(t.id) && "bg-surface-2",
                            )}
                          >
                            <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                            <span className="flex-1">{t.name}</span>
                            {attachedIds.has(t.id) && <Check className="h-3 w-3 text-primary" />}
                          </button>
                        ))}
                      </div>
                      <Separator className="my-2" />
                      <div className="flex gap-1">
                        <Input placeholder="Nova etiqueta" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} className="h-7 text-xs" />
                        <Button
                          size="sm"
                          className="h-7"
                          onClick={async () => {
                            const n = newTagName.trim();
                            if (!n) return;
                            const t = await upsertTag.mutateAsync({ name: n, color: "#22c55e" });
                            await applyTag.mutateAsync({ contactId, tagId: t.id, attach: true });
                            setNewTagName("");
                          }}
                        >Criar</Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </>
          )}

          <Separator />

          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Campos personalizados</div>
            <div className="space-y-1">
              {Object.entries(fields).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1 text-xs bg-surface-2 border border-border rounded px-2 py-1">
                  <span className="text-muted-foreground min-w-[90px]">{k}</span>
                  <span className="flex-1 font-medium truncate">{String(v)}</span>
                  <button type="button" onClick={() => setFields((s) => { const c = { ...s }; delete c[k]; return c; })}>
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
              {!Object.keys(fields).length && <div className="text-xs text-muted-foreground">Nenhum campo personalizado.</div>}
            </div>
            <div className="flex gap-1 mt-2">
              <Input placeholder="chave" value={newField.key} onChange={(e) => setNewField((s) => ({ ...s, key: e.target.value }))} className="h-7 text-xs" />
              <Input placeholder="valor" value={newField.value} onChange={(e) => setNewField((s) => ({ ...s, value: e.target.value }))} className="h-7 text-xs" />
              <Button size="sm" className="h-7" onClick={addField}><Plus className="h-3 w-3" /></Button>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">Cancelar</Button>
            {contactId && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={async () => {
                  const id = await save();
                  const convId = await ensureConv.mutateAsync(id);
                  onOpenChange(false);
                  navigate(`/inbox/${convId}`);
                }}
              >
                <MessageSquare className="h-4 w-4 mr-1" /> Abrir conversa
              </Button>
            )}
            <Button className="flex-1" onClick={save} disabled={!form.name.trim() || upsert.isPending}>Salvar</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
