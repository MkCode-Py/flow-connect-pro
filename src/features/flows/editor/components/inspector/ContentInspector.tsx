import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { TextWithVariables } from "./shared/TextWithVariables";
import { FieldError } from "./shared/FieldError";
import type { ContentData, ContentType } from "../../types";
import type { FieldErrors } from "../../schemas/nodeSchemas";

type Props = {
  draft: ContentData;
  setDraft: (next: ContentData) => void;
  errors: FieldErrors;
};

const TABS: { value: ContentType; label: string }[] = [
  { value: "text", label: "Texto" },
  { value: "image", label: "Imagem" },
  { value: "video", label: "Vídeo" },
  { value: "audio", label: "Áudio" },
  { value: "file", label: "Arquivo" },
  { value: "contact", label: "Contato" },
];

export function ContentInspector({ draft, setDraft, errors }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-[11px] text-muted-foreground">Nome do bloco</Label>
        <Input
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          className="h-8 mt-1"
        />
        <FieldError message={errors.label} />
      </div>

      <Tabs value={draft.contentType} onValueChange={(v) => setDraft({ ...draft, contentType: v as ContentType })}>
        <TabsList className="grid grid-cols-3 h-auto">
          {TABS.slice(0, 3).map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-[11px] py-1.5">{t.label}</TabsTrigger>
          ))}
        </TabsList>
        <TabsList className="grid grid-cols-3 h-auto mt-1">
          {TABS.slice(3).map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-[11px] py-1.5">{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="text" className="mt-3 space-y-3">
          <TextWithVariables
            label="Mensagem"
            value={draft.message}
            onChange={(v) => setDraft({ ...draft, message: v })}
            placeholder="Digite a mensagem que será enviada ao contato"
            error={errors.message}
            rows={6}
            showPreview
            hint="Use {{nome}}, {{primeiro_nome}}, {{telefone}}, {{empresa}} ou {{campo.<chave>}}"
          />
        </TabsContent>

        {(["image", "video", "audio", "file"] as ContentType[]).map((kind) => (
          <TabsContent key={kind} value={kind} className="mt-3 space-y-3">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-[11px]">
                Envio real de mídia será implementado depois. Por enquanto, salve a URL e a legenda.
              </AlertDescription>
            </Alert>
            <div>
              <Label className="text-[11px] text-muted-foreground">URL do arquivo</Label>
              <Input
                value={draft.mediaUrl ?? ""}
                onChange={(e) => setDraft({ ...draft, mediaUrl: e.target.value })}
                className="h-8 mt-1"
                placeholder="https://…"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Legenda (opcional)</Label>
              <Input
                value={draft.mediaCaption ?? ""}
                onChange={(e) => setDraft({ ...draft, mediaCaption: e.target.value })}
                className="h-8 mt-1"
              />
            </div>
          </TabsContent>
        ))}

        <TabsContent value="contact" className="mt-3 space-y-3">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-[11px]">
              Envio de cartão de contato será habilitado quando a conexão WhatsApp estiver ativa.
            </AlertDescription>
          </Alert>
          <div>
            <Label className="text-[11px] text-muted-foreground">Nome do contato</Label>
            <Input
              value={draft.contactName ?? ""}
              onChange={(e) => setDraft({ ...draft, contactName: e.target.value })}
              className="h-8 mt-1"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Telefone</Label>
            <Input
              value={draft.contactPhone ?? ""}
              onChange={(e) => setDraft({ ...draft, contactPhone: e.target.value })}
              className="h-8 mt-1"
              placeholder="+55…"
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-[12px]">Mostrar &quot;digitando…&quot;</Label>
            <p className="text-[10px] text-muted-foreground">Simula digitação antes do envio.</p>
          </div>
          <Switch
            checked={draft.enableTyping}
            onCheckedChange={(v) => setDraft({ ...draft, enableTyping: v })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[11px] text-muted-foreground">Tempo digitando (s)</Label>
            <Input
              type="number" min={0} max={60} step={1}
              value={draft.typingDelay}
              onChange={(e) => setDraft({ ...draft, typingDelay: Number(e.target.value) || 0 })}
              className="h-8 mt-1"
              disabled={!draft.enableTyping}
            />
            <FieldError message={errors.typingDelay} />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Delay próximo (s)</Label>
            <Input
              type="number" min={0} max={120} step={1}
              value={draft.nextDelay}
              onChange={(e) => setDraft({ ...draft, nextDelay: Number(e.target.value) || 0 })}
              className="h-8 mt-1"
            />
            <FieldError message={errors.nextDelay} />
          </div>
        </div>
      </div>
    </div>
  );
}
