import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCompanySettings, type ServiceHours } from "../hooks/useCompanySettings";
import { toast } from "sonner";

const DAYS: Array<{ key: keyof ServiceHours; label: string }> = [
  { key: "mon", label: "Segunda" },
  { key: "tue", label: "Terça" },
  { key: "wed", label: "Quarta" },
  { key: "thu", label: "Quinta" },
  { key: "fri", label: "Sexta" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

export function ServiceHoursSection() {
  const { data, update, DEFAULT_HOURS } = useCompanySettings();
  const [active, setActive] = useState(true);
  const [hours, setHours] = useState<ServiceHours>(DEFAULT_HOURS);
  const [offMsg, setOffMsg] = useState("");

  useEffect(() => {
    if (data) {
      setActive(data.service_active);
      setHours(data.service_hours ?? DEFAULT_HOURS);
      setOffMsg(data.off_hours_message ?? "");
    }
  }, [data, DEFAULT_HOURS]);

  const onSave = async () => {
    try {
      await update.mutateAsync({ service_active: active, service_hours: hours, off_hours_message: offMsg });
      toast.success("Atendimento atualizado");
    } catch (e) {
      toast.error("Erro ao salvar", { description: (e as Error).message });
    }
  };

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="font-display text-lg font-semibold">Atendimento</h2>
          <p className="text-sm text-muted-foreground">Defina os horários e a resposta automática fora do expediente.</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={active} onCheckedChange={setActive} />
          <span className="text-sm">{active ? "Ativo" : "Pausado"}</span>
        </div>
      </div>

      <div className="space-y-2">
        {DAYS.map((d) => {
          const v = hours[d.key];
          return (
            <div key={d.key} className="grid grid-cols-[120px_70px_1fr_1fr] items-center gap-3 border border-border rounded-md px-3 py-2">
              <div className="text-sm font-medium">{d.label}</div>
              <Switch
                checked={v.enabled}
                onCheckedChange={(checked) => setHours((h) => ({ ...h, [d.key]: { ...v, enabled: checked } }))}
              />
              <Input type="time" value={v.start} disabled={!v.enabled}
                onChange={(e) => setHours((h) => ({ ...h, [d.key]: { ...v, start: e.target.value } }))} />
              <Input type="time" value={v.end} disabled={!v.enabled}
                onChange={(e) => setHours((h) => ({ ...h, [d.key]: { ...v, end: e.target.value } }))} />
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <Label>Mensagem fora do horário</Label>
        <Textarea rows={3} value={offMsg} onChange={(e) => setOffMsg(e.target.value)}
          placeholder="Olá! Nosso atendimento está fora do horário." />
      </div>

      <div className="flex justify-end mt-5">
        <Button onClick={onSave} disabled={update.isPending}>{update.isPending ? "Salvando…" : "Salvar"}</Button>
      </div>
    </Card>
  );
}
