/** Aba "Variáveis": mostra todas as variáveis disponíveis e seus valores. */
import { ScrollArea } from "@/components/ui/scroll-area";
import { collectAllVariables, type SimulationContact } from "@/features/flows/engine";

type Props = {
  contact: SimulationContact;
  variables: Record<string, string>;
};

export function SimulatorVariablesPanel({ contact, variables }: Props) {
  const list = collectAllVariables({ contact, variables });
  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-1">
        {list.map((v) => (
          <div key={v.key} className="flex items-start gap-2 rounded-md border border-border bg-card/40 px-2.5 py-1.5">
            <code className="text-[11px] font-mono text-primary shrink-0">{`{{${v.key}}}`}</code>
            <span className="text-xs text-foreground/90 truncate flex-1 text-right">
              {v.value || <span className="text-muted-foreground italic">vazio</span>}
            </span>
          </div>
        ))}
        {!list.length && <p className="p-4 text-xs text-muted-foreground text-center">Sem variáveis.</p>}
      </div>
    </ScrollArea>
  );
}
