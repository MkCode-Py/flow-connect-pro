/** Helpers de variáveis para textareas/inputs com cursor tracking. */
import { useEffect, useRef, useState } from "react";

export type VariableDef = { key: string; label: string; sample?: string };

export const DEFAULT_VARIABLES: VariableDef[] = [
  { key: "primeiro_nome", label: "Primeiro nome", sample: "João" },
  { key: "nome", label: "Nome completo", sample: "João Silva" },
  { key: "telefone", label: "Telefone", sample: "+55 11 98765-4321" },
  { key: "empresa", label: "Empresa", sample: "Acme Ltda" },
];

export function buildCustomFieldVariables(
  fields: { key: string; label: string }[],
): VariableDef[] {
  return fields.map((f) => ({
    key: `campo.${f.key}`,
    label: f.label || f.key,
  }));
}

/** Insere um token na posição atual do cursor de um Input/Textarea controlado. */
export function insertAtCursor<T extends HTMLInputElement | HTMLTextAreaElement>(
  el: T | null,
  current: string,
  token: string,
): { value: string; nextCursor: number } {
  if (!el) {
    const value = `${current}${token}`;
    return { value, nextCursor: value.length };
  }
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  const value = current.slice(0, start) + token + current.slice(end);
  return { value, nextCursor: start + token.length };
}

/** Render simples de preview: substitui {{var}} por sample. */
export function previewWithVariables(
  text: string,
  vars: VariableDef[],
): string {
  if (!text) return "";
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, name: string) => {
    const v = vars.find((x) => x.key === name);
    return v?.sample ?? `{{${name}}}`;
  });
}

/** Hook que mantém o cursor sincronizado após inserção programática. */
export function useCursorRestore<T extends HTMLInputElement | HTMLTextAreaElement>() {
  const ref = useRef<T | null>(null);
  const [pendingCursor, setPendingCursor] = useState<number | null>(null);

  useEffect(() => {
    if (pendingCursor != null && ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(pendingCursor, pendingCursor);
      setPendingCursor(null);
    }
  }, [pendingCursor]);

  return { ref, setPendingCursor };
}
