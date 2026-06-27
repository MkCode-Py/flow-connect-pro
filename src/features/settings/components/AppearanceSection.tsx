import { Card } from "@/components/ui/card";
import { Moon } from "lucide-react";

export function AppearanceSection() {
  return (
    <Card className="p-6 bg-card border-border">
      <h2 className="font-display text-lg font-semibold mb-1">Aparência</h2>
      <p className="text-sm text-muted-foreground mb-5">A interface usa tema dark otimizado para operações longas.</p>

      <div className="flex items-center gap-3 border border-border rounded-md px-4 py-3">
        <div className="h-9 w-9 rounded-md bg-primary/15 text-primary flex items-center justify-center">
          <Moon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm">Dark mode (padrão)</div>
          <div className="text-xs text-muted-foreground">Light mode poderá ser adicionado em versões futuras.</div>
        </div>
      </div>
    </Card>
  );
}
