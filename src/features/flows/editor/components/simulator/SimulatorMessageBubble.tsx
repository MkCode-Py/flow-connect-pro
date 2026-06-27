/** Bolha de mensagem do simulador (estilo WhatsApp). */
import { cn } from "@/lib/utils";
import { Image as ImageIcon, FileText, Video, Music, User, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import type { BotOutput } from "@/features/flows/engine";

type Props = {
  output: BotOutput;
  /** Se true, é mensagem do usuário; usa o mesmo container mas alinhamento à direita. */
  fromUser?: boolean;
  /** Para mensagens do usuário, conteúdo textual livre. */
  text?: string;
  /** Quando definido, opções de menu viram botões clicáveis (modo "buttons"). */
  onSelectOption?: (optionTitle: string) => void;
  /** Marca o menu como ativo (aguardando resposta); buttons desabilitados quando false. */
  menuActive?: boolean;
};

const mediaIcon = {
  image: ImageIcon, video: Video, audio: Music, file: FileText, contact: User,
};

const toneStyle: Record<"info" | "warning" | "error" | "success", { bg: string; fg: string; Icon: typeof Info }> = {
  info:    { bg: "bg-muted/40 border-border", fg: "text-muted-foreground", Icon: Info },
  warning: { bg: "bg-warning/10 border-warning/30", fg: "text-warning", Icon: AlertCircle },
  error:   { bg: "bg-destructive/10 border-destructive/30", fg: "text-destructive", Icon: AlertCircle },
  success: { bg: "bg-success/10 border-success/30", fg: "text-success", Icon: CheckCircle2 },
};

function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function SimulatorMessageBubble({ output, fromUser, text, onSelectOption, menuActive }: Props) {
  if (fromUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-3 py-2 text-sm shadow-sm">
          <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
          <p className="text-[10px] text-primary-foreground/70 text-right mt-1">{fmtTime(Date.now())}</p>
        </div>
      </div>
    );
  }

  if (output.kind === "system") {
    const s = toneStyle[output.tone];
    const Icon = s.Icon;
    return (
      <div className="flex justify-center">
        <div className={cn("inline-flex items-start gap-2 max-w-[88%] rounded-md border px-3 py-1.5 text-xs", s.bg, s.fg)}>
          <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span className="leading-relaxed">{output.body}</span>
        </div>
      </div>
    );
  }

  if (output.kind === "text") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[78%] rounded-2xl rounded-bl-sm bg-card border border-border px-3 py-2 text-sm shadow-sm">
          <p className="whitespace-pre-wrap leading-relaxed">{output.body || <span className="text-muted-foreground italic">(sem texto)</span>}</p>
          <p className="text-[10px] text-muted-foreground text-right mt-1">{fmtTime(output.timestamp)}</p>
        </div>
      </div>
    );
  }

  if (output.kind === "media_mock") {
    const Icon = mediaIcon[output.mediaType] ?? FileText;
    return (
      <div className="flex justify-start">
        <div className="max-w-[78%] rounded-2xl rounded-bl-sm bg-card border border-border px-3 py-2 text-sm shadow-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide mb-1">
            <Icon className="h-3.5 w-3.5" />
            <span>{output.mediaType}</span>
            <span className="text-[10px] opacity-60">· mock</span>
          </div>
          <p className="whitespace-pre-wrap leading-relaxed">{output.body}</p>
          <p className="text-[10px] text-muted-foreground text-right mt-1">{fmtTime(output.timestamp)}</p>
        </div>
      </div>
    );
  }

  // menu
  const isButtons = output.inputMode === "buttons";
  return (
    <div className="flex justify-start">
      <div className="max-w-[78%] rounded-2xl rounded-bl-sm bg-card border border-border px-3 py-2 text-sm shadow-sm space-y-2">
        <p className="whitespace-pre-wrap leading-relaxed">{output.question}</p>
        {output.helper && <p className="text-xs text-muted-foreground">{output.helper}</p>}

        {isButtons ? (
          <div className="flex flex-col gap-1 pt-1.5 border-t border-border/60">
            {output.options.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={!menuActive || !onSelectOption}
                onClick={() => onSelectOption?.(o.title)}
                className={cn(
                  "w-full text-center text-[13px] font-medium rounded-lg px-3 py-2 border transition-colors",
                  menuActive && onSelectOption
                    ? "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 cursor-pointer"
                    : "border-border bg-muted/30 text-muted-foreground cursor-not-allowed",
                )}
              >
                {o.title}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-1 pt-1 border-t border-border/60">
            {output.options.map((o) => (
              <div key={o.id} className="text-xs text-foreground/90">
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded bg-primary/10 text-primary font-medium mr-2">
                  {o.shortcut || "•"}
                </span>
                {o.title}
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-right">{fmtTime(output.timestamp)}</p>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-sm bg-card border border-border px-3 py-2 shadow-sm">
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce" />
        </div>
      </div>
    </div>
  );
}
