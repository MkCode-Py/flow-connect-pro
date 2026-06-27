import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, ArrowRight, Hash, MousePointerClick, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldError } from "./shared/FieldError";
import { TextWithVariables } from "./shared/TextWithVariables";
import type { MenuData, MenuInputMode, MenuOption } from "../../types";
import type { FieldErrors } from "../../schemas/nodeSchemas";
import { genId } from "../../utils/nodeDataDefaults";

const MAX_OPTIONS = 10;

type Props = {
  draft: MenuData;
  setDraft: (next: MenuData) => void;
  errors: FieldErrors;
  /** Pede ao page para remover handle e edges associados, devolve true se confirmado. */
  onRequestRemoveHandle: (handleId: string) => Promise<boolean>;
};

/** Renumera atalhos como 1,2,3,… (modo numérico). */
function renumber(options: MenuOption[]): MenuOption[] {
  return options.map((o, i) => ({ ...o, shortcut: String(i + 1) }));
}

export function MenuInspector({ draft, setDraft, errors, onRequestRemoveHandle }: Props) {
  const isNumeric = draft.inputMode === "numeric";

  const commitOptions = (next: MenuOption[]) => {
    setDraft({ ...draft, options: isNumeric ? renumber(next) : next });
  };

  const updateOption = (idx: number, patch: Partial<MenuOption>) => {
    commitOptions(draft.options.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  };

  const addOption = () => {
    if (draft.options.length >= MAX_OPTIONS) return;
    const next = draft.options.length + 1;
    commitOptions([
      ...draft.options,
      {
        id: genId("opt"),
        shortcut: String(next),
        title: `Opção ${next}`,
        description: "",
      },
    ]);
  };

  const moveOption = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= draft.options.length) return;
    const next = [...draft.options];
    [next[idx], next[target]] = [next[target], next[idx]];
    commitOptions(next);
  };

  const removeOption = async (idx: number) => {
    if (draft.options.length === 1) return;
    const opt = draft.options[idx];
    const ok = await onRequestRemoveHandle(`opt-${opt.id}`);
    if (!ok) return;
    commitOptions(draft.options.filter((_, i) => i !== idx));
  };

  const changeMode = (mode: MenuInputMode) => {
    if (mode === draft.inputMode) return;
    const options = mode === "numeric" ? renumber(draft.options) : draft.options;
    setDraft({ ...draft, inputMode: mode, options });
  };

  return (
    <div className="space-y-4">
      {/* Nome */}
      <div>
        <Label className="text-[11px] text-muted-foreground">Nome do bloco</Label>
        <Input
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          className="h-8 mt-1"
        />
        <FieldError message={errors.label} />
      </div>

      {/* Texto do menu */}
      <TextWithVariables
        label="Texto do menu"
        value={draft.question}
        onChange={(v) => setDraft({ ...draft, question: v })}
        placeholder="Escolha uma opção:"
        error={errors.question}
        rows={3}
      />

      <div>
        <Label className="text-[11px] text-muted-foreground">Texto auxiliar (opcional)</Label>
        <Textarea
          value={draft.helperText ?? ""}
          onChange={(e) => setDraft({ ...draft, helperText: e.target.value })}
          rows={2}
          className="mt-1"
          placeholder="Mais detalhes para o contato…"
        />
      </div>

      {/* Tipo de entrada — segmented */}
      <div>
        <Label className="text-[11px] text-muted-foreground">Tipo de resposta</Label>
        <div className="mt-1 grid grid-cols-2 gap-1 p-1 rounded-md bg-surface-2 border border-border">
          <ModeButton
            active={draft.inputMode === "buttons"}
            onClick={() => changeMode("buttons")}
            icon={<MousePointerClick className="h-3.5 w-3.5" />}
            label="Botões"
            hint="Contato responde com o texto"
          />
          <ModeButton
            active={draft.inputMode === "numeric"}
            onClick={() => changeMode("numeric")}
            icon={<Hash className="h-3.5 w-3.5" />}
            label="Numérico"
            hint="Contato responde com o número"
          />
        </div>
      </div>

      {/* Opções */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] text-muted-foreground">
            Opções <span className="text-muted-foreground/60">({draft.options.length}/{MAX_OPTIONS})</span>
          </Label>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={addOption}
            disabled={draft.options.length >= MAX_OPTIONS}
          >
            <Plus className="h-3 w-3 mr-1" /> Adicionar
          </Button>
        </div>

        <p className="text-[10.5px] text-muted-foreground flex items-center gap-1">
          <ArrowRight className="h-3 w-3" />
          Conecte a saída de cada opção a um bloco no canvas.
        </p>

        {draft.options.map((opt, idx) => {
          const err = (k: string) => errors[`options.${idx}.${k}`];
          return (
            <div
              key={opt.id}
              className="rounded-md border border-border bg-surface-1 p-2.5 space-y-2"
            >
              <div className="flex items-center gap-1.5">
                {/* Reordenar */}
                <div className="flex flex-col">
                  <button
                    type="button" onClick={() => moveOption(idx, -1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={idx === 0}
                    title="Mover para cima"
                  ><ArrowUp className="h-3 w-3" /></button>
                  <button
                    type="button" onClick={() => moveOption(idx, 1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={idx === draft.options.length - 1}
                    title="Mover para baixo"
                  ><ArrowDown className="h-3 w-3" /></button>
                </div>

                {/* Atalho */}
                {isNumeric ? (
                  <div
                    className="h-8 w-9 rounded-md bg-surface-2 border border-border flex items-center justify-center text-[12px] font-mono font-semibold text-foreground/90"
                    title="Atalho numérico (gerado automaticamente)"
                  >
                    {idx + 1}
                  </div>
                ) : (
                  <Input
                    value={opt.shortcut}
                    onChange={(e) => updateOption(idx, { shortcut: e.target.value })}
                    placeholder="Atalho"
                    className="h-8 w-16 text-[12px] font-mono text-center"
                    title="Atalho curto (opcional)"
                  />
                )}

                {/* Título */}
                <Input
                  value={opt.title}
                  onChange={(e) => updateOption(idx, { title: e.target.value })}
                  placeholder={isNumeric ? "Texto exibido ao contato" : "Texto do botão"}
                  className="h-8 flex-1 text-[12px]"
                />

                {/* Remover */}
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => removeOption(idx)}
                  disabled={draft.options.length === 1}
                  title="Remover opção"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {(err("shortcut") || err("title")) && (
                <div className="pl-7 space-y-0.5">
                  <FieldError message={err("shortcut")} />
                  <FieldError message={err("title")} />
                </div>
              )}

              <Input
                value={opt.description ?? ""}
                onChange={(e) => updateOption(idx, { description: e.target.value })}
                placeholder="Descrição (opcional)"
                className="h-7 text-[12px]"
              />

              <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground pt-0.5">
                <ArrowRight className="h-3 w-3 text-success" />
                <span>Saída desta opção: conecte no canvas →</span>
              </div>
            </div>
          );
        })}
        <FieldError message={errors.options} />
      </div>

      {/* Fallbacks */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div>
          <Label className="text-[11px] text-muted-foreground">Mensagem para resposta inválida</Label>
          <Textarea
            value={draft.invalidReplyMessage}
            onChange={(e) => setDraft({ ...draft, invalidReplyMessage: e.target.value })}
            rows={2} className="mt-1"
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
            <FieldError message={errors.timeoutMinutes} />
          </div>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Mensagem ao expirar</Label>
          <Textarea
            value={draft.timeoutMessage}
            onChange={(e) => setDraft({ ...draft, timeoutMessage: e.target.value })}
            rows={2} className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}

function ModeButton({
  active, onClick, icon, label, hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[5px] px-2 py-1.5 text-left transition-colors",
        active
          ? "bg-card border border-border shadow-sm"
          : "hover:bg-card/50 border border-transparent",
      )}
    >
      <div className={cn("flex items-center gap-1.5 text-[12px] font-medium",
        active ? "text-foreground" : "text-muted-foreground")}>
        {icon}
        {label}
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{hint}</div>
    </button>
  );
}
