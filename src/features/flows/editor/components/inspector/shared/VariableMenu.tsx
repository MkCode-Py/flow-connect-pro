import { Braces } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DEFAULT_VARIABLES, buildCustomFieldVariables, type VariableDef } from "../../../utils/variableHelpers";
import { useCustomFields } from "../../../hooks/useTaxonomy";

type Props = {
  onPick: (token: string) => void;
  size?: "sm" | "xs";
};

export function VariableMenu({ onPick, size = "sm" }: Props) {
  const { data: fields } = useCustomFields();
  const all: VariableDef[] = [
    ...DEFAULT_VARIABLES,
    ...buildCustomFieldVariables(fields ?? []),
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size === "xs" ? "sm" : "sm"}
          className={size === "xs" ? "h-6 px-2 text-[11px]" : "h-7 px-2 text-[11px]"}
        >
          <Braces className="h-3 w-3 mr-1" />
          Variável
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-[11px]">Padrão</DropdownMenuLabel>
        {DEFAULT_VARIABLES.map((v) => (
          <DropdownMenuItem key={v.key} onClick={() => onPick(`{{${v.key}}}`)}>
            <code className="font-mono text-xs">{`{{${v.key}}}`}</code>
            <span className="ml-auto text-[10px] text-muted-foreground">{v.label}</span>
          </DropdownMenuItem>
        ))}
        {(fields ?? []).length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px]">Campos personalizados</DropdownMenuLabel>
            {all.filter((v) => v.key.startsWith("campo.")).map((v) => (
              <DropdownMenuItem key={v.key} onClick={() => onPick(`{{${v.key}}}`)}>
                <code className="font-mono text-xs truncate">{`{{${v.key}}}`}</code>
                <span className="ml-auto text-[10px] text-muted-foreground truncate">{v.label}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
