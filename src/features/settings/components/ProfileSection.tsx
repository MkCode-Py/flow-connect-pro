import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ProfileSection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).single()).data,
  });

  useEffect(() => {
    if (profile.data) {
      setName(profile.data.display_name ?? "");
      setAvatarUrl(profile.data.avatar_url ?? "");
    }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles")
        .update({ display_name: name, avatar_url: avatarUrl || null })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const initials = (name || user?.email || "?").slice(0, 2).toUpperCase();

  return (
    <Card className="p-6 bg-card border-border">
      <h2 className="font-display text-lg font-semibold mb-1">Perfil</h2>
      <p className="text-sm text-muted-foreground mb-5">Como você aparece dentro da plataforma.</p>

      <div className="flex items-center gap-4 mb-5">
        <Avatar className="h-16 w-16">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <Label className="text-xs">URL do avatar</Label>
          <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>E-mail</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <div>
          <Label>Nome de exibição</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
        </div>
      </div>

      <div className="flex justify-end mt-5">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Salvando…" : "Salvar perfil"}
        </Button>
      </div>
    </Card>
  );
}
