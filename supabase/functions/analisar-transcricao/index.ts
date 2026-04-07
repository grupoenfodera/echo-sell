import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const COST_INPUT_PER_TOKEN  = 3.0  / 1_000_000;
const COST_OUTPUT_PER_TOKEN = 15.0 / 1_000_000;

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/* ── System Prompt ── */
const SYSTEM_TRANSCRICAO = `Você é a IA SVP — Sistema de Vendas Pastor, método de Thammy Manuella.
Sua função é analisar transcrições de reuniões de vendas e extrair inteligência estratégica para o próximo passo do vendedor.

REGRAS ABSOLUTAS
- NUNCA mencione outros autores, frameworks ou metodologias. Todo método é SVP.
- NUNCA invente informações. Use APENAS o que está na transcrição.
- Português brasileiro natural — nunca corporativo.
- Use as palavras EXATAS do cliente — nunca parafraseie.
- Zero análise genérica — cada linha específica ao que foi dito.
- Se um campo não tem informação na transcrição → null. Nunca suponha.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LENTES DE ANÁLISE — nessa ordem de prioridade
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. PALAVRAS EXATAS DO CLIENTE
O que ele disse sobre o problema, o desejo e o critério de compra.
Essas palavras são o esqueleto do próximo roteiro.
Extraia literalmente — nunca parafraseie.

2. OBJEÇÕES — levantadas E não tratadas
Objeções em aberto são o maior risco de perda.
Para cada objeção: foi tratada? Nas 4 camadas SVP?
(reconhecimento → problema oculto → diferencial → desejo futuro)

3. OUTROS DECISORES
Alguém foi mencionado que influencia ou bloqueia a decisão?
Nome, cargo, relação com o decisor principal.

4. NÍVEL DE INTERESSE
Baseado APENAS no que o cliente disse ou sinalizou — nunca suposição.
frio → sinais de desengajamento ou resistência ativa
morno → interesse mas impedimentos claros
quente → urgência verbalizada ou avanço solicitado

5. AUDITORIA DO MÉTODO SVP
O que foi executado, o que ficou parcial, o que não aconteceu.
Para cada bloco ausente ou parcial: o que faltou e qual o impacto.

Os 6 blocos SVP:
ABERTURA — autoridade + cronograma da call estabelecidos?
DIAGNÓSTICO — problema, desejo e critério de compra verbalizados?
SOLUÇÃO — apresentada conectada ao que o cliente disse?
OFERTA — preço após próximos passos? Silêncio após o número?
OBJEÇÕES — tratadas nas 4 camadas?
FECHAMENTO — próximo passo com data definido?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMATO — JSON puro, sem markdown, sem crases
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "resumo": "Parágrafo direto do que foi discutido — máx 4 linhas. Termos do nicho. Sem jargão corporativo.",

  "palavras_exatas_cliente": {
    "problema": ["frase exata como ele descreveu a dor principal"],
    "desejo": ["frase exata como ele descreveu onde quer chegar"],
    "criterio_compra": ["frase exata do que ele disse que precisaria ver para avançar"],
    "referencia_citada": "nome ou perfil que admira, ou null"
  },

  "objecoes_identificadas": [
    {
      "objecao": "exatamente como o cliente disse",
      "foi_tratada": true,
      "camadas_tratadas": ["reconhecimento", "problema_oculto", "diferencial", "desejo_futuro"],
      "observacao": "como foi tratada ou por que ficou em aberto"
    }
  ],

  "outros_decisores": [
    {
      "nome_cargo": "Maria, sócia",
      "nivel_influencia": "precisa da aprovação dela para fechar",
      "objecao_provavel": "o que ela provavelmente vai questionar, ou null"
    }
  ],

  "nivel_interesse": "frio | morno | quente",

  "justificativa_interesse": "1–2 frases baseadas no que o cliente disse ou sinalizou — nunca suposição",

  "blocos_svp": {
    "abertura": {
      "status": "executado | parcial | ausente",
      "o_que_faltou": "descrição específica ou null",
      "impacto": "consequência no restante da reunião ou null"
    },
    "diagnostico": {
      "status": "executado | parcial | ausente",
      "o_que_faltou": "ex: critério de compra não foi extraído",
      "impacto": "ex: proposta vai sem saber o critério de aprovação"
    },
    "solucao": {
      "status": "executado | parcial | ausente",
      "o_que_faltou": null,
      "impacto": null
    },
    "oferta": {
      "status": "executado | parcial | ausente",
      "o_que_faltou": null,
      "impacto": null
    },
    "objecoes": {
      "status": "executado | parcial | ausente",
      "o_que_faltou": null,
      "impacto": null
    },
    "fechamento": {
      "status": "executado | parcial | ausente",
      "o_que_faltou": null,
      "impacto": null
    }
  },

  "proxima_acao": {
    "recomendacao_principal": "qual dos 3 outputs faz mais sentido agora e por quê — baseado no nível de interesse e no que ficou em aberto",
    "para_roteiro": "o que focar na próxima reunião — qual bloco SVP reforçar e qual pergunta fazer que ficou pendente",
    "para_proposta": "qual dor central ancorar, qual entregável conectar ao desejo que ele verbalizou",
    "para_whatsapp": "frase exata do cliente para usar na abertura do follow-up — não invente"
  },

  "contexto_enriquecido": "Parágrafo denso com tudo que o gerar-roteiro ou gerar-proposta precisa saber: problema nas palavras dele, desejo nas palavras dele, critério de compra, objeções em aberto com o que foi dito, tom identificado na reunião, outros decisores e nível de influência, nível de interesse com justificativa. Sem nenhuma informação inventada."
}`;

/* ── Main handler ── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada.");

    // ── Auth ──
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return errorResponse("Não autenticado.", 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return errorResponse("Token inválido.", 401);

    // ── Body ──
    const body = await req.json();
    const { transcricao, cliente_id, titulo } = body;

    if (!transcricao || transcricao.trim().length < 50) {
      return errorResponse("Transcrição muito curta ou ausente.", 400);
    }

    // ── Load DNA (opcional — enriquece contexto do vendedor) ──
    const { data: dna } = await supabaseAdmin
      .from("usuario_dna")
      .select("bloco_injetado, nicho_principal, tom_primario")
      .eq("usuario_id", user.id)
      .maybeSingle();

    // ── Build prompt ──
    let systemPrompt = SYSTEM_TRANSCRICAO;
    if (dna?.bloco_injetado) {
      systemPrompt = `[DNA COMERCIAL DO VENDEDOR]\n${dna.bloco_injetado}\n\n` + systemPrompt;
    }

    const userLines: string[] = [];
    if (dna?.nicho_principal) userLines.push(`Nicho do vendedor: ${dna.nicho_principal}`);
    if (cliente_id) userLines.push(`Cliente ID: ${cliente_id}`);
    userLines.push(`\nTRANSCRIÇÃO DA REUNIÃO:\n${transcricao.trim()}`);

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
        max_tokens: 4000,
        temperature: 0.2,
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

    let analise: Record<string, unknown>;
    try {
      analise = JSON.parse("{" + rawText);
    } catch {
      console.error("Parse error:", rawText.substring(0, 500));
      return errorResponse("Resposta da IA inválida.", 502);
    }

    // ── Usage ──
    const usage = anthropicData.usage || {};
    const tokensEntrada = usage.input_tokens  || 0;
    const tokensSaida   = usage.output_tokens || 0;
    const tokensTotal   = tokensEntrada + tokensSaida;
    const custoUsd      = tokensEntrada * COST_INPUT_PER_TOKEN + tokensSaida * COST_OUTPUT_PER_TOKEN;

    // ── Salvar como interação no CRM ──
    let interacaoId: string | null = null;
    if (cliente_id) {
      const { data: interacao, error: interacaoErr } = await supabaseAdmin
        .from("interacoes")
        .insert({
          usuario_id:             user.id,
          cliente_id,
          canal:                  "transcricao",
          direcao:                "interno",
          titulo:                 titulo || "Transcrição analisada pela IA SVP",
          conteudo:               transcricao.trim(),
          resumo_ia:              analise.resumo ?? null,
          resultado:              analise.nivel_interesse ?? null,
          proxima_acao_sugerida:  (analise.proxima_acao as Record<string, string>)?.recomendacao_principal ?? null,
          metadata: {
            palavras_exatas_cliente: analise.palavras_exatas_cliente,
            objecoes_identificadas:  analise.objecoes_identificadas,
            outros_decisores:        analise.outros_decisores,
            blocos_svp:              analise.blocos_svp,
            proxima_acao:            analise.proxima_acao,
            contexto_enriquecido:    analise.contexto_enriquecido,
            tokens_total:            tokensTotal,
            custo_usd:               custoUsd,
          },
        })
        .select("id")
        .single();

      if (interacaoErr) {
        console.error("Erro ao salvar interação:", interacaoErr);
      } else {
        interacaoId = interacao.id;
      }

      // ── Atualizar último contato do cliente ──
      await supabaseAdmin
        .from("clientes")
        .update({ ultimo_contato_em: new Date().toISOString() })
        .eq("id", cliente_id);
    }

    // ── Tracking de custos ──
    const { data: usuario } = await supabaseAdmin
      .from("usuarios")
      .select("tokens_total, custo_total_usd")
      .eq("id", user.id)
      .single();

    await supabaseAdmin.from("usuarios").update({
      tokens_total:    (usuario?.tokens_total    || 0) + tokensTotal,
      custo_total_usd: (usuario?.custo_total_usd || 0) + custoUsd,
    }).eq("id", user.id);

    // ── Response ──
    return new Response(
      JSON.stringify({
        ok: true,
        interacao_id: interacaoId,
        analise,
        meta: {
          tokens_entrada: tokensEntrada,
          tokens_saida:   tokensSaida,
          tokens_total:   tokensTotal,
          custo_usd:      custoUsd,
        },
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
