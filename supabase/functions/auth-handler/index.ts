import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  try {
    if (path === "login" && req.method === "POST") {
      return await handleLogin(req);
    }
    if (path === "logout" && req.method === "POST") {
      return await handleLogout(req);
    }
    if (path === "me" && req.method === "GET") {
      return await handleMe(req);
    }

    return new Response(
      JSON.stringify({ error: "Rota não encontrada" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Auth handler error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleLogin(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return new Response(
      JSON.stringify({ error: "Email e senha são obrigatórios." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Sign in with anon client
  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return new Response(
      JSON.stringify({ error: "Email ou senha incorretos." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userId = authData.user.id;

  // Check user status using service role
  const { data: usuario, error: userError } = await supabaseAdmin
    .from("usuarios")
    .select("*")
    .eq("id", userId)
    .single();

  if (userError || !usuario) {
    return new Response(
      JSON.stringify({ error: "Usuário não encontrado no sistema." }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!usuario.ativo) {
    const motivo = usuario.motivo_bloqueio || "Conta desativada";
    return new Response(
      JSON.stringify({ error: `Acesso bloqueado: ${motivo}` }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (usuario.acesso_svp_expira && new Date(usuario.acesso_svp_expira) < new Date()) {
    return new Response(
      JSON.stringify({ error: "Seu acesso expirou. Renove seu plano para continuar." }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update last access
  await supabaseAdmin
    .from("usuarios")
    .update({ ultimo_acesso: new Date().toISOString() })
    .eq("id", userId);

  return new Response(
    JSON.stringify({
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
      },
      user: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        plano: usuario.plano,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleLogout(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (token) {
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    await supabaseUser.auth.signOut();
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleMe(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return new Response(
      JSON.stringify({ error: "Token não fornecido." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify JWT
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return new Response(
      JSON.stringify({ error: "Token inválido ou expirado." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: usuario } = await supabaseAdmin
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!usuario) {
    return new Response(
      JSON.stringify({ error: "Usuário não encontrado." }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if DNA is configured
  const { data: dna } = await supabaseAdmin
    .from("usuario_dna")
    .select("id")
    .eq("usuario_id", user.id)
    .maybeSingle();

  return new Response(
    JSON.stringify({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      plano: usuario.plano,
      ativo: usuario.ativo,
      consultas_mes: usuario.consultas_mes,
      consultas_total: usuario.consultas_total,
      acesso_svp_expira: usuario.acesso_svp_expira,
      tipo_acesso: usuario.tipo_acesso,
      primeiro_acesso: usuario.primeiro_acesso,
      dna_configurado: !!dna,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
