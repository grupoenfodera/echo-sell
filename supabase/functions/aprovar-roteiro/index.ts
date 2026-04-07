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

    const body = await req.json();
    const { sessao_id, aprovado } = body;

    if (!sessao_id) return errorResponse("sessao_id obrigatório.", 400);
    if (typeof aprovado !== "boolean") return errorResponse("aprovado (boolean) obrigatório.", 400);

    // Verify session belongs to user
    const { data: sessao, error: sessaoErr } = await supabaseAdmin
      .from("sessoes_venda")
      .select("id, usuario_id")
      .eq("id", sessao_id)
      .single();

    if (sessaoErr || !sessao) return errorResponse("Sessão não encontrada.", 404);
    if (sessao.usuario_id !== user.id) return errorResponse("Sem permissão.", 403);

    // Update
    await supabaseAdmin
      .from("sessoes_venda")
      .update({
        roteiro_aprovado: aprovado,
        roteiro_aprovado_em: aprovado ? new Date().toISOString() : null,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", sessao_id);

    return jsonResponse({
      ok: true,
      aprovado,
      regenerar: !aprovado,
      mensagem: aprovado ? "Roteiro aprovado!" : "Roteiro rejeitado. Gere novamente.",
    });
  } catch (err) {
    console.error("Error:", err);
    return errorResponse(((err as Error)?.message) || "Erro interno.", 500);
  }
});
