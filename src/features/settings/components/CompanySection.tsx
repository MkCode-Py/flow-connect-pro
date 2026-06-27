import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCompanySettings } from "../hooks/useCompanySettings";
import { toast } from "sonner";

export function CompanySection() {
  const { data, update } = useCompanySettings();
  const [form, setForm] = useState({ company_name: "", public_name: "", phone: "", website: "", description: "" });

  useEffect(() => {
    if (data) setForm({
      company_name: data.company_name ?? "",
      public_name: data.public_name ?? "",
      phone: data.phone ?? "",
      website: data.website ?? "",
      description: data.description ?? "",
    });
  }, [data]);

  const onSave = async () => {
    try {
      await update.mutateAsync(form);
      toast.success("Dados da empresa atualizados");
    } catch (e) {
      toast.error("Erro ao salvar", { description: (e as Error).message });
    }
  };

  return (
    <Card className="p-6 bg-card border-border">
      <h2 className="font-display text-lg font-semibold mb-1">Empresa</h2>
      <p className="text-sm text-muted-foreground mb-5">
        O nome configurado aqui é usado em fluxos e respostas rápidas através da variável <code className="text-foreground">{`{{empresa}}`}</code>.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Nome da empresa</Label>
          <Input value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} placeholder="Ex.: Minha Empresa LTDA" />
        </div>
        <div>
          <Label>Nome público no atendimento</Label>
          <Input value={form.public_name} onChange={(e) => setForm((f) => ({ ...f, public_name: e.target.value }))} placeholder="Como o cliente vê" />
        </div>
        <div>
          <Label>Telefone principal</Label>
          <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+55 11 9XXXX-XXXX" />
        </div>
        <div>
          <Label>Site</Label>
          <Input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://..." />
        </div>
        <div className="sm:col-span-2">
          <Label>Descrição curta</Label>
          <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="Em uma frase, o que sua empresa oferece." />
        </div>
      </div>

      <div className="flex justify-end mt-5">
        <Button onClick={onSave} disabled={update.isPending}>{update.isPending ? "Salvando…" : "Salvar"}</Button>
      </div>
    </Card>
  );
}
