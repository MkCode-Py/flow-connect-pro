import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info, Plus } from "lucide-react";
import { toast } from "sonner";
import { FieldError } from "./shared/FieldError";
import { TextWithVariables } from "./shared/TextWithVariables";
import { useCustomFields, useCreateCustomField } from "../../hooks/useTaxonomy";
import type { QuestionData, QuestionSaveTo, ValidationType } from "../../types";
import type { FieldErrors } from "../../schemas/nodeSchemas";

type Props = {
  draft: QuestionData;
  setDraft: (next: QuestionData) => void;
  errors: FieldErrors;
};

const SAVE_LABELS: Record<QuestionSaveTo, string> = {
  nome: "Nome",
  telefone: "Telefone",
  email: "E-mail",
  empresa: "Empresa",
  custom_field: "Campo personalizado",
};

const VAL_LABELS: Record<ValidationType, string> = {
  text: "Qualquer texto",
  email: "E-mail",
  phone: "Telefone",
  number: "Número",
  yes_no: "Sim/Não",
  cpf_cnpj: "CPF/CNPJ",
};

export function QuestionInspector({ draft, setDraft, errors }: Props) {
  const { data: fields = [] } = useCustomFields();
  const createField = useCreateCustomField();
  const [newOpen, setNewOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const handleCreateField = async () => {
    if (!newKey.trim() || !newLabel.trim()) return;
    try {
      const f = await createField.mutateAsync({ key: newKey.trim(), label: newLabel.trim() });
      setDraft({ ...draft, saveTo: "custom_field", customFieldKey: f.key });
      setNewKey(""); setNewLabel(""); setNewOpen(false);
      toast.success("Campo criado");
    } catch (e) {
      toast.error("Erro ao criar campo", { description: (e as Error).message });
    }
  };

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

      <TextWithVariables
        label="Texto da pergunta"
        value={draft.question}
        onChange={(v) => setDraft({ ...draft, question: v })}
        error={errors.question}
        rows={3}
      />

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-[11px] text-muted-foreground">Salvar resposta em</Label>
          <Popover open={newOpen} onOpenChange={setNewOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]">
                <Plus className="h-3 w-3 mr-1" /> Novo campo
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <div className="space-y-2">
                <div>
                  <Label className="text-[11px]">Rótulo</Label>
                  <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="h-8 mt-1" placeholder="Ex: CPF do cliente" />
                </div>
                <div>
                  <Label className="text-[11px]">Chave (sem espaços)</Label>
                  <Input value={newKey} onChange={(e) => setNewKey(e.target.value.replace(/[^a-z0-9_]/gi, "_").toLowerCase())} className="h-8 mt-1" placeholder="ex: cpf_cliente" />
                </div>
                <Button size="sm" className="w-full h-8" onClick={handleCreateField} disabled={createField.isPending}>
                  Criar campo
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Select
          value={draft.saveTo}
          onValueChange={(v) => setDraft({ ...draft, saveTo: v as QuestionSaveTo })}
        >
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(SAVE_LABELS) as QuestionSaveTo[]).map((k) => (
              <SelectItem key={k} value={k}>{SAVE_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {draft.saveTo === "custom_field" && (
        <div>
          <Label className="text-[11px] text-muted-foreground">Campo personalizado</Label>
          <Select
            value={draft.customFieldKey ?? ""}
            onValueChange={(v) => setDraft({ ...draft, customFieldKey: v })}
          >
            <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Selecionar…" /></SelectTrigger>
            <SelectContent>
              {fields.length === 0 && <div className="px-2 py-1.5 text-[11px] text-muted-foreground">Nenhum campo criado.</div>}
              {fields.map((f) => <SelectItem key={f.id} value={f.key}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <FieldError message={errors.customFieldKey} />
        </div>
      )}

      <div>
        <Label className="text-[11px] text-muted-foreground">Tipo de validação</Label>
        <Select
          value={draft.validationType}
          onValueChange={(v) => setDraft({ ...draft, validationType: v as ValidationType })}
        >
          <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(VAL_LABELS) as ValidationType[]).map((k) => (
              <SelectItem key={k} value={k}>{VAL_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-[11px]">
          Saídas fixas: <b>Resposta válida</b> e <b>Sem resposta</b>.
        </AlertDescription>
      </Alert>

      <div>
        <Label className="text-[11px] text-muted-foreground">Mensagem para resposta inválida</Label>
        <Input
          value={draft.invalidMessage}
          onChange={(e) => setDraft({ ...draft, invalidMessage: e.target.value })}
          className="h-8 mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px] text-muted-foreground">Tempo máx. (min)</Label>
          <Input
            type="number" min={0} max={10080}
            value={draft.timeoutMinutes}
            onChange={(e) => setDraft({ ...draft, timeoutMinutes: Number(e.target.value) || 0 })}
            className="h-8 mt-1"
          />
        </div>
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground">Mensagem ao expirar</Label>
        <Input
          value={draft.timeoutMessage}
          onChange={(e) => setDraft({ ...draft, timeoutMessage: e.target.value })}
          className="h-8 mt-1"
        />
      </div>
    </div>
  );
}
