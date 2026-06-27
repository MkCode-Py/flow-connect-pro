import { Copy, FlaskConical, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MATCH_RULE_LABEL, type KeywordRule } from "../types";

type Props = {
  rules: KeywordRule[];
  flows: Array<{ id: string; name: string }>;
  onEdit: (r: KeywordRule) => void;
  onDuplicate: (r: KeywordRule) => void;
  onDelete: (r: KeywordRule) => void;
  onToggle: (r: KeywordRule, value: boolean) => void;
  onTest: (r: KeywordRule) => void;
};

export function KeywordsTable({ rules, flows, onEdit, onDuplicate, onDelete, onToggle, onTest }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead>Regra</TableHead>
          <TableHead>Fluxo vinculado</TableHead>
          <TableHead>Correspondência</TableHead>
          <TableHead>Termos</TableHead>
          <TableHead className="text-center">Execuções</TableHead>
          <TableHead>Atualizada</TableHead>
          <TableHead className="w-20 text-center">Ativa</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((r) => {
          const flow = flows.find((f) => f.id === r.flow_id);
          return (
            <TableRow key={r.id} className="border-border">
              <TableCell className="align-top">
                <div className="font-medium text-sm">{r.name}</div>
                <div className="text-[11px] text-muted-foreground">prioridade {r.priority}{!r.is_active && " · inativa"}</div>
              </TableCell>
              <TableCell className="align-top">
                {flow ? (
                  <span className="text-sm">{flow.name}</span>
                ) : (
                  <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">Sem fluxo</Badge>
                )}
              </TableCell>
              <TableCell className="align-top">
                <Badge variant="outline" className="text-[10px]">{MATCH_RULE_LABEL[r.match_rule]}</Badge>
              </TableCell>
              <TableCell className="align-top max-w-[260px]">
                <div className="flex flex-wrap gap-1">
                  {r.terms.slice(0, 4).map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px] bg-accent/10 text-accent border-accent/20">{t}</Badge>
                  ))}
                  {r.terms.length > 4 && (
                    <Badge variant="outline" className="text-[10px]">+{r.terms.length - 4}</Badge>
                  )}
                  {r.terms.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                </div>
              </TableCell>
              <TableCell className="align-top text-center tabular-nums text-sm">{r.executions}</TableCell>
              <TableCell className="align-top text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(r.updated_at), { addSuffix: true, locale: ptBR })}
              </TableCell>
              <TableCell className="align-top text-center">
                <Switch checked={r.is_active} onCheckedChange={(v) => onToggle(r, v)} />
              </TableCell>
              <TableCell className="align-top">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(r)}><Pencil className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onTest(r)}><FlaskConical className="h-4 w-4 mr-2" /> Testar regra</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(r)}><Copy className="h-4 w-4 mr-2" /> Duplicar</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(r)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
