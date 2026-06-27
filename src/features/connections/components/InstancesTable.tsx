import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Smartphone, QrCode, RefreshCcw, Unplug, Trash2, Eye, Plug, KeyRound } from "lucide-react";
import type { WAInstance } from "../types";
import { InstanceStatusBadge } from "./InstanceStatusBadge";

type Action = "connect" | "reconnect" | "disconnect" | "delete-session" | "delete" | "view";

export function InstancesTable({
  instances, onAction,
}: {
  instances: WAInstance[];
  onAction: (action: Action, i: WAInstance) => void;
}) {
  if (!instances.length) return null;

  return (
    <Card className="bg-card border-border overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-3">Instância</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              <th className="text-left font-medium px-4 py-3">Número</th>
              <th className="text-left font-medium px-4 py-3">Sessão</th>
              <th className="text-left font-medium px-4 py-3">Último QR</th>
              <th className="text-left font-medium px-4 py-3">Última atividade</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {instances.map((i) => (
              <tr key={i.id} className="border-t border-border hover:bg-surface-1/60 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                      <Smartphone className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{i.name}</div>
                      {i.description && <div className="text-xs text-muted-foreground truncate max-w-[260px]">{i.description}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><InstanceStatusBadge status={i.status} /></td>
                <td className="px-4 py-3 text-muted-foreground">{i.connected_phone ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{i.session_saved ? "Sim" : "Não"}</td>
                <td className="px-4 py-3 text-muted-foreground">{i.last_qr_at ? formatDistanceToNow(new Date(i.last_qr_at), { addSuffix: true, locale: ptBR }) : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{i.last_activity_at ? formatDistanceToNow(new Date(i.last_activity_at), { addSuffix: true, locale: ptBR }) : "—"}</td>
                <td className="px-2 py-3">
                  <RowActions i={i} onAction={onAction} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-border">
        {instances.map((i) => (
          <div key={i.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Smartphone className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{i.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{i.connected_phone ?? "Sem número"}</div>
                </div>
              </div>
              <RowActions i={i} onAction={onAction} />
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <InstanceStatusBadge status={i.status} />
              <span className="text-xs text-muted-foreground">Sessão: {i.session_saved ? "salva" : "não salva"}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RowActions({ i, onAction }: { i: WAInstance; onAction: (a: Action, i: WAInstance) => void }) {
  const isConnected = i.status === "connected";
  return (
    <div className="flex justify-end">
      {isConnected ? (
        <Button size="sm" variant="outline" className="mr-1 hidden md:inline-flex" onClick={() => onAction("disconnect", i)}>
          <Unplug className="h-3.5 w-3.5 mr-1.5" /> Desconectar
        </Button>
      ) : (
        <Button size="sm" className="mr-1 hidden md:inline-flex" onClick={() => onAction("connect", i)}>
          <QrCode className="h-3.5 w-3.5 mr-1.5" /> {i.status === "disconnected" ? "Conectar" : "Abrir QR"}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => onAction("view", i)}>
            <Eye className="h-4 w-4 mr-2" /> Ver detalhes
          </DropdownMenuItem>
          {!isConnected && (
            <DropdownMenuItem onClick={() => onAction("connect", i)}>
              <Plug className="h-4 w-4 mr-2" /> Conectar
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => onAction("reconnect", i)}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Reconectar
          </DropdownMenuItem>
          {isConnected && (
            <DropdownMenuItem onClick={() => onAction("disconnect", i)}>
              <Unplug className="h-4 w-4 mr-2" /> Desconectar
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onAction("delete-session", i)}>
            <KeyRound className="h-4 w-4 mr-2" /> Apagar sessão
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onAction("delete", i)}>
            <Trash2 className="h-4 w-4 mr-2" /> Excluir instância
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
