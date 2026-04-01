import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    // Verify this is called by cron (check for Authorization header with anon key)
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.includes("Bearer")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const now = new Date();
    const results: string[] = [];

    // 1. Deactivate users with expired access
    const { data: expired, error: expErr } = await supabase
      .from("usuarios")
      .update({ ativo: false, motivo_bloqueio: "acesso_expirado" })
      .lt("acesso_svp_expira", now.toISOString())
      .eq("ativo", true)
      .select("id");

    results.push(`Expirados desativados: ${expired?.length || 0}`);
    if (expErr) results.push(`Erro expirados: ${expErr.message}`);

    // 2. Deactivate users with late payment beyond grace period
    const { data: late, error: lateErr } = await supabase
      .from("usuarios")
      .update({ ativo: false, motivo_bloqueio: "pagamento_atrasado" })
      .eq("pagamento_atrasado", true)
      .lt("acesso_svp_expira", now.toISOString())
      .eq("ativo", true)
      .select("id");

    results.push(`Atrasados desativados: ${late?.length || 0}`);
    if (lateErr) results.push(`Erro atrasados: ${lateErr.message}`);

    // 3. Reset monthly consultations on the 1st of each month
    if (now.getUTCDate() === 1) {
      const { data: reset, error: resetErr } = await supabase
        .from("usuarios")
        .update({ consultas_mes: 0 })
        .gt("consultas_mes", 0)
        .select("id");

      results.push(`Consultas resetadas: ${reset?.length || 0}`);
      if (resetErr) results.push(`Erro reset: ${resetErr.message}`);
    }

    console.log("Daily cleanup results:", results);

    return new Response(
      JSON.stringify({ ok: true, results }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Daily cleanup error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
