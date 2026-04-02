import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PLAN_LIMITS: Record<string, number> = {
  basico: 10,
  pro: 50,
  enterprise: 200,
};

const COST_INPUT_PER_TOKEN = 3.0 / 1_000_000;
const COST_OUTPUT_PER_TOKEN = 15.0 / 1_000_000;

/* ── System prompt for roteiro generation ── */
const SYSTEM_ROTEIRO = `Você é o gerador de roteiros de reunião do SVP — Sistema de Vendas Persuasivas.

Gere um roteiro de reunião de vendas estruturado em 5 etapas.

FORMATO — retorne JSON puro, sem markdown, sem crases:
{
  "roteiro_reuniao": {
    "abertura": {
      "duracao_min": 5,
      "objetivo": "...",
      "script": "...",
      "dicas": ["..."],
      "perguntas": ["..."]
    },
    "descoberta": {
      "duracao_min": 15,
      "objetivo": "...",
      "script": "...",
      "perguntas": ["..."],
      "pontos_chave": ["..."]
    },
    "apresentacao_solucao": {
      "duracao_min": 10,
      "objetivo": "...",
      "script": "...",
      "tecnicas": ["..."]
    },
    "tratamento_objecoes": {
      "duracao_min": 10,
      "objetivo": "...",
      "objecoes_previstas": [
        { "objecao": "...", "resposta": "..." }
      ]
    },
    "fechamento": {
      "duracao_min": 5,
      "objetivo": "...",
      "script": "...",
      "dicas": ["..."]
    }
  },
  "tempo_total_min": 45,
  "resumo_estrategico": "...",
  "score": 85,
  "score_breakdown": {
    "clareza": 90,
    "objecoes_cobertas": 80,
    "adequacao_nicho": 85
  }
}

Scripts: mínimo 4 frases por etapa. Use linguagem natural e persuasiva.
Objeções obrigatórias: "está caro", "preciso pensar", "já tentei antes".
Cada resposta de objeção deve ter mínimo 3 frases.`;

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY não configurada.");
    }

    // ── Auth ──
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return errorResponse("Não autenticado.", 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return errorResponse("Token inválido.", 401);

    // ── Body ──
    const body = await req.json();
    const { nicho, produto, preco, contextoGeracao, contexto: contextoBody, nome_cliente, cliente_id, dados_extras } = body;

    if (!nicho || !produto) {
      return errorResponse("Campos obrigatórios: nicho, produto.", 400);
    }

    // ── User check ──
    const { data: usuario, error: userError } = await supabaseAdmin
      .from("usuarios")
      .select("*")
      .eq("id", user.id)
      .single();

    if (userError || !usuario) return errorResponse("Usuário não encontrado.", 404);
    if (!usuario.ativo) return errorResponse(usuario.motivo_bloqueio || "Conta bloqueada.", 403);

    // Check quota
    const plano = usuario.plano || "basico";
    const limite = PLAN_LIMITS[plano] || PLAN_LIMITS.basico;
    if ((usuario.consultas_mes || 0) >= limite) {
      return errorResponse(`Limite de ${limite} consultas/mês atingido.`, 402);
    }

    // ── Find or create client ──
    let finalClienteId = cliente_id || null;
    if (!finalClienteId && nome_cliente) {
      // Check if client exists by name
      const { data: existing } = await supabaseAdmin
        .from("clientes")
        .select("id")
        .eq("usuario_id", user.id)
        .eq("nome", nome_cliente)
        .maybeSingle();

      if (existing) {
        finalClienteId = existing.id;
      } else {
        const { data: newCliente, error: createErr } = await supabaseAdmin
          .from("clientes")
          .insert({
            usuario_id: user.id,
            nome: nome_cliente,
            empresa: dados_extras?.empresa || null,
            como_conhecemos: dados_extras?.como_conhecemos || null,
            status: "novo",
            temperatura: "morno",
          })
          .select("id")
          .single();

        if (createErr) {
          console.error("Error creating client:", createErr);
        } else {
          finalClienteId = newCliente.id;
        }
      }
    }

    // ── Load DNA ──
    const { data: dna } = await supabaseAdmin
      .from("usuario_dna")
      .select("bloco_injetado, contexto")
      .eq("usuario_id", user.id)
      .single();

    let contexto = contextoGeracao || contextoBody || null;
    if (!contexto && dna?.contexto && dna.contexto !== "ambos") {
      contexto = dna.contexto;
    }
    // Normalize to lowercase for DB check constraint
    if (contexto) {
      contexto = contexto.toLowerCase();
    }

    // ── Build prompt ──
    let systemPrompt = SYSTEM_ROTEIRO;
    if (dna?.bloco_injetado) {
      systemPrompt = `[DNA COMERCIAL DO VENDEDOR]\n${dna.bloco_injetado}\n\n` + systemPrompt;
    }

    const userLines = [
      `Nicho: ${nicho}`,
      `Produto/Serviço: ${produto}`,
    ];
    if (preco) userLines.push(`Preço: R$ ${preco}`);
    if (nome_cliente) userLines.push(`Nome do cliente: ${nome_cliente}`);
    if (contexto) userLines.push(`Contexto: ${contexto.toUpperCase()}`);

    const userPrompt = userLines.join("\n");

    // ── Call Claude ──
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

    let roteiro;
    try {
      roteiro = JSON.parse("{" + rawText);
    } catch {
      console.error("Failed to parse:", rawText.substring(0, 500));
      return errorResponse("Resposta da IA inválida.", 502);
    }

    // ── Usage tracking ──
    const usage = anthropicData.usage || {};
    const tokensEntrada = usage.input_tokens || 0;
    const tokensSaida = usage.output_tokens || 0;
    const tokensTotal = tokensEntrada + tokensSaida;
    const custoUsd = tokensEntrada * COST_INPUT_PER_TOKEN + tokensSaida * COST_OUTPUT_PER_TOKEN;

    // ── Create sessao_venda ──
    const { data: sessao, error: sessaoErr } = await supabaseAdmin
      .from("sessoes_venda")
      .insert({
        usuario_id: user.id,
        cliente_id: finalClienteId,
        nicho,
        produto,
        preco: preco ? parseFloat(String(preco)) : null,
        contexto: contexto,
        dados_formulario: body,
        roteiro_json: roteiro,
        roteiro_gerado_em: new Date().toISOString(),
        tokens_roteiro: tokensTotal,
      })
      .select("id")
      .single();

    if (sessaoErr) {
      console.error("Error creating session:", sessaoErr);
      return errorResponse("Erro ao salvar sessão.", 500);
    }

    // ── Update user stats ──
    await supabaseAdmin
      .from("usuarios")
      .update({
        consultas_mes: (usuario.consultas_mes || 0) + 1,
        consultas_total: (usuario.consultas_total || 0) + 1,
        tokens_total: (usuario.tokens_total || 0) + tokensTotal,
        custo_total_usd: (usuario.custo_total_usd || 0) + custoUsd,
      })
      .eq("id", user.id);

    // ── Update client last contact ──
    if (finalClienteId) {
      await supabaseAdmin
        .from("clientes")
        .update({
          ultimo_contato_em: new Date().toISOString(),
          status: "em_contato",
        })
        .eq("id", finalClienteId);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sessao_id: sessao.id,
        cliente_id: finalClienteId,
        roteiro,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
