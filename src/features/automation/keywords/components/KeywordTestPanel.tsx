import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, FlaskConical, Send, XCircle, Workflow } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { matchKeywords } from "../utils/keywordMatcher";
import type { KeywordRule, MatchResult } from "../types";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rules: KeywordRule[];
  flows: Array<{ id: string; name: string }>;
};

const EXAMPLES = [
  "oi, queria ver a tabela de preços",
  "vocês aceitam pix?",
  "quero fazer um pedido",
  "preciso falar com um atendente",
];

export function KeywordTestPanel({ open, onOpenChange, rules, flows }: Props) {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);

  const activeCount = useMemo(() => rules.filter((r) => r.is_active).length, [rules]);

  function run(text?: string) {
    const t = (text ?? message).trim();
    if (!t) { setResult(null); return; }
    if (text !== undefined) setMessage(text);
    setResult(matchKeywords(t, rules));
  }

  function flowName(id: string | null | undefined) {
    if (!id) return "—";
    return flows.find((f) => f.id === id)?.name ?? "Fluxo removido";
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-accent" /> Testar palavra-chave
          </SheetTitle>
          <SheetDescription>
            Digite uma mensagem como se fosse o cliente. {activeCount} regra{activeCount === 1 ? "" : "s"} ativa{activeCount === 1 ? "" : "s"} serão avaliadas.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), run())}
              placeholder="Ex: quero ver a tabela de preços"
            />
            <Button onClick={() => run()}><Send className="h-4 w-4 mr-1" /> Testar</Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => run(ex)}
                className="text-[11px] px-2 py-1 rounded-full border border-border bg-surface-2 hover:border-border-strong transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>

          {result && (
            <Card className={`p-4 ${result.matched ? "border-success/40 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
              {result.matched ? (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{result.matchedRules.length} regra{result.matchedRules.length === 1 ? "" : "s"} bateu/bateram</div>
                    <div className="text-xs text-muted-foreground">
                      Fluxo que seria iniciado:{" "}
                      <strong className="text-foreground">{flowName(result.linkedFlowId)}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <div className="text-sm">Nenhuma palavra-chave encontrada.</div>
                </div>
              )}
            </Card>
          )}

          {result?.matched && (
            <div className="space-y-2">
              {result.matchedRules.map((m, idx) => (
                <Card key={m.rule.id} className="p-3 bg-card border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{m.rule.name}</span>
                        {idx === 0 && <Badge className="bg-success/15 text-success border-success/30 text-[10px]">prioridade</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {m.rule.match_rule} · prioridade {m.rule.priority}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {m.matchedTerms.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px] bg-accent/10 text-accent border-accent/20">{t}</Badge>
                        ))}
                      </div>
                    </div>
                    {m.rule.flow_id && (
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/flows/${m.rule.flow_id}`}>
                          <Workflow className="h-3.5 w-3.5 mr-1" /> Abrir fluxo
                        </Link>
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
