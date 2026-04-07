import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return errorResponse("Não autenticado.", 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return errorResponse("Token inválido.", 401);

    const url = new URL(req.url);

    // ── GET: list clients or fetch single client ──
    if (req.method === "GET") {
      const clienteId = url.searchParams.get("cliente_id");
      const sessaoId = url.searchParams.get("sessao_id");

      // ── Single session by sessao_id (used by /roteiro/:id) ──
      if (sessaoId) {
        const { data: sessao, error: sessaoErr } = await supabaseAdmin
          .from("sessoes_venda")
          .select("*")
          .eq("id", sessaoId)
          .eq("usuario_id", user.id)
          .single();

        if (sessaoErr || !sessao) {
          return errorResponse("Sessão não encontrada.", 404);
        }

        // Also fetch the linked client if exists
        let cliente = null;
        if (sessao.cliente_id) {
          const { data } = await supabaseAdmin
            .from("clientes")
            .select("*")
            .eq("id", sessao.cliente_id)
            .single();
          cliente = data ?? null;
        }

        return jsonResponse({
          sessoes: [sessao],
          clientes: cliente ? [cliente] : [],
          interacoes: [],
        });
      }

      if (clienteId) {
        // Single client with sessions and interactions
        const [clienteRes, sessoesRes, interacoesRes] = await Promise.all([
          supabaseAdmin
            .from("clientes")
            .select("*")
            .eq("id", clienteId)
            .eq("usuario_id", user.id)
            .single(),
          supabaseAdmin
            .from("sessoes_venda")
            .select("*")
            .eq("cliente_id", clienteId)
            .eq("usuario_id", user.id)
            .order("criado_em", { ascending: false }),
          supabaseAdmin
            .from("interacoes")
            .select("*")
            .eq("cliente_id", clienteId)
            .eq("usuario_id", user.id)
            .order("criado_em", { ascending: false }),
        ]);

        if (clienteRes.error || !clienteRes.data) {
          return errorResponse("Cliente não encontrado.", 404);
        }

        return jsonResponse({
          cliente: clienteRes.data,
          sessoes: sessoesRes.data || [],
          interacoes: interacoesRes.data || [],
        });
      }

      // ── List clients with ultima_sessao enrichment ──
      const pagina = parseInt(url.searchParams.get("pagina") || "1");
      const porPagina = parseInt(url.searchParams.get("por_pagina") || "20");
      const offset = (pagina - 1) * porPagina;

      const { data: clientes, error: listErr, count } = await supabaseAdmin
        .from("clientes")
        .select("*", { count: "exact" })
        .eq("usuario_id", user.id)
        .order("atualizado_em", { ascending: false })
        .range(offset, offset + porPagina - 1);

      if (listErr) {
        console.error("List error:", listErr);
        return errorResponse("Erro ao listar clientes.", 500);
      }

      // Enrich each client with ultima_sessao piece status
      if (clientes && clientes.length > 0) {
        const clienteIds = clientes.map((c: Record<string, unknown>) => c.id);

        const { data: sessoes } = await supabaseAdmin
          .from("sessoes_venda")
          .select("id, cliente_id, criado_em, geracao_status, roteiro_gerado_em, proposta_gerada_em, email_gerado_em, whatsapp_gerado_em, objecoes_geradas_em, produto, preco")
          .in("cliente_id", clienteIds)
          .eq("usuario_id", user.id)
          .order("criado_em", { ascending: false });

        const ultimasSessoes = new Map<string, Record<string, unknown>>();
        for (const s of (sessoes || []) as Record<string, unknown>[]) {
          const cid = s.cliente_id as string;
          if (!ultimasSessoes.has(cid)) {
            ultimasSessoes.set(cid, {
              id: s.id,
              criado_em: s.criado_em,
              geracao_status: s.geracao_status,
              tem_roteiro: s.roteiro_gerado_em !== null || s.geracao_status === "pronto",
              tem_proposta: s.proposta_gerada_em !== null,
              tem_email: s.email_gerado_em !== null,
              tem_whatsapp: s.whatsapp_gerado_em !== null,
              tem_objecoes: s.objecoes_geradas_em !== null,
              produto: s.produto ?? null,
              preco: s.preco ?? null,
            });
          }
        }

        const clientesEnriquecidos = clientes.map((c: Record<string, unknown>) => ({
          ...c,
          ultima_sessao: ultimasSessoes.get(c.id as string) || null,
        }));

        return jsonResponse({
          clientes: clientesEnriquecidos,
          total: count || 0,
          pagina,
        });
      }

      return jsonResponse({
        clientes: clientes || [],
        total: count || 0,
        pagina,
      });
    }

    return errorResponse("Método não permitido.", 405);
  } catch (err) {
    console.error("Error:", err);
    return errorResponse(((err as Error)?.message) || "Erro interno.", 500);
  }
});
