import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const KIWIFY_WEBHOOK_TOKEN = Deno.env.get("KIWIFY_WEBHOOK_TOKEN") || "";
const KIWIFY_ID_PASTOR = Deno.env.get("KIWIFY_ID_PASTOR") || "";
const KIWIFY_ID_ASSINATURA = Deno.env.get("KIWIFY_ID_ASSINATURA") || "";
const KIWIFY_GRACE_PERIOD_DIAS = parseInt(Deno.env.get("KIWIFY_GRACE_PERIOD_DIAS") || "3", 10);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function generatePassword(length = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let result = "";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) {
    result += chars[arr[i] % chars.length];
  }
  return result;
}

async function logWebhook(
  evento: string,
  email: string | null,
  produtoId: string | null,
  saleId: string | null,
  status: string,
  erro: string | null,
  payload: unknown
) {
  await supabase.from("webhook_logs").insert({
    evento,
    email_cliente: email,
    produto_id: produtoId,
    sale_id: saleId,
    status_processamento: status,
    erro_mensagem: erro,
    payload_raw: payload,
  });
}

async function findUserByEmail(email: string) {
  const { data } = await supabase.auth.admin.listUsers();
  return data?.users?.find((u) => u.email === email) || null;
}

async function handleCompraAprovada(payload: any) {
  const email = payload.customer?.email?.toLowerCase()?.trim();
  const name = payload.customer?.name || "";
  const productId = payload.product?.id || "";
  const saleId = payload.id || payload.sale_id || "";
  const netAmount = parseFloat(payload.net_amount || payload.amount || "0");

  if (!email) throw new Error("Email do cliente não encontrado no payload");

  let tipo: string, plano: string, expiraDias: number;

  if (productId === KIWIFY_ID_PASTOR) {
    tipo = "compra_unica";
    plano = "basico";
    expiraDias = 30;
  } else if (productId === KIWIFY_ID_ASSINATURA) {
    tipo = "assinatura";
    plano = "pro";
    expiraDias = 35;
  } else {
    tipo = "compra_unica";
    plano = "basico";
    expiraDias = 30;
  }

  const acessoExpira = addDays(expiraDias);
  let existingUser = await findUserByEmail(email);
  let userId: string;

  if (!existingUser) {
    const password = generatePassword();
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome: name },
    });

    if (createError) throw new Error(`Erro ao criar usuário: ${createError.message}`);
    userId = newUser.user.id;

    // Update the auto-created usuarios record with full data
    await supabase
      .from("usuarios")
      .update({
        nome: name,
        plano,
        tipo_acesso: tipo,
        acesso_svp_expira: acessoExpira,
        ativo: true,
        primeiro_acesso: true,
      })
      .eq("id", userId);

    // Send password recovery email so user can set their password
    await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
    });
  } else {
    userId = existingUser.id;
    await supabase
      .from("usuarios")
      .update({
        ativo: true,
        plano,
        tipo_acesso: tipo,
        acesso_svp_expira: acessoExpira,
        pagamento_atrasado: false,
        cancelamento_solicitado: false,
        motivo_bloqueio: null,
      })
      .eq("id", userId);
  }

  await supabase.from("compras").insert({
    sale_id: saleId,
    usuario_id: userId,
    produto_id: productId,
    tipo,
    valor: netAmount,
    status: "ativo",
  });

  await logWebhook("compra_aprovada", email, productId, saleId, "ok", null, payload);
}

async function handleSubscriptionRenewed(payload: any) {
  const email = payload.customer?.email?.toLowerCase()?.trim();
  if (!email) throw new Error("Email não encontrado");

  const user = await findUserByEmail(email);
  if (!user) throw new Error(`Usuário não encontrado: ${email}`);

  await supabase
    .from("usuarios")
    .update({
      acesso_svp_expira: addDays(35),
      consultas_mes: 0,
      ativo: true,
      pagamento_atrasado: false,
    })
    .eq("id", user.id);

  const saleId = payload.id || payload.sale_id || "";
  await supabase
    .from("compras")
    .update({ status: "ativo", atualizado_em: new Date().toISOString() })
    .eq("sale_id", saleId);

  await logWebhook("subscription_renewed", email, null, saleId, "ok", null, payload);
}

async function handleSubscriptionCanceled(payload: any) {
  const email = payload.customer?.email?.toLowerCase()?.trim();
  if (!email) throw new Error("Email não encontrado");

  const user = await findUserByEmail(email);
  if (!user) throw new Error(`Usuário não encontrado: ${email}`);

  await supabase
    .from("usuarios")
    .update({ cancelamento_solicitado: true })
    .eq("id", user.id);

  const saleId = payload.id || payload.sale_id || "";
  await supabase
    .from("compras")
    .update({ status: "cancelado", atualizado_em: new Date().toISOString() })
    .eq("sale_id", saleId);

  await logWebhook("subscription_canceled", email, null, saleId, "ok", null, payload);
}

async function handleSubscriptionLate(payload: any) {
  const email = payload.customer?.email?.toLowerCase()?.trim();
  if (!email) throw new Error("Email não encontrado");

  const user = await findUserByEmail(email);
  if (!user) throw new Error(`Usuário não encontrado: ${email}`);

  await supabase
    .from("usuarios")
    .update({ pagamento_atrasado: true })
    .eq("id", user.id);

  await logWebhook("subscription_late", email, null, null, "ok", null, payload);
}

async function handleReembolso(payload: any) {
  const email = payload.customer?.email?.toLowerCase()?.trim();
  if (!email) throw new Error("Email não encontrado");

  const user = await findUserByEmail(email);
  if (!user) throw new Error(`Usuário não encontrado: ${email}`);

  await supabase
    .from("usuarios")
    .update({ ativo: false, motivo_bloqueio: "reembolso" })
    .eq("id", user.id);

  const saleId = payload.id || payload.sale_id || "";
  await supabase
    .from("compras")
    .update({ status: "reembolsado", atualizado_em: new Date().toISOString() })
    .eq("sale_id", saleId);

  await logWebhook("compra_reembolsada", email, null, saleId, "ok", null, payload);
}

async function handleChargeback(payload: any) {
  const email = payload.customer?.email?.toLowerCase()?.trim();
  if (!email) throw new Error("Email não encontrado");

  const user = await findUserByEmail(email);
  if (!user) throw new Error(`Usuário não encontrado: ${email}`);

  await supabase
    .from("usuarios")
    .update({ ativo: false, motivo_bloqueio: "chargeback" })
    .eq("id", user.id);

  const saleId = payload.id || payload.sale_id || "";
  await supabase
    .from("compras")
    .update({ status: "chargeback", atualizado_em: new Date().toISOString() })
    .eq("sale_id", saleId);

  await logWebhook("chargeback", email, null, saleId, "ok", null, payload);
}

const EVENT_HANDLERS: Record<string, (payload: any) => Promise<void>> = {
  order_approved: handleCompraAprovada,
  order_paid: handleCompraAprovada,
  subscription_renewed: handleSubscriptionRenewed,
  subscription_canceled: handleSubscriptionCanceled,
  subscription_late: handleSubscriptionLate,
  order_refunded: handleReembolso,
  chargeback: handleChargeback,
};

Deno.serve(async (req) => {
  // Always return 200 to Kiwify
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const payload = await req.json();

    // Validate token
    const token = payload.token || req.headers.get("x-kiwify-token") || "";
    if (KIWIFY_WEBHOOK_TOKEN && token !== KIWIFY_WEBHOOK_TOKEN) {
      await logWebhook(
        payload.event || "unknown",
        payload.customer?.email || null,
        null,
        null,
        "erro",
        "Token inválido",
        payload
      );
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const event = payload.event || payload.webhook_event_type || "";
    const handler = EVENT_HANDLERS[event];

    if (!handler) {
      await logWebhook(event, payload.customer?.email || null, null, null, "ignorado", `Evento não mapeado: ${event}`, payload);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    await handler(payload);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    try {
      const errorPayload = err instanceof Error ? err.message : "Erro desconhecido";
      await logWebhook("error", null, null, null, "erro", errorPayload, null);
    } catch (_) {
      // ignore logging errors
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
});
