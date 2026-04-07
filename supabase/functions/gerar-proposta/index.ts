import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const COST_INPUT_PER_TOKEN = 3.0 / 1_000_000;
const COST_OUTPUT_PER_TOKEN = 15.0 / 1_000_000;

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SYSTEM_PROPOSTA = `Você é o gerador de propostas comerciais do SVP — Sistema de Vendas PASTOR.

Com base no roteiro de reunião fornecido, gere:
1. Uma proposta comercial estruturada
2. Um email de follow-up
3. Respostas para objeções comuns

FORMATO — JSON puro, sem markdown:
{
  "proposta": {
    "titulo": "...",
    "introducao": "...",
    "diagnostico": "...",
    "solucao": "...",
    "beneficios": ["..."],
    "investimento": {
      "valor": "R$ ...",
      "condicoes": "...",
      "garantia": "..."
    },
    "proximo_passo": "...",
    "fechamento": "..."
  },
  "email": {
    "assunto": "...",
    "saudacao": "...",
    "corpo": "...",
    "cta": "...",
    "assinatura": "..."
  },
  "objecoes": [
    {
      "objecao": "...",
      "resposta_curta": "...",
      "resposta_completa": "...",
      "categoria": "preco|tempo|confianca|necessidade|autoridade"
    }
  ]
}

Objeções obrigatórias (mínimo 5): preço, tempo, confiança, necessidade, autoridade.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada.");

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return errorResponse("Não autenticado.", 401);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return errorResponse("Token inválido.", 401);

    const { sessao_id } = await req.json();
    if (!sessao_id) return errorResponse("sessao_id obrigatório.", 400);

    // Load session
    const { data: sessao, error: sessaoErr } = await supabaseAdmin
      .from("sessoes_venda")
      .select("*")
      .eq("id", sessao_id)
      .single();

    if (sessaoErr || !sessao) return errorResponse("Sessão não encontrada.", 404);
    if (sessao.usuario_id !== user.id) return errorResponse("Sem permissão.", 403);
    if (!sessao.roteiro_json) return errorResponse("Gere o roteiro primeiro.", 400);

    // Load DNA
    const { data: dna } = await supabaseAdmin
      .from("usuario_dna")
      .select("bloco_injetado")
      .eq("usuario_id", user.id)
      .single();

    let systemPrompt = SYSTEM_PROPOSTA;
    if (dna?.bloco_injetado) {
      systemPrompt = `[DNA COMERCIAL]\n${dna.bloco_injetado}\n\n` + systemPrompt;
    }

    const userPrompt = `Dados da sessão:
Nicho: ${sessao.nicho || "não informado"}
Produto: ${sessao.produto || "não informado"}
Preço: ${sessao.preco ? `R$ ${sessao.preco}` : "não informado"}

Roteiro aprovado:
${JSON.stringify(sessao.roteiro_json, null, 2)}`;

    // Call Claude
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt },
          { role: "assistant", content: "{" },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error("Anthropic error:", anthropicResponse.status, errText);
      return errorResponse(`Erro na API de IA: ${anthropicResponse.status}`, 502);
    }

    const anthropicData = await anthropicResponse.json();
    const rawText = anthropicData.content?.[0]?.text || "";

    let parsed;
    try {
      parsed = JSON.parse("{" + rawText);
    } catch {
      console.error("Parse error:", rawText.substring(0, 500));
      return errorResponse("Resposta da IA inválida.", 502);
    }

    // Usage
    const usage = anthropicData.usage || {};
    const tokensEntrada = usage.input_tokens || 0;
    const tokensSaida   = usage.output_tokens || 0;
    const tokensTotal   = tokensEntrada + tokensSaida;
    const custoUsd      = tokensEntrada * (3.0 / 1_000_000) + tokensSaida * (15.0 / 1_000_000);

    // Update session
    await supabaseAdmin
      .from("sessoes_venda")
      .update({
        proposta_json: parsed.proposta || null,
        proposta_gerada_em: new Date().toISOString(),
        email_json: parsed.email || null,
        email_gerado_em: new Date().toISOString(),
        objecoes_json: parsed.objecoes || null,
        objecoes_geradas_em: new Date().toISOString(),
        tokens_proposta: tokensTotal,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", sessao_id);

    // ── Update user stats ──
    const { data: usuario } = await supabaseAdmin
      .from("usuarios")
      .select("consultas_mes, consultas_total, tokens_total, custo_total_usd")
      .eq("id", user.id)
      .single();

    await supabaseAdmin.from("usuarios").update({
      consultas_mes:   (usuario?.consultas_mes   || 0) + 1,
      consultas_total: (usuario?.consultas_total || 0) + 1,
      tokens_total:    (usuario?.tokens_total    || 0) + tokensTotal,
      custo_total_usd: (usuario?.custo_total_usd || 0) + custoUsd,
    }).eq("id", user.id);

    // ── Insert geracoes (admin dashboard tracking) ──
    await supabaseAdmin.from("geracoes").insert({
      usuario_id:       user.id,
      modalidade:       "proposta",
      contexto_geracao: sessao.contexto ?? null,
      nicho:            sessao.nicho ?? null,
      produto:          sessao.produto ?? null,
      tokens_entrada:   tokensEntrada,
      tokens_saida:     tokensSaida,
      tokens_total:     tokensTotal,
      custo_usd:        custoUsd,
      nome_cliente:     sessao.cliente_id ?? null,
      resultado_json:   parsed,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        sessao_id,
        proposta: parsed.proposta,
        email: parsed.email,
        objecoes: parsed.objecoes || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Error:", err);
    return errorResponse(err.message || "Erro interno.", 500);
  }
});
