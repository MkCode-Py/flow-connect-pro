export type KeywordMatchRule =
  | "contains"
  | "starts_with"
  | "exact"
  | "contains_any"
  | "contains_all";

export const MATCH_RULE_LABEL: Record<KeywordMatchRule, string> = {
  contains: "Contém",
  starts_with: "Começa com",
  exact: "É exatamente",
  contains_any: "Contém qualquer termo",
  contains_all: "Contém todos os termos",
};

export const MATCH_RULE_HINT: Record<KeywordMatchRule, string> = {
  contains: "A mensagem precisa conter ao menos um dos termos como substring.",
  starts_with: "A mensagem precisa começar com um dos termos.",
  exact: "A mensagem precisa ser exatamente igual a um dos termos.",
  contains_any: "Igual a 'Contém', mas separa os termos por palavras completas.",
  contains_all: "A mensagem precisa conter todos os termos cadastrados.",
};

export type KeywordRule = {
  id: string;
  owner_id: string;
  flow_id: string | null;
  name: string;
  match_rule: KeywordMatchRule;
  terms: string[];
  is_active: boolean;
  executions: number;
  priority: number;
  notes: string | null;
  last_match_at: string | null;
  created_at: string;
  updated_at: string;
};

export type KeywordFormValues = {
  id?: string;
  name: string;
  flow_id: string | null;
  match_rule: KeywordMatchRule;
  terms: string[];
  priority: number;
  is_active: boolean;
  notes: string;
};

export type MatchedRule = {
  rule: KeywordRule;
  matchedTerms: string[];
  reason: string;
};

export type MatchResult = {
  matched: boolean;
  matchedRules: MatchedRule[];
  bestMatch: MatchedRule | null;
  linkedFlowId: string | null;
};
