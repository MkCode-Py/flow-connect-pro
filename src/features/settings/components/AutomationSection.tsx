import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanySettings } from "../hooks/useCompanySettings";
import { toast } from "sonner";

export function AutomationSection() {
  const { data, update } = useCompanySettings();
  const [enabled, setEnabled] = useState(true);
  const [maxMsgs, setMaxMsgs] = useState(20);
  const [delay, setDelay] = useState(800);
  const [handoff, setHandoff] = useState("pause_automation");
  const [paused, setPaused] = useState("ignore");

  useEffect(() => {
    if (data) {
      setEnabled(data.automation_enabled);
      setMaxMsgs(data.max_auto_messages_per_conversation);
      setDelay(data.default_message_delay_ms);
      setHandoff(data.on_human_handoff);
      setPaused(data.on_paused_behavior);
    }
  }, [data]);

  const onSave = async () => {
    try {
      await update.mutateAsync({
        automation_enabled: enabled,
        max_auto_messages_per_conversation: maxMsgs,
        default_message_delay_ms: delay,
        on_human_handoff: handoff,
        on_paused_behavior: paused,
      });
      toast.success("Configuração de automação salva");
    } catch (e) {
      toast.error("Erro ao salvar", { description: (e as Error).message });
    }
  };

  return (
    <Card className="p-6 bg-card border-border">
      <h2 className="font-display text-lg font-semibold mb-1">Automação global</h2>
      <p className="text-sm text-muted-foreground mb-5">Comportamento padrão da engine. Pode ser sobrescrito por conversa na inbox.</p>

      <div className="flex items-center justify-between border border-border rounded-md px-4 py-3 mb-5">
        <div>
          <div className="font-medium text-sm">Automação ativa</div>
          <div className="text-xs text-muted-foreground">Quando desligada, nenhuma mensagem recebida dispara fluxos.</div>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Limite de mensagens automáticas por conversa</Label>
          <Input type="number" min={1} max={200} value={maxMsgs} onChange={(e) => setMaxMsgs(Number(e.target.value) || 0)} />
          <p className="text-xs text-muted-foreground mt-1">Evita loops e abuso.</p>
        </div>
        <div>
          <Label>Delay padrão entre mensagens (ms)</Label>
          <Input type="number" min={0} max={10000} step={100} value={delay} onChange={(e) => setDelay(Number(e.target.value) || 0)} />
          <p className="text-xs text-muted-foreground mt-1">Simula digitação. 800 ms é um bom padrão.</p>
        </div>
        <div>
          <Label>Ao transferir para humano</Label>
          <Select value={handoff} onValueChange={setHandoff}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pause_automation">Pausar automação automaticamente</SelectItem>
              <SelectItem value="keep_running">Manter automação rodando</SelectItem>
              <SelectItem value="notify_only">Apenas notificar atendente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Quando a automação está pausada</Label>
          <Select value={paused} onValueChange={setPaused}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ignore">Ignorar mensagens recebidas</SelectItem>
              <SelectItem value="log_only">Apenas registrar sem responder</SelectItem>
              <SelectItem value="auto_resume_24h">Retomar automaticamente após 24h</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end mt-5">
        <Button onClick={onSave} disabled={update.isPending}>{update.isPending ? "Salvando…" : "Salvar"}</Button>
      </div>
    </Card>
  );
}
