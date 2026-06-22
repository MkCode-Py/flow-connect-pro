import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageContainer, PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

export default function Settings() {
  const { user, signOut } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).single()).data,
  });
  useEffect(() => { if (profile.data?.display_name) setName(profile.data.display_name); }, [profile.data?.display_name]);

  const fields = useQuery({
    queryKey: ["custom_fields", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("custom_fields").select("*").eq("owner_id", user!.id).order("key")).data ?? [],
  });
  const addField = useMutation({
    mutationFn: async ({ key, label }: { key: string; label: string }) => { await supabase.from("custom_fields").insert({ owner_id: user!.id, key, label }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom_fields"] }),
  });
  const delField = useMutation({
    mutationFn: async (id: string) => { await supabase.from("custom_fields").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom_fields"] }),
  });

  const saveProfile = useMutation({
    mutationFn: async () => { await supabase.from("profiles").update({ display_name: name }).eq("id", user!.id); },
    onSuccess: () => toast({ title: "Perfil atualizado" }),
  });

  const [fieldKey, setFieldKey] = useState("");
  const [fieldLabel, setFieldLabel] = useState("");

  return (
    <PageContainer>
      <PageHeader title="Configurações" description="Perfil, campos personalizados e sessão." />

      <Card className="p-6 bg-card border-border max-w-2xl">
        <h2 className="font-display text-lg font-semibold mb-4">Perfil</h2>
        <div className="space-y-3">
          <div><Label>E-mail</Label><Input value={user?.email ?? ""} disabled /></div>
          <div><Label>Nome de exibição</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={signOut}>Sair</Button>
            <Button onClick={() => saveProfile.mutate()}>Salvar</Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card border-border max-w-2xl mt-4">
        <h2 className="font-display text-lg font-semibold mb-1">Campos personalizados do contato</h2>
        <p className="text-sm text-muted-foreground mb-4">Use em fluxos com <code>{`{{campo.chave}}`}</code>.</p>
        <div className="space-y-2">
          {(fields.data ?? []).map((f) => (
            <div key={f.id} className="flex items-center justify-between border border-border rounded-md px-3 py-2">
              <div><span className="font-mono text-xs text-muted-foreground">{f.key}</span> · <span className="text-sm">{f.label}</span></div>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => delField.mutate(f.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <Input placeholder="chave" value={fieldKey} onChange={(e) => setFieldKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))} className="font-mono" />
          <Input placeholder="Rótulo amigável" value={fieldLabel} onChange={(e) => setFieldLabel(e.target.value)} />
          <Button onClick={() => { if (fieldKey && fieldLabel) { addField.mutate({ key: fieldKey, label: fieldLabel }); setFieldKey(""); setFieldLabel(""); } }}><Plus className="h-4 w-4" /></Button>
        </div>
      </Card>

      <Card className="p-6 bg-card border-border max-w-2xl mt-4">
        <h2 className="font-display text-lg font-semibold mb-1">Segurança</h2>
        <p className="text-sm text-muted-foreground">Ative a verificação de senhas vazadas (HIBP) nas configurações de Autenticação da Lovable Cloud para mais proteção.</p>
      </Card>
    </PageContainer>
  );
}
