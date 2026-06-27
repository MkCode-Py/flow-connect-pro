import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TYPES = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "date", label: "Data" },
  { value: "boolean", label: "Booleano" },
] as const;
type FieldType = (typeof TYPES)[number]["value"];

type CustomField = { id: string; key: string; label: string; type: FieldType };

export function CustomFieldsSection() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const fields = useQuery({
    queryKey: ["custom_fields", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("custom_fields").select("*").eq("owner_id", user!.id).order("key");
      return (data ?? []) as unknown as CustomField[];
    },
  });

  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<FieldType>("text");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editType, setEditType] = useState<FieldType>("text");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["custom_fields", user?.id] });

  const addField = useMutation({
    mutationFn: async () => {
      if (!newKey || !newLabel) throw new Error("Preencha chave e rótulo.");
      const { error } = await supabase.from("custom_fields").insert({
        owner_id: user!.id, key: newKey, label: newLabel, type: newType,
      });
      if (error) throw error;
    },
    onSuccess: () => { setNewKey(""); setNewLabel(""); setNewType("text"); invalidate(); toast.success("Campo criado"); },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const updateField = useMutation({
    mutationFn: async ({ id, label, type }: { id: string; label: string; type: FieldType }) => {
      const { error } = await supabase.from("custom_fields").update({ label, type }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { setEditingId(null); invalidate(); toast.success("Campo atualizado"); },
  });

  const delField = useMutation({
    mutationFn: async (id: string) => { await supabase.from("custom_fields").delete().eq("id", id); },
    onSuccess: () => { invalidate(); toast.success("Campo removido"); },
  });

  return (
    <Card className="p-6 bg-card border-border">
      <h2 className="font-display text-lg font-semibold mb-1">Campos personalizados do contato</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Disponíveis em perguntas, condições e na ficha do contato. Use <code>{`{{campo.chave}}`}</code> em textos.
      </p>

      <div className="space-y-2 mb-5">
        {(fields.data ?? []).length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-md">
            Nenhum campo personalizado ainda.
          </div>
        )}
        {(fields.data ?? []).map((f) => {
          const isEditing = editingId === f.id;
          return (
            <div key={f.id} className="flex items-center gap-3 border border-border rounded-md px-3 py-2">
              <Badge variant="outline" className="font-mono text-xs">{f.key}</Badge>
              {isEditing ? (
                <>
                  <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="flex-1" />
                  <Select value={editType} onValueChange={(v) => setEditType(v as FieldType)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" onClick={() => updateField.mutate({ id: f.id, label: editLabel, type: editType })}>
                    <Check className="h-4 w-4 text-success" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm flex-1">{f.label}</span>
                  <Badge variant="secondary" className="text-xs">{TYPES.find((t) => t.value === f.type)?.label ?? f.type}</Badge>
                  <Button size="icon" variant="ghost" onClick={() => { setEditingId(f.id); setEditLabel(f.label); setEditType(f.type); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => delField.mutate(f.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-border pt-5">
        <div className="text-sm font-medium mb-3">Novo campo</div>
        <div className="grid grid-cols-[1fr_1fr_140px_auto] gap-2">
          <div>
            <Label className="text-xs">Chave</Label>
            <Input placeholder="cpf" value={newKey} onChange={(e) => setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))} className="font-mono" />
          </div>
          <div>
            <Label className="text-xs">Rótulo</Label>
            <Input placeholder="CPF do cliente" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={newType} onValueChange={(v) => setNewType(v as FieldType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={() => addField.mutate()} disabled={addField.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
