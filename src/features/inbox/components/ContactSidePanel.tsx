import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bot, Tag as TagIcon, Plus, Check, ChevronDown, X, ClipboardList, CheckCircle2, Clock, UserCog } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { InboxConversation } from "../types";
import { STATUS_LABEL } from "../types";
import { AutomationStatusBadge } from "./AutomationStatusBadge";

const STATUS_OPTIONS: InboxConversation["status"][] = ["open", "pending", "resolved", "human_required"];
const STATUS_ICON = { open: Bot, pending: Clock, resolved: CheckCircle2, human_required: UserCog };

export function ContactSidePanel({
  conversation,
  allTags,
  logs,
  onUpdateContact,
  onApplyTag,
  onCreateTag,
  onSetStatus,
  onSetAutomationPaused,
}: {
  conversation: InboxConversation;
  allTags: Array<{ id: string; name: string; color: string }>;
  logs: Array<{ id: string; event: string; payload: any; created_at: string }>;
  onUpdateContact: (patch: Record<string, any>) => Promise<void> | void;
  onApplyTag: (tagId: string, attach: boolean) => Promise<void> | void;
  onCreateTag: (name: string) => Promise<{ id: string } | undefined>;
  onSetStatus: (s: InboxConversation["status"]) => Promise<void> | void;
  onSetAutomationPaused: (paused: boolean) => Promise<void> | void;
}) {
  const c = conversation.contact;
  const [name, setName] = useState(c.name);
  const [email, setEmail] = useState(c.email ?? "");
  const [company, setCompany] = useState(c.company ?? "");
  const [newField, setNewField] = useState({ key: "", value: "" });
  const [newTagName, setNewTagName] = useState("");

  const attachedTagIds = new Set(conversation.tags.map((t) => t.id));

  const saveField = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await onUpdateContact({ name: trimmed, email: email.trim() || null, company: company.trim() || null });
  };

  const addCustomField = async () => {
    const key = newField.key.trim();
    if (!key) return;
    const merged = { ...(c.custom_fields ?? {}), [key]: newField.value };
    await onUpdateContact({ custom_fields: merged });
    setNewField({ key: "", value: "" });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Avatar + nome */}
        <div className="text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-brand mx-auto flex items-center justify-center text-background font-semibold text-xl">
            {c.name.charAt(0).toUpperCase()}
          </div>
          <div className="mt-2 font-medium">{c.name}</div>
          <div className="text-xs text-muted-foreground">{c.phone ?? "Sem telefone"}</div>
          <div className="mt-2 flex justify-center"><AutomationStatusBadge paused={conversation.automation_paused} /></div>
        </div>

        {/* Status + automação */}
        <div className="space-y-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between" size="sm">
                <span className="flex items-center gap-2">
                  Status: <span className="font-medium">{STATUS_LABEL[conversation.status]}</span>
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {STATUS_OPTIONS.map((s) => {
                const Icon = STATUS_ICON[s];
                return (
                  <DropdownMenuItem key={s} onClick={() => onSetStatus(s)}>
                    <Icon className="h-4 w-4 mr-2" /> {STATUS_LABEL[s]}
                    {conversation.status === s && <Check className="h-3 w-3 ml-auto" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="border border-border rounded-lg p-3 surface-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Bot className="h-4 w-4 text-primary" /> Automação
            </div>
            <Switch
              checked={!conversation.automation_paused}
              onCheckedChange={(v) => onSetAutomationPaused(!v)}
            />
          </div>
        </div>

        <Separator />

        {/* Edição inline */}
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveField} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">E-mail</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} onBlur={saveField} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Empresa</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} onBlur={saveField} className="h-8 text-sm" />
          </div>
        </div>

        <Separator />

        {/* Etiquetas */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <TagIcon className="h-3 w-3" /> Etiquetas
          </div>
          <div className="flex flex-wrap gap-1.5">
            {conversation.tags.map((t) => (
              <span
                key={t.id}
                className="text-xs px-2 py-0.5 rounded-md border inline-flex items-center gap-1"
                style={{ background: `${t.color}1a`, color: t.color, borderColor: `${t.color}55` }}
              >
                {t.name}
                <button
                  type="button"
                  className="opacity-70 hover:opacity-100"
                  onClick={() => onApplyTag(t.id, false)}
                  aria-label={`Remover ${t.name}`}
                >
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
                  {allTags.length === 0 && (
                    <div className="text-xs text-muted-foreground p-2 text-center">Nenhuma etiqueta criada ainda.</div>
                  )}
                  {allTags.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onApplyTag(t.id, !attachedTagIds.has(t.id))}
                      className={cn(
                        "w-full text-left text-xs px-2 py-1.5 rounded hover:bg-surface-2 flex items-center gap-2",
                        attachedTagIds.has(t.id) && "bg-surface-2",
                      )}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                      <span className="flex-1">{t.name}</span>
                      {attachedTagIds.has(t.id) && <Check className="h-3 w-3 text-primary" />}
                    </button>
                  ))}
                </div>
                <Separator className="my-2" />
                <div className="flex gap-1">
                  <Input
                    placeholder="Nova etiqueta"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <Button
                    size="sm"
                    className="h-7"
                    onClick={async () => {
                      const n = newTagName.trim();
                      if (!n) return;
                      const t = await onCreateTag(n);
                      if (t) await onApplyTag(t.id, true);
                      setNewTagName("");
                    }}
                  >
                    Criar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Separator />

        {/* Campos personalizados */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Campos personalizados</div>
          <div className="space-y-1">
            {Object.entries(c.custom_fields ?? {}).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-xs bg-surface-2 border border-border rounded px-2 py-1">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium truncate max-w-[140px]">{String(v)}</span>
              </div>
            ))}
            {!Object.keys(c.custom_fields ?? {}).length && (
              <div className="text-xs text-muted-foreground">Nenhum campo personalizado.</div>
            )}
          </div>
          <div className="flex gap-1 mt-2">
            <Input
              placeholder="chave"
              value={newField.key}
              onChange={(e) => setNewField((s) => ({ ...s, key: e.target.value }))}
              className="h-7 text-xs"
            />
            <Input
              placeholder="valor"
              value={newField.value}
              onChange={(e) => setNewField((s) => ({ ...s, value: e.target.value }))}
              className="h-7 text-xs"
            />
            <Button size="sm" className="h-7" onClick={addCustomField}><Plus className="h-3 w-3" /></Button>
          </div>
        </div>

        <Separator />

        {/* Logs */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <ClipboardList className="h-3 w-3" /> Últimos eventos
          </div>
          {logs.length === 0 && <div className="text-xs text-muted-foreground">Sem eventos ainda.</div>}
          <div className="space-y-1.5">
            {logs.slice(0, 8).map((l) => (
              <div key={l.id} className="text-[11px] bg-surface-2 border border-border rounded px-2 py-1.5">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] py-0">{l.event}</Badge>
                  <span className="text-muted-foreground">
                    {format(new Date(l.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {l.payload && Object.keys(l.payload).length > 0 && (
                  <pre className="mt-1 text-[10px] text-muted-foreground overflow-hidden">
                    {JSON.stringify(l.payload).slice(0, 120)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
