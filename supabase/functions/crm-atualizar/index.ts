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

  if (req.method !== "POST") {
    return errorResponse("Método não permitido.", 405);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return errorResponse("Não autenticado.", 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return errorResponse("Token inválido.", 401);

    const body = await req.json();

    // ── Update session result ──
    if (body.sessao_id) {
      const { sessao_id, resultado, notas_pos_reuniao } = body;

      // Verify ownership
      const { data: sessao } = await supabaseAdmin
        .from("sessoes_venda")
        .select("id, usuario_id")
        .eq("id", sessao_id)
        .single();

      if (!sessao || sessao.usuario_id !== user.id) {
        return errorResponse("Sessão não encontrada.", 404);
      }

      const updates: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
      if (resultado) updates.resultado = resultado;
      if (notas_pos_reuniao !== undefined) updates.notas_pos_reuniao = notas_pos_reuniao;

      await supabaseAdmin
        .from("sessoes_venda")
        .update(updates)
        .eq("id", sessao_id);

      return jsonResponse({ ok: true });
    }

    // ── Update client ──
    if (body.cliente_id) {
      const { cliente_id, ...campos } = body;

      // Verify ownership
      const { data: cliente } = await supabaseAdmin
        .from("clientes")
        .select("id, usuario_id")
        .eq("id", cliente_id)
        .single();

      if (!cliente || cliente.usuario_id !== user.id) {
        return errorResponse("Cliente não encontrado.", 404);
      }

      // Remove non-client fields
      delete campos.interacao;
      campos.atualizado_em = new Date().toISOString();

      await supabaseAdmin
        .from("clientes")
        .update(campos)
        .eq("id", cliente_id);

      return jsonResponse({ ok: true });
    }

    // ── Register interaction ──
    if (body.interacao) {
      const interacao = body.interacao;

      // Verify client ownership
      const { data: cliente } = await supabaseAdmin
        .from("clientes")
        .select("id, usuario_id")
        .eq("id", interacao.cliente_id)
        .single();

      if (!cliente || cliente.usuario_id !== user.id) {
        return errorResponse("Cliente não encontrado.", 404);
      }

      const { data: newInteracao, error: insertErr } = await supabaseAdmin
        .from("interacoes")
        .insert({
          usuario_id: user.id,
          cliente_id: interacao.cliente_id,
          canal: interacao.canal,
          direcao: interacao.direcao || "outbound",
          titulo: interacao.titulo || null,
          conteudo: interacao.conteudo || null,
          resultado: interacao.resultado || null,
          duracao_minutos: interacao.duracao_minutos || null,
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("Insert error:", insertErr);
        return errorResponse("Erro ao registrar interação.", 500);
      }

      // Update client last contact
      await supabaseAdmin
        .from("clientes")
        .update({
          ultimo_contato_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", interacao.cliente_id);

      return jsonResponse({ ok: true, interacao_id: newInteracao.id });
    }

    return errorResponse("Nenhuma ação reconhecida.", 400);
  } catch (err) {
    console.error("Error:", err);
    return errorResponse(((err as Error)?.message) || "Erro interno.", 500);
  }
});
