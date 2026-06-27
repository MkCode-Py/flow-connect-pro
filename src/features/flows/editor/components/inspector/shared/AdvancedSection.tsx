import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function AdvancedSection({ nodeId, nodeType, data }: { nodeId: string; nodeType: string; data: unknown }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  return (
    <Accordion type="single" collapsible className="border-t border-border">
      <AccordionItem value="adv" className="border-0">
        <AccordionTrigger className="px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground hover:no-underline">
          Avançado
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-[80px_1fr] gap-y-1.5 text-[11px]">
            <span className="text-muted-foreground">ID</span>
            <code className="font-mono text-foreground/80 break-all">{nodeId}</code>
            <span className="text-muted-foreground">Tipo</span>
            <code className="font-mono text-foreground/80">{nodeType}</code>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">JSON do bloco</span>
              <Button
                size="sm" variant="ghost" className="h-6 px-2 text-[11px]"
                onClick={() => {
                  navigator.clipboard.writeText(json);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
            <pre className="text-[10px] font-mono bg-surface-2 border border-border rounded-md p-2 max-h-56 overflow-auto">
              {json}
            </pre>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
