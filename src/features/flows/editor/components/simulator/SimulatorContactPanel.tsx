/** Aba "Contato simulado": edita o contato usado pela engine. */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus } from "lucide-react";
import type { SimulationContact } from "@/features/flows/engine";

type Props = {
  contact: SimulationContact;
  onChange: (next: SimulationContact) => void;
};

export function SimulatorContactPanel({ contact, onChange }: Props) {
  const [newTag, setNewTag] = useState("");
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldVal, setNewFieldVal] = useState("");

  const set = <K extends keyof SimulationContact>(k: K, v: SimulationContact[K]) =>
    onChange({ ...contact, [k]: v });

  const addTag = () => {
    const t = newTag.trim();
    if (!t || contact.tags.includes(t)) return;
    onChange({ ...contact, tags: [...contact.tags, t] });
    setNewTag("");
  };
  const removeTag = (t: string) => onChange({ ...contact, tags: contact.tags.filter((x) => x !== t) });

  const addField = () => {
    const k = newFieldKey.trim();
    if (!k) return;
    onChange({ ...contact, customFields: { ...contact.customFields, [k]: newFieldVal } });
    setNewFieldKey(""); setNewFieldVal("");
  };
  const removeField = (k: string) => {
    const next = { ...contact.customFields };
    delete next[k];
    onChange({ ...contact, customFields: next });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome completo</Label>
            <Input value={contact.name} onChange={(e) => set("name", e.target.value)} className="h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Primeiro nome</Label>
            <Input value={contact.firstName} onChange={(e) => set("firstName", e.target.value)} className="h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Telefone</Label>
            <Input value={contact.phone} onChange={(e) => set("phone", e.target.value)} className="h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input value={contact.email} onChange={(e) => set("email", e.target.value)} className="h-8" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Empresa</Label>
            <Input value={contact.company} onChange={(e) => set("company", e.target.value)} className="h-8" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Status da conversa</Label>
          <Select value={contact.conversationStatus} onValueChange={(v) => set("conversationStatus", v as SimulationContact["conversationStatus"])}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Aberta</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="resolved">Resolvida</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
          <div>
            <p className="text-xs font-medium">Automação pausada</p>
            <p className="text-[10px] text-muted-foreground">Afeta condições do tipo "bot pausado"</p>
          </div>
          <Switch checked={contact.automationPaused} onCheckedChange={(v) => set("automationPaused", v)} />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Etiquetas</Label>
          <div className="flex gap-1.5 flex-wrap">
            {contact.tags.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma etiqueta.</p>}
            {contact.tags.map((t) => (
              <Badge key={t} variant="secondary" className="gap-1 pr-1">
                {t}
                <button type="button" onClick={() => removeTag(t)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-1.5">
            <Input
              value={newTag} onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="Nova etiqueta" className="h-8 text-xs"
            />
            <Button type="button" size="sm" variant="outline" onClick={addTag}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Campos personalizados</Label>
          {Object.entries(contact.customFields).length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum campo personalizado.</p>
          )}
          {Object.entries(contact.customFields).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{k}</code>
              <Input
                value={v}
                onChange={(e) => onChange({ ...contact, customFields: { ...contact.customFields, [k]: e.target.value } })}
                className="h-7 text-xs flex-1"
              />
              <Button type="button" size="icon" variant="ghost" onClick={() => removeField(k)} className="h-7 w-7">
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-1.5">
            <Input value={newFieldKey} onChange={(e) => setNewFieldKey(e.target.value)} placeholder="chave" className="h-8 text-xs w-24" />
            <Input value={newFieldVal} onChange={(e) => setNewFieldVal(e.target.value)} placeholder="valor" className="h-8 text-xs flex-1" />
            <Button type="button" size="sm" variant="outline" onClick={addField}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
