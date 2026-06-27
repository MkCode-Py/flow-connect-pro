import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

const STORAGE_KEY = "mkflow.validation-checklist.v1";

type Group = { title: string; items: string[] };
const GROUPS: Group[] = [
  {
    title: "Fluxos e Editor",
    items: [
      "Criar pasta e mover fluxo entre pastas",
      "Criar fluxo a partir de template",
      "Abrir editor, adicionar bloco de conteúdo e bloco de menu",
      "Conectar blocos e salvar (autosave aparece como 'Salvo')",
      "Recarregar a página e ver o grafo intacto",
    ],
  },
  {
    title: "Inspector",
    items: [
      "Editar mensagem de conteúdo (preview de variáveis funciona)",
      "Editar opções de menu (handles dinâmicos aparecem/somem)",
      "Editar condição com regras true/false",
      "Editar ação que aplica tag ou atualiza campo personalizado",
    ],
  },
  {
    title: "Simulador",
    items: [
      "Iniciar teste pelo bloco start",
      "Escolher opção de menu por número e por texto",
      "Capturar resposta em bloco pergunta",
      "Encerrar fluxo em bloco end",
      "Bloco ativo destacado no canvas",
    ],
  },
  {
    title: "Automação reativa",
    items: [
      "Criar palavra-chave vinculada a um fluxo",
      "Testar mensagem no painel e ver match",
      "Alterar prioridade e ver ordenação refletida",
    ],
  },
  {
    title: "Inbox",
    items: [
      "Abrir conversa e enviar mensagem mock",
      "Simular mensagem recebida",
      "Pausar e retomar automação na conversa",
      "Usar resposta rápida via /atalho com variáveis resolvidas",
      "Aplicar e remover tag no contato",
    ],
  },
  {
    title: "Conexões",
    items: [
      "Criar instância e abrir QR mock",
      "Ver contador de 30s e gerar novo QR",
      "Simular conexão e ver status 'connected'",
      "Desconectar, apagar sessão, excluir instância",
    ],
  },
  {
    title: "Configurações",
    items: [
      "Atualizar perfil e nome da empresa",
      "Definir horários de atendimento e mensagem fora do horário",
      "Criar campo personalizado e usá-lo na ficha do contato",
      "Alterar senha (se aplicável)",
    ],
  },
];

export function ValidationChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try { setChecked(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
  }, [checked]);

  const toggle = (k: string) => setChecked((c) => ({ ...c, [k]: !c[k] }));
  const total = GROUPS.reduce((a, g) => a + g.items.length, 0);
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Progresso salvo localmente neste navegador. <strong className="text-foreground">{done}/{total}</strong> itens verificados.
      </div>
      {GROUPS.map((g) => (
        <div key={g.title} className="border border-border rounded-md p-4">
          <div className="font-medium text-sm mb-3">{g.title}</div>
          <div className="space-y-2">
            {g.items.map((it) => {
              const key = `${g.title}::${it}`;
              return (
                <label key={key} className="flex items-start gap-2 text-sm cursor-pointer">
                  <Checkbox checked={!!checked[key]} onCheckedChange={() => toggle(key)} className="mt-0.5" />
                  <span className={checked[key] ? "line-through text-muted-foreground" : ""}>{it}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
