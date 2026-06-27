import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { FieldError } from "./shared/FieldError";
import type { StartData } from "../../types";
import type { FieldErrors } from "../../schemas/nodeSchemas";

type Props = {
  draft: StartData;
  setDraft: (next: StartData) => void;
  errors: FieldErrors;
};

export function StartInspector({ draft, setDraft, errors }: Props) {
  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-[12px]">
          Todo fluxo precisa ter exatamente um bloco inicial. Ele não pode ser excluído.
        </AlertDescription>
      </Alert>

      <div>
        <Label className="text-[11px] text-muted-foreground">Nome do bloco</Label>
        <Input
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          className="h-8 mt-1"
        />
        <FieldError message={errors.label} />
      </div>

      <div>
        <Label className="text-[11px] text-muted-foreground">Descrição</Label>
        <Textarea
          value={draft.description ?? ""}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          rows={3}
          className="mt-1"
        />
      </div>
    </div>
  );
}
