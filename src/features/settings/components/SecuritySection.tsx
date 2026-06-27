import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SecuritySection() {
  const { signOut } = useAuth();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);

  const changePassword = async () => {
    if (pwd.length < 8) return toast.error("Senha precisa ter ao menos 8 caracteres");
    if (pwd !== pwd2) return toast.error("As senhas não coincidem");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) return toast.error("Erro", { description: error.message });
    setPwd(""); setPwd2("");
    toast.success("Senha atualizada");
  };

  return (
    <Card className="p-6 bg-card border-border">
      <h2 className="font-display text-lg font-semibold mb-1">Segurança</h2>
      <p className="text-sm text-muted-foreground mb-5">Gerencie sua senha e o acesso à conta.</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Nova senha</Label>
          <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="mínimo 8 caracteres" />
        </div>
        <div>
          <Label>Confirmar senha</Label>
          <Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button onClick={changePassword} disabled={loading || !pwd}>Atualizar senha</Button>
      </div>

      <div className="mt-6 border border-amber-500/20 bg-amber-500/10 rounded-md p-4 flex gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-medium text-foreground mb-0.5">Sessões reais do WhatsApp</div>
          <p className="text-muted-foreground">
            As sessões de QR Code reais serão gerenciadas no backend Node.js (Baileys). Tokens e arquivos de autenticação ficam isolados por instância, fora do navegador. Nesta etapa MVP, tudo é mockado.
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-4 flex justify-between items-center">
        <div className="text-sm text-muted-foreground">Encerre a sessão neste navegador.</div>
        <Button variant="outline" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sair da conta
        </Button>
      </div>
    </Card>
  );
}
