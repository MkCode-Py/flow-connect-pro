/** Chat do simulador: lista de mensagens + composer. */
import { useEffect, useRef } from "react";
import { Send, RotateCw, Eraser, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { SimulatorMessageBubble, TypingIndicator } from "./SimulatorMessageBubble";
import type { BotOutput, EngineStatus } from "@/features/flows/engine";

export type ChatMessage =
  | { kind: "bot"; output: BotOutput }
  | { kind: "user"; id: string; text: string; timestamp: number };

type Props = {
  messages: ChatMessage[];
  status: EngineStatus;
  typing: boolean;
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onRestart: () => void;
  onClear: () => void;
  onSimulateTimeout: () => void;
  canSimulateTimeout: boolean;
  /** Disparado quando o usuário clica num botão de menu interativo. */
  onSelectMenuOption: (optionTitle: string) => void;
  /** ID do output do menu que está aguardando resposta (para habilitar os botões). */
  activeMenuOutputId: string | null;
};

const STATUS_HINT: Record<EngineStatus, { label: string; tone: string }> = {
  idle:                     { label: "Pronto para iniciar",         tone: "text-muted-foreground" },
  running:                  { label: "Executando...",                tone: "text-primary" },
  waiting_input:            { label: "Aguardando entrada",           tone: "text-primary" },
  waiting_menu_reply:       { label: "Aguardando opção do menu",     tone: "text-primary" },
  waiting_question_reply:   { label: "Aguardando resposta",          tone: "text-primary" },
  transferred_to_human:     { label: "Transferido para humano",      tone: "text-warning" },
  finished:                 { label: "Fluxo finalizado",             tone: "text-muted-foreground" },
  error:                    { label: "Erro na execução",             tone: "text-destructive" },
};

export function SimulatorChat({
  messages, status, typing, input, onInputChange, onSend, onRestart, onClear, onSimulateTimeout, canSimulateTimeout,
  onSelectMenuOption, activeMenuOutputId,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current?.querySelector<HTMLDivElement>("[data-radix-scroll-area-viewport]");
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  const acceptingInput =
    status === "waiting_menu_reply" || status === "waiting_question_reply";
  const inputDisabled = !acceptingInput || typing;

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!inputDisabled && input.trim()) onSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className={cn("text-xs font-medium", STATUS_HINT[status].tone)}>
          {STATUS_HINT[status].label}
        </span>
        <div className="flex items-center gap-1">
          {canSimulateTimeout && (
            <Button variant="ghost" size="sm" onClick={onSimulateTimeout} className="h-7 gap-1.5 text-xs">
              <Clock className="h-3 w-3" /> Timeout
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClear} className="h-7 gap-1.5 text-xs">
            <Eraser className="h-3 w-3" /> Limpar
          </Button>
          <Button variant="ghost" size="sm" onClick={onRestart} className="h-7 gap-1.5 text-xs">
            <RotateCw className="h-3 w-3" /> Reiniciar
          </Button>
        </div>
      </div>

      <ScrollArea ref={scrollerRef} className="flex-1 bg-[hsl(var(--background))]">
        <div className="p-3 space-y-2">
          {messages.length === 0 && (
            <div className="text-center py-10 text-xs text-muted-foreground">
              Inicie a simulação clicando em <span className="text-foreground font-medium">Reiniciar</span> ou
              ajuste o fluxo e teste aqui em tempo real.
            </div>
          )}
          {messages.map((m) =>
            m.kind === "user"
              ? <SimulatorMessageBubble key={m.id} output={{ kind: "system", id: m.id, body: "", tone: "info", timestamp: m.timestamp }} fromUser text={m.text} />
              : <SimulatorMessageBubble
                  key={m.output.id}
                  output={m.output}
                  onSelectOption={onSelectMenuOption}
                  menuActive={m.output.kind === "menu" && m.output.id === activeMenuOutputId && status === "waiting_menu_reply"}
                />,
          )}
          {typing && <TypingIndicator />}
        </div>
      </ScrollArea>

      <div className="border-t border-border p-2.5 bg-card/30">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder={
              status === "finished" ? "Fluxo finalizado. Reinicie para testar novamente."
                : status === "transferred_to_human" ? "Conversa transferida para humano."
                : status === "idle" ? "Clique em Reiniciar para começar"
                : acceptingInput ? "Digite como cliente..." : "Aguardando o bot..."
            }
            disabled={inputDisabled}
            rows={1}
            className="min-h-[36px] max-h-[120px] resize-none text-sm"
          />
          <Button onClick={onSend} disabled={inputDisabled || !input.trim()} size="icon" className="h-9 w-9 shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
