import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyFlowError({ message }: { message?: string }) {
  const nav = useNavigate();
  return (
    <div className="h-[calc(100vh-3rem)] flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="h-14 w-14 rounded-full bg-destructive/10 text-destructive mx-auto flex items-center justify-center">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="font-display text-xl font-semibold">Fluxo não encontrado</h2>
        <p className="text-sm text-muted-foreground">
          {message ?? "Este fluxo não existe ou você não tem permissão para visualizá-lo."}
        </p>
        <Button onClick={() => nav("/flows")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Voltar para fluxos
        </Button>
      </div>
    </div>
  );
}
