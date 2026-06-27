import { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VariableMenu } from "./VariableMenu";
import { FieldError } from "./FieldError";
import { DEFAULT_VARIABLES, insertAtCursor, previewWithVariables } from "../../../utils/variableHelpers";

type CommonProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  showPreview?: boolean;
  hint?: string;
};

export function TextWithVariables({
  label, value, onChange, placeholder, error, showPreview, hint,
  rows = 4,
}: CommonProps & { rows?: number }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const handlePick = (token: string) => {
    const { value: next, nextCursor } = insertAtCursor(ref.current, value, token);
    onChange(next);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-[11px] text-muted-foreground">{label}</Label>
        <VariableMenu onPick={handlePick} />
      </div>
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="resize-y min-h-[80px]"
      />
      {hint && <p className="mt-1 text-[10px] text-muted-foreground/80">{hint}</p>}
      <FieldError message={error} />
      {showPreview && value && (
        <div className="mt-2 rounded-md bg-surface-2 border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground">
          <span className="text-[10px] uppercase tracking-wider mr-2 text-foreground/60">Pré-visualização</span>
          {previewWithVariables(value, DEFAULT_VARIABLES)}
        </div>
      )}
    </div>
  );
}

export function InputWithVariables({
  label, value, onChange, placeholder, error,
}: CommonProps) {
  const ref = useRef<HTMLInputElement | null>(null);
  const handlePick = (token: string) => {
    const { value: next, nextCursor } = insertAtCursor(ref.current, value, token);
    onChange(next);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-[11px] text-muted-foreground">{label}</Label>
        <VariableMenu onPick={handlePick} size="xs" />
      </div>
      <Input ref={ref} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8" />
      <FieldError message={error} />
    </div>
  );
}
