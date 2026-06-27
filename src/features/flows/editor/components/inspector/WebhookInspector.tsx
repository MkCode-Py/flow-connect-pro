import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Plus, Trash2 } from "lucide-react";
import { FieldError } from "./shared/FieldError";
import type { HttpMethod, WebhookData } from "../../types";
import type { FieldErrors } from "../../schemas/nodeSchemas";
import { genId } from "../../utils/nodeDataDefaults";

type Props = {
  draft: WebhookData;
  setDraft: (next: WebhookData) => void;
  errors: FieldErrors;
};

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function WebhookInspector({ draft, setDraft, errors }: Props) {
  const addHeader = () => setDraft({ ...draft, headers: [...draft.headers, { id: genId("h"), key: "", value: "" }] });
  const updateHeader = (idx: number, patch: Partial<WebhookData["headers"][number]>) =>
    setDraft({ ...draft, headers: draft.headers.map((h, i) => (i === idx ? { ...h, ...patch } : h)) });
  const removeHeader = (idx: number) =>
    setDraft({ ...draft, headers: draft.headers.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-[11px] text-muted-foreground">Nome do bloco</Label>
        <Input
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          className="h-8 mt-1"
        />
        <FieldError message={errors.label} />
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-[11px]">
          Execução real de webhook será implementada depois no backend. Por enquanto, deixe em modo mock.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between">
        <div>
          <Label className="text-[12px]">Modo mock</Label>
          <p className="text-[10px] text-muted-foreground">Não dispara chamada real.</p>
        </div>
        <Switch checked={draft.mockMode} onCheckedChange={(v) => setDraft({ ...draft, mockMode: v })} />
      </div>

      <div className="grid grid-cols-[100px_1fr] gap-2">
        <div>
          <Label className="text-[11px] text-muted-foreground">Método</Label>
          <Select value={draft.method} onValueChange={(v) => setDraft({ ...draft, method: v as HttpMethod })}>
            <SelectTrigger className="h-8 mt-1 font-mono text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">URL</Label>
          <Input
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            placeholder="https://api.exemplo.com/webhook"
            className="h-8 mt-1 font-mono text-[12px]"
          />
          <FieldError message={errors.url} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-[11px] text-muted-foreground">Headers</Label>
          <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={addHeader}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar
          </Button>
        </div>
        {draft.headers.length === 0 && (
          <p className="text-[11px] text-muted-foreground italic">Nenhum header adicionado.</p>
        )}
        <div className="space-y-1.5">
          {draft.headers.map((h, idx) => (
            <div key={h.id} className="grid grid-cols-[1fr_1fr_28px] gap-1.5">
              <Input
                value={h.key} onChange={(e) => updateHeader(idx, { key: e.target.value })}
                placeholder="Header" className="h-7 text-[12px] font-mono"
              />
              <Input
                value={h.value} onChange={(e) => updateHeader(idx, { value: e.target.value })}
                placeholder="Valor" className="h-7 text-[12px] font-mono"
              />
              <Button
                variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => removeHeader(idx)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-[11px] text-muted-foreground">Body (JSON)</Label>
        <Textarea
          value={draft.body}
          onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          rows={6} className="mt-1 font-mono text-[11px]"
          placeholder='{"key": "value"}'
        />
        <FieldError message={errors.body} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px] text-muted-foreground">Timeout (s)</Label>
          <Input
            type="number" min={1} max={120}
            value={draft.timeoutSeconds}
            onChange={(e) => setDraft({ ...draft, timeoutSeconds: Number(e.target.value) || 1 })}
            className="h-8 mt-1"
          />
          <FieldError message={errors.timeoutSeconds} />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Salvar resposta em</Label>
          <Input
            value={draft.saveResponseTo ?? ""}
            onChange={(e) => setDraft({ ...draft, saveResponseTo: e.target.value })}
            placeholder="ex: api_status"
            className="h-8 mt-1"
          />
        </div>
      </div>
    </div>
  );
}
