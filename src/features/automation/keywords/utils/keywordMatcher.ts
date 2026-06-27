import type { KeywordRule, MatchResult, MatchedRule } from "../types";

/**
 * Normaliza um texto para matching:
 * - lowercase
 * - trim
 * - remove acentos (NFD + diacríticos)
 * - colapsa pontuação simples em espaço
 * - colapsa múltiplos espaços
 *
 * Exemplos:
 *  "PREÇO!"        -> "preco"
 *  " Olá, tudo? "  -> "ola tudo"
 */
export function normalizeText(input: string): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,;:!?¿¡"'`´()[\]{}<>\\/|*_~+=]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Quebra texto normalizado em tokens por espaço. */
function tokenize(normalized: string): string[] {
  return normalized ? normalized.split(" ") : [];
}

function termsAsWords(rule: KeywordRule): string[][] {
  return rule.terms.map((t) => tokenize(normalizeText(t)));
}

/**
 * Testa uma regra contra uma mensagem normalizada.
 * Retorna a lista de termos (originais) que bateram, ou null se não bateu.
 */
export function matchKeywordRule(message: string, rule: KeywordRule): string[] | null {
  if (!rule.is_active) return null;
  if (!rule.terms.length) return null;

  const normalizedMsg = normalizeText(message);
  if (!normalizedMsg) return null;
  const msgTokens = tokenize(normalizedMsg);
  const msgPadded = ` ${normalizedMsg} `;

  const normalizedTerms = rule.terms
    .map((original) => ({ original, normalized: normalizeText(original) }))
    .filter((t) => t.normalized.length > 0);

  if (!normalizedTerms.length) return null;

  switch (rule.match_rule) {
    case "exact": {
      const hits = normalizedTerms.filter((t) => t.normalized === normalizedMsg);
      return hits.length ? hits.map((h) => h.original) : null;
    }
    case "starts_with": {
      const hits = normalizedTerms.filter((t) => normalizedMsg.startsWith(t.normalized));
      return hits.length ? hits.map((h) => h.original) : null;
    }
    case "contains": {
      const hits = normalizedTerms.filter((t) => msgPadded.includes(` ${t.normalized} `) || normalizedMsg.includes(t.normalized));
      return hits.length ? hits.map((h) => h.original) : null;
    }
    case "contains_any": {
      // mesma lógica de contains, mas exige fronteira de palavra (token completo)
      const hits = normalizedTerms.filter((t) => {
        const tokens = tokenize(t.normalized);
        return containsTokenSequence(msgTokens, tokens);
      });
      return hits.length ? hits.map((h) => h.original) : null;
    }
    case "contains_all": {
      const allHit = normalizedTerms.every((t) => {
        const tokens = tokenize(t.normalized);
        return containsTokenSequence(msgTokens, tokens);
      });
      return allHit ? normalizedTerms.map((t) => t.original) : null;
    }
    default:
      return null;
  }
}

function containsTokenSequence(haystack: string[], needle: string[]): boolean {
  if (!needle.length) return false;
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    let ok = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

/**
 * Ordena matches por prioridade (menor número = mais alta),
 * depois pelo número de termos batidos (mais termos = mais específico),
 * por último pela data de criação (mais antiga primeiro, estável).
 */
export function sortMatchesByPriority(matches: MatchedRule[]): MatchedRule[] {
  return [...matches].sort((a, b) => {
    if (a.rule.priority !== b.rule.priority) return a.rule.priority - b.rule.priority;
    if (b.matchedTerms.length !== a.matchedTerms.length) return b.matchedTerms.length - a.matchedTerms.length;
    return a.rule.created_at.localeCompare(b.rule.created_at);
  });
}

/**
 * Função principal usada por simulador (agora) e backend (futuro).
 *
 *  - Considera apenas regras ativas e com fluxo vinculado.
 *  - Aplica normalização robusta (case/acento/pontuação).
 *  - Retorna todas as regras que bateram + melhor escolha por prioridade.
 */
export function matchKeywords(message: string, rules: KeywordRule[]): MatchResult {
  const matchedRules: MatchedRule[] = [];

  for (const rule of rules) {
    if (!rule.is_active) continue;
    const hits = matchKeywordRule(message, rule);
    if (!hits) continue;
    matchedRules.push({
      rule,
      matchedTerms: hits,
      reason: `Regra "${rule.name}" (${rule.match_rule}) bateu em: ${hits.join(", ")}`,
    });
  }

  const sorted = sortMatchesByPriority(matchedRules);
  const bestMatch = sorted[0] ?? null;

  return {
    matched: sorted.length > 0,
    matchedRules: sorted,
    bestMatch,
    linkedFlowId: bestMatch?.rule.flow_id ?? null,
  };
}
