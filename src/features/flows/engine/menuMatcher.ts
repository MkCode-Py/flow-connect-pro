/** Normalização e matching de respostas para blocos de Menu. */
import type { MenuData, MenuOption } from "../editor/types";

export function normalize(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,;:!?()[\]{}'"`]/g, "")
    .trim();
}

/** Retorna a opção que casa com a entrada do usuário, ou null. */
export function matchMenuOption(menu: MenuData, userInput: string): MenuOption | null {
  const input = normalize(userInput);
  if (!input) return null;
  for (const opt of menu.options ?? []) {
    if (normalize(opt.shortcut) === input) return opt;
    if (normalize(opt.title) === input) return opt;
    if (normalize(opt.title).includes(input) && input.length >= 3) return opt;
    for (const v of opt.acceptedValues ?? []) {
      const nv = normalize(v);
      if (!nv) continue;
      if (nv === input || input.includes(nv) || nv.includes(input)) return opt;
    }
  }
  return null;
}
