import { PageContainer, PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code2, Database, Workflow, Zap, Shield, Server, Plug, BookOpen } from "lucide-react";

export default function DevNotes() {
  return (
    <PageContainer>
      <PageHeader
        title="Dev Notes"
        description="Documentação técnica para o Claude Code continuar a integração real do WhatsApp."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <nav className="space-y-1 lg:sticky lg:top-16 self-start">
          {(
            [
              ["#visao", "Visão geral", BookOpen],
              ["#arquitetura", "Arquitetura", Server],
              ["#schema", "Banco de dados", Database],
              ["#engine", "Engine de automação", Workflow],
              ["#automacao", "Automação reativa", Zap],
              ["#adapter", "WhatsAppAdapter", Plug],
              ["#integracao", "Plugar Baileys", Code2],
              ["#seguranca", "Segurança", Shield],
              ["#setup", "Setup local", Zap],
            ] as const
          ).map(([href, label, Icon]) => (
            <a key={href} href={href} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </a>
          ))}
        </nav>

        <div className="space-y-6 max-w-3xl">
          <Section id="visao" title="Visão geral">
            <p>O MK Flow é um SaaS de automação de WhatsApp com editor visual de fluxos, palavras-chave, inbox e adapter pronto para conexão real.</p>
            <p>No <strong>MVP</strong>, a UI já está completa e usa um <code>MockWhatsAppAdapter</code>. A conexão real será implementada em um backend Node.js separado, mantendo o contrato definido aqui.</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Frontend: React + Vite + Tailwind + shadcn + React Flow.</li>
              <li>Backend gerenciado: Lovable Cloud (Postgres + Auth + RLS).</li>
              <li>Backend WhatsApp (a fazer): Node.js + Baileys ou whatsapp-web.js.</li>
            </ul>
          </Section>

          <Section id="arquitetura" title="Arquitetura">
            <Pre>{`
+--------------------+      +-----------------------+      +---------------------+
|  React (UI/PWA)    | <--> | Lovable Cloud (DB/Auth)| <-- |  Backend Node.js     |
|  - editor de fluxo |      | - profiles, flows,     |      |  (a implementar)     |
|  - inbox, automac. |      |   keywords, msgs, ...  |      |  - Baileys session   |
|  - adapter (mock)  |      |  RLS por owner_id      |      |  - Webhook receiver  |
+--------------------+      +-----------------------+      +---------------------+
        ^                                                            |
        |   eventos (qr.generated, message.received, ...)            |
        +------------------------------------------------------------+
`}</Pre>
          </Section>

          <Section id="schema" title="Banco de dados">
            <p>Todas as tabelas têm <code>owner_id</code> e RLS estrita (<code>auth.uid() = owner_id</code>).</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {["profiles", "whatsapp_instances", "tags", "contacts", "contact_tags", "conversations", "messages", "flow_folders", "flows", "keywords", "sequences", "webhooks", "quick_replies", "custom_fields", "automation_logs"].map((t) => (
                <Badge key={t} variant="outline" className="justify-start">{t}</Badge>
              ))}
            </div>
            <p className="text-sm"><strong>flows.graph</strong> (jsonb) guarda <code>{`{ nodes, edges, viewport }`}</code> do React Flow. A engine consome esse mesmo formato.</p>
          </Section>

          <Section id="engine" title="Engine de automação (Etapa 5)">
            <p>
              Implementada em <code>src/features/flows/engine/</code> como TypeScript puro, sem dependência de React.
              A mesma classe será reutilizada pelo backend Node quando o WhatsApp real estiver conectado.
            </p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li><code>flowEngine.ts</code> — classe <code>FlowEngine</code>, orquestra execução nó a nó.</li>
              <li><code>variableResolver.ts</code> — resolve <code>{`{{primeiro_nome}}`}</code>, <code>{`{{campo.x}}`}</code>, <code>{`{{resposta.x}}`}</code>.</li>
              <li><code>menuMatcher.ts</code> — normalização (acentos/case/pontuação) + shortcut/título/acceptedValues.</li>
              <li><code>conditionEvaluator.ts</code> — avalia regras com modo <code>all</code>/<code>any</code>.</li>
              <li><code>actionExecutor.ts</code> — muta contato (tags, custom fields, status, pausar, transferir).</li>
              <li><code>graphTraversal.ts</code> — <code>getNextNode</code> respeitando <code>sourceHandle</code> dinâmico.</li>
              <li><code>simulationState.ts</code> + <code>engineLogger.ts</code> — estado e logs estruturados.</li>
            </ul>
            <p className="text-sm">
              No simulador (editor), o painel "Testar" instancia <code>new FlowEngine(graph, contato)</code>, escuta
              cada <code>tick</code> retornado por <code>start()</code> / <code>sendUserMessage()</code> /
              <code>simulateTimeout()</code> e renderiza outputs no chat com typing/delays.
              <strong> Nada de envio real é feito aqui.</strong>
            </p>
            <Pre>{`// Uso no backend real (futuro):
import { FlowEngine } from "@/features/flows/engine";

async function onWhatsAppMessage(msg, contact, activeFlow) {
  const engine = new FlowEngine(activeFlow.graph, contact, {
    resolveFlow: (id) => db.flows.getGraph(id),
  });
  engine.setTagNames(tagsById);

  // primeira vez: start. Próximas: sendUserMessage(msg.body)
  const tick = state.waitingNodeId
    ? await engine.sendUserMessage(msg.body)
    : await engine.start();

  for (const out of tick.outputs) {
    if (out.kind === "text")  await whatsapp.send(contact.phone, out.body);
    if (out.kind === "menu")  await whatsapp.send(contact.phone, formatMenu(out));
    if (out.kind === "media_mock") await whatsapp.sendMedia(...);
  }
  for (const log of tick.logs) await db.automation_logs.insert(log);
  await db.conversations.update({ status: tick.status, contact: tick.contact });
}`}</Pre>
          </Section>


          <Section id="adapter" title="WhatsAppAdapter">
            <p>Contrato em <code>src/integrations/whatsapp/adapter.ts</code>. A UI nunca importa Baileys/whatsapp-web.js diretamente — apenas o adapter.</p>
            <Pre>{`interface WhatsAppAdapter {
  connectInstance(instanceId): Promise<void>;
  generateQrCode(instanceId): Promise<{ qr; expiresAt }>;
  disconnectInstance(instanceId): Promise<void>;
  deleteSession(instanceId): Promise<void>;
  sendMessage(instanceId, to, msg): Promise<{ id }>;
  getStatus(instanceId): Promise<WAStatus>;
  on(event, handler): Unsubscribe;
}`}</Pre>
            <p className="text-sm">Eventos: <code>qr.generated</code>, <code>connection.open</code>, <code>connection.closed</code>, <code>message.received</code>, <code>message.sent</code>, <code>automation.triggered</code>, <code>automation.paused</code>, <code>automation.finished</code>.</p>
          </Section>

          <Section id="integracao" title="Plugar Baileys (passo a passo)">
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              <li>Crie um backend Node.js (Fastify/Express). Instale <code>@whiskeysockets/baileys</code> e <code>qrcode</code>.</li>
              <li>Para cada <code>whatsapp_instances.id</code>, gerencie uma sessão Baileys persistida em disco/bucket (<code>useMultiFileAuthState</code>).</li>
              <li>Exponha endpoints: <code>POST /instances/:id/connect</code>, <code>POST /instances/:id/disconnect</code>, <code>POST /instances/:id/qr</code>, <code>POST /messages</code>.</li>
              <li>Conecte um WebSocket/SSE para empurrar os eventos para o frontend. Implemente um <code>RemoteWhatsAppAdapter</code> que substitua o <code>MockWhatsAppAdapter</code> em <code>src/integrations/whatsapp/index.ts</code>.</li>
              <li>No backend, ao receber mensagem: persistir em <code>messages</code>, atualizar <code>conversations.last_message_at</code>, executar a engine quando uma palavra-chave bater ou houver fluxo de boas-vindas/resposta padrão aplicável, respeitando <code>conversations.automation_paused</code>.</li>
              <li>Use a SERVICE ROLE KEY do Cloud apenas no backend, jamais no frontend.</li>
            </ol>
          </Section>

          <Section id="seguranca" title="Segurança e regras de produto">
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li>RLS estrita por <code>owner_id</code> em todas as tabelas. Nenhuma leitura cruzada.</li>
              <li>Automação só dispara em <strong>mensagem recebida</strong>. Não há disparo em massa.</li>
              <li>Toggle de pausa por conversa sempre disponível na inbox.</li>
              <li>Logs em <code>automation_logs</code> por nó executado.</li>
              <li>Backend deve aplicar rate limit por instância e idempotência por message-id.</li>
              <li>Senhas: ative o HIBP no painel do Cloud (Auth Settings → Sign in methods → Email).</li>
            </ul>
          </Section>

          <Section id="setup" title="Setup local">
            <Pre>{`# instalar
bun install

# rodar dev
bun run dev

# build
bun run build
`}</Pre>
            <p className="text-sm">Variáveis públicas (.env): <code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, <code>VITE_SUPABASE_PROJECT_ID</code>.</p>
          </Section>
        </div>
      </div>
    </PageContainer>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <Card id={id} className="p-6 bg-card border-border scroll-mt-20">
      <h2 className="font-display text-xl font-semibold mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-foreground/85">{children}</div>
    </Card>
  );
}

function Pre({ children }: { children: string }) {
  return (
    <pre className="bg-background border border-border rounded-lg p-3 text-[11px] overflow-x-auto font-mono text-foreground/80 whitespace-pre">{children}</pre>
  );
}
