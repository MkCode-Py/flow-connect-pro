/**
 * Cria contatos, conversas e mensagens demo idempotentes para a Inbox.
 * Só executa se o usuário não tem conversas ainda.
 */
import { supabase } from "@/integrations/supabase/client";

type DemoContact = {
  key: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  paused?: boolean;
  status: "open" | "pending" | "resolved" | "human_required";
  tags?: string[];
  messages: Array<{ direction: "in" | "out" | "system"; sent_by: "contact" | "bot" | "human" | "system"; body: string; minutesAgo: number }>;
};

const DEMO: DemoContact[] = [
  {
    key: "joao",
    name: "João Silva",
    phone: "5511987650001",
    email: "joao@exemplo.com",
    company: "Loja do João",
    status: "open",
    tags: ["Cliente quente", "Pagamento"],
    messages: [
      { direction: "in", sent_by: "contact", body: "Oi! Vocês têm tabela de preços?", minutesAgo: 38 },
      { direction: "out", sent_by: "bot", body: "Olá João! Posso te enviar agora. Quer também a opção de Pix?", minutesAgo: 37 },
      { direction: "in", sent_by: "contact", body: "Sim, manda tudo por favor.", minutesAgo: 4 },
    ],
  },
  {
    key: "mariana",
    name: "Mariana Costa",
    phone: "5521991230002",
    email: "mariana@exemplo.com",
    status: "pending",
    tags: ["Pedido pendente"],
    messages: [
      { direction: "in", sent_by: "contact", body: "Como faço pra pagar via Pix?", minutesAgo: 120 },
      { direction: "out", sent_by: "bot", body: "Vou te passar a chave Pix. Um instante.", minutesAgo: 119 },
      { direction: "system", sent_by: "system", body: "Fluxo de pagamento Pix iniciado.", minutesAgo: 119 },
    ],
  },
  {
    key: "pedro",
    name: "Pedro Almeida",
    phone: "5531988880003",
    company: "Studio Almeida",
    status: "human_required",
    tags: ["Atendimento humano"],
    messages: [
      { direction: "in", sent_by: "contact", body: "Preciso falar com um atendente.", minutesAgo: 9 },
      { direction: "system", sent_by: "system", body: "Transferido para atendimento humano.", minutesAgo: 9 },
    ],
  },
  {
    key: "anon",
    name: "Cliente sem nome",
    phone: "5511970000004",
    paused: true,
    status: "open",
    messages: [
      { direction: "in", sent_by: "contact", body: "Oi", minutesAgo: 720 },
      { direction: "system", sent_by: "system", body: "Automação pausada manualmente pelo atendente.", minutesAgo: 700 },
    ],
  },
];

const DEMO_TAGS = [
  { name: "Cliente quente", color: "#ef4444" },
  { name: "Pedido pendente", color: "#f59e0b" },
  { name: "Pagamento", color: "#22c55e" },
  { name: "Atendimento humano", color: "#3b82f6" },
  { name: "Resolvido", color: "#06b6d4" },
];

const DEMO_QR = [
  { shortcut: "/preco", title: "Tabela de preços", category: "Vendas", content: "Olá {{primeiro_nome}}! Segue nossa tabela de preços atualizada. Posso te ajudar a escolher?" },
  { shortcut: "/pix", title: "Pagamento por Pix", category: "Pagamento", content: "{{primeiro_nome}}, nossa chave Pix é contato@empresa.com. Após pagar, me envie o comprovante por aqui." },
  { shortcut: "/envio", title: "Informações de envio", category: "Logística", content: "Enviamos em até 2 dias úteis após confirmação. Prazo total varia de 3 a 7 dias úteis." },
  { shortcut: "/atendente", title: "Transferência humana", category: "Atendimento", content: "Já estou te transferindo para um atendente humano, {{primeiro_nome}}. Aguarde um instante." },
  { shortcut: "/status", title: "Status do pedido", category: "Pós-venda", content: "Para consultar o status, me informe o número do pedido por favor." },
];

export async function ensureInboxDemo(userId: string) {
  // 1. Tags
  const { data: tagRows } = await supabase.from("tags").select("id, name").eq("owner_id", userId);
  const tagMap = new Map((tagRows ?? []).map((t) => [t.name, t.id]));
  const missingTags = DEMO_TAGS.filter((t) => !tagMap.has(t.name));
  if (missingTags.length) {
    const { data: inserted } = await supabase
      .from("tags")
      .insert(missingTags.map((t) => ({ owner_id: userId, ...t })))
      .select("id, name");
    (inserted ?? []).forEach((t) => tagMap.set(t.name, t.id));
  }

  // 2. Quick replies
  const { data: existingQr } = await supabase
    .from("quick_replies")
    .select("shortcut")
    .eq("owner_id", userId);
  const haveQr = new Set((existingQr ?? []).map((q) => q.shortcut.toLowerCase()));
  const missingQr = DEMO_QR.filter((q) => !haveQr.has(q.shortcut.toLowerCase()));
  if (missingQr.length) {
    await supabase.from("quick_replies").insert(
      missingQr.map((q) => ({ owner_id: userId, ...q, is_active: true })) as any,
    );
  }

  // 3. Conversas demo — só se ainda não houver nenhuma
  const { count } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);
  if ((count ?? 0) > 0) return;

  for (const demo of DEMO) {
    const { data: contact } = await supabase
      .from("contacts")
      .insert({
        owner_id: userId,
        name: demo.name,
        phone: demo.phone,
        email: demo.email ?? null,
        company: demo.company ?? null,
        automation_paused: demo.paused ?? false,
      } as any)
      .select("id")
      .single();
    if (!contact) continue;

    // tags
    if (demo.tags?.length) {
      const tagIds = demo.tags.map((t) => tagMap.get(t)).filter(Boolean) as string[];
      if (tagIds.length) {
        await supabase
          .from("contact_tags")
          .insert(tagIds.map((tag_id) => ({ owner_id: userId, contact_id: contact.id, tag_id })) as any);
      }
    }

    const last = demo.messages[demo.messages.length - 1];
    const lastAt = new Date(Date.now() - last.minutesAgo * 60_000).toISOString();
    const { data: conv } = await supabase
      .from("conversations")
      .insert({
        owner_id: userId,
        contact_id: contact.id,
        status: demo.status,
        automation_paused: demo.paused ?? false,
        last_message_at: lastAt,
        last_message_preview: last.body.slice(0, 140),
        unread_count: demo.messages.filter((m) => m.direction === "in").length > 1 ? 2 : 0,
      } as any)
      .select("id")
      .single();
    if (!conv) continue;

    await supabase.from("messages").insert(
      demo.messages.map((m) => ({
        owner_id: userId,
        conversation_id: conv.id,
        direction: m.direction,
        sent_by: m.sent_by,
        body: m.body,
        created_at: new Date(Date.now() - m.minutesAgo * 60_000).toISOString(),
      })) as any,
    );

    await supabase.from("automation_logs").insert([
      { owner_id: userId, conversation_id: conv.id, event: "flow_started", payload: { mock: true, flow: "boas_vindas" } },
      { owner_id: userId, conversation_id: conv.id, event: "node_executed", payload: { mock: true, node: "content" } },
    ] as any);
  }
}
