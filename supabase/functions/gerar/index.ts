import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── Plan limits ──
const PLAN_LIMITS: Record<string, number> = {
  basico: 10,
  pro: 50,
  enterprise: 200,
};

// ── Cost calculation (Claude 3.5 Sonnet pricing) ──
const COST_INPUT_PER_TOKEN = 3.0 / 1_000_000;
const COST_OUTPUT_PER_TOKEN = 15.0 / 1_000_000;

// ── System prompts (Layer 1 — fixed SVP rules) ──

const SYSTEM_M1 = `Você é o gerador de diagnósticos do SVP — Sistema de Vendas Persuasivas de Thammy Manuella.

ANTI-GENÉRICO: cada frase deve conter palavras do nicho fornecido. Nunca use frases genéricas que sirvam para qualquer produto.

FONTES PROIBIDAS: nunca cite Voss, Belfort, Cialdini, SPIN, NLP ou qualquer autor/método pelo nome. Os princípios são do SVP.

9 PRINCÍPIOS SVP:
1. Auditoria de Resistências — mapear todas as objeções antes que apareçam
2. Rotulagem Emocional — nomear o sentimento do cliente para desarmar defesas
3. Perguntas Calibradas — só "Como" e "O quê", nunca "Por quê"
4. Espelhamento — repetir as últimas 2-3 palavras do cliente
5. Estado Futuro Vívido — pintar o cenário pós-compra com detalhes sensoriais
6. Transferência de Certeza — transmitir convicção absoluta no resultado
7. 3 Tens — o cliente precisa estar 10/10 em confiança, valor percebido e urgência
8. Âncora Estratégica — apresentar referência de preço mais alta antes do preço real
9. Silêncio Estratégico — pausas intencionais após perguntas-chave

OBJEÇÕES obrigatórias na fase 5: "está caro", "preciso pensar", "já tentei antes e não funcionou", "não tenho tempo agora". Cada objeção deve ter resposta completa usando princípios SVP.

Scripts: mínimo 4 frases por beat. Use [pausa] para pausas dramáticas e **negrito** para palavras com ênfase vocal.

FORMATO — retorne JSON puro, sem markdown, sem crases, sem explicação:
{
  "perfil_decisor": "3 frases descrevendo o perfil psicológico do decisor",
  "maior_medo": "o maior medo oculto deste decisor",
  "decisao": "como este perfil toma decisões de compra",
  "tom_ideal": "descrição do tom ideal para esta venda",
  "roteiro": [
    {
      "num": 1,
      "titulo": "Nome da Fase",
      "tempo": "X min",
      "phase_color": "voss",
      "phase_goal": "Objetivo desta fase",
      "beats": [
        {
          "titulo": "Nome do Beat",
          "tag": "Nome da Técnica SVP",
          "tag_source": "voss",
          "script": "Texto do script com **negrito** e [pausa]",
          "por_que": "Explicação de por que funciona",
          "tom": "Descrição do tom de voz",
          "se_cliente_reagir": "O que fazer se o cliente reagir"
        }
      ]
    }
  ],
  "proposta": [
    {
      "num": 1,
      "titulo": "Seção da Proposta",
      "tempo": "etapa",
      "conteudo": "Conteúdo da seção"
    }
  ],
  "email": {
    "assunto": "Assunto do email",
    "corpo": "Corpo do email com [HL1]destaque azul[/HL1], [HL2]destaque âmbar[/HL2], [HL3]destaque verde[/HL3]"
  }
}

Roteiro: 6 fases. Proposta: 6 seções. Beats numerados contínuos 1 a N.
phase_color: fases 1-2 = "voss", fases 3-4 = "belfort", fase 5 = "hybrid", fase 6 = "close".`;

const SYSTEM_M2A = `Você é o gerador de roteiros do SVP — Sistema de Vendas Persuasivas de Thammy Manuella.

Modalidade: Primeiro Contato — descoberta, NÃO venda.
Objetivo: coletar dores, desejos, resistências. Sair com data do Tempo 2 agendada.
Regra de ouro: sem preço, sem proposta, sem pitch.

4 princípios ativos nesta modalidade:
1. Auditoria de Resistências
2. Rotulagem Emocional
3. Perguntas Calibradas (só "Como" e "O quê")
4. Espelhamento

FONTES PROIBIDAS: nunca cite Voss, Belfort, SPIN, NLP ou qualquer autor/método pelo nome.

Scripts: mínimo 4 frases por beat. Use [pausa] e **negrito**.

FORMATO — JSON puro, sem markdown:
{
  "perfil_decisor": "...",
  "maior_medo": "...",
  "decisao": "...",
  "tom_ideal": "...",
  "roteiro": [...],
  "email": { "assunto": "...", "corpo": "..." }
}

Roteiro: 4 fases. SEM campo "proposta". Todos phase_color = "voss".`;

const SYSTEM_M2B = `Você é o gerador de roteiros do SVP — Sistema de Vendas Persuasivas de Thammy Manuella.

Modalidade: Reunião de Proposta — o cliente já foi ouvido no Tempo 1.
Abertura é REITERAÇÃO: usar palavras exatas do cliente extraídas das notas do Tempo 1 (campo t1_notas).
Construir os 3 Tens ANTES de revelar o preço.

Objeções obrigatórias: a objeção informada pelo usuário + "está caro" + "preciso pensar" + "já tentei antes".

9 princípios SVP completos ativos.

FONTES PROIBIDAS: nunca cite Voss, Belfort, SPIN, NLP.

Scripts: mínimo 4 frases por beat. Use [pausa] e **negrito**.

FORMATO — JSON puro, sem markdown:
{
  "perfil_decisor": "...",
  "maior_medo": "...",
  "decisao": "...",
  "tom_ideal": "...",
  "roteiro": [...],
  "proposta": [...],
  "email": { "assunto": "...", "corpo": "..." }
}

Roteiro: 4 fases. Proposta: 6 seções.
phase_color: fase 1 = "voss", fase 2 = "belfort", fase 3 = "hybrid", fase 4 = "close".`;

const SYSTEM_PROMPTS: Record<string, string> = {
  m1: SYSTEM_M1,
  m2a: SYSTEM_M2A,
  m2b: SYSTEM_M2B,
};

// ── B2B/B2C context instructions ──
const CONTEXT_INSTRUCTIONS: Record<string, string> = {
  b2b: `CONTEXTO DESTA VENDA: B2B (empresa/CNPJ).
Proposta: linguagem formal, escopo detalhado, entregáveis numerados, próximos passos explícitos.
Email: abertura formal, proposta de próxima reunião, sem CTA de compra direta.`,
  b2c: `CONTEXTO DESTA VENDA: B2C (pessoa física).
Proposta: linguagem direta e emocional, foco em transformação pessoal, máximo 1 página mental.
Email: tom pessoal, CTA direto e claro.`,
};

// ── Build system prompt with DNA injection (Layer 1 + Layer 2) ──
function buildSystemPrompt(modalidade: string, blocoInjetado: string | null): string {
  const base = SYSTEM_PROMPTS[modalidade];
  if (!blocoInjetado) return base;

  const dnaBlock = `[DNA COMERCIAL DO VENDEDOR — calibra estilo, nunca sobrescreve estrutura SVP]
${blocoInjetado}

REGRA: Se houver conflito entre o tom acima e qualquer regra estrutural SVP abaixo, a regra SVP prevalece sempre.

`;
  return dnaBlock + base;
}

// ── Build user prompt (Layer 3) ──
function buildUserPrompt(data: Record<string, string>, contextoGeracao: string | null): string {
  const lines: string[] = [];
  const fieldLabels: Record<string, string> = {
    nicho: "Nicho",
    produto: "Produto/Serviço",
    nomeCliente: "Nome do cliente",
    preco: "Preço de venda",
    limiteMinimo: "Piso de negociação",
    descricao: "Descrição do serviço",
    entregaveis: "Entregáveis",
    formatoEntrega: "Formato de entrega",
    perfilCliente: "Perfil do cliente ideal",
    objecaoPrincipal: "Principal objeção esperada",
    canalContato: "Canal do contato",
    notasT1: "Notas do Tempo 1",
    objecaoSurgida: "Objeção que surgiu",
  };

  for (const [key, label] of Object.entries(fieldLabels)) {
    if (data[key] && data[key].trim()) {
      lines.push(`${label}: ${data[key].trim()}`);
    }
  }

  // Add B2B/B2C context instruction
  if (contextoGeracao && CONTEXT_INSTRUCTIONS[contextoGeracao]) {
    lines.push("");
    lines.push(CONTEXT_INSTRUCTIONS[contextoGeracao]);
  }

  return lines.join("\n");
}

// ── Error response helpers ──
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
      throw new Error("ANTHROPIC_API_KEY não configurada no servidor.");
    }

    // ── Authenticate user ──
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return errorResponse("Não autenticado.", 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return errorResponse("Token inválido.", 401);

    // ── Parse body ──
    const body = await req.json();
    const { _modalidade, contexto_geracao, ...formFields } = body;

    if (!_modalidade || !SYSTEM_PROMPTS[_modalidade]) {
      return errorResponse("Modalidade inválida. Use m1, m2a ou m2b.", 400);
    }
    if (!formFields.nicho || !formFields.produto || !formFields.preco) {
      return errorResponse("Campos obrigatórios: nicho, produto, preco.", 400);
    }

    // ── Access verification ──
    const { data: usuario, error: userError } = await supabaseAdmin
      .from("usuarios")
      .select("*")
      .eq("id", user.id)
      .single();

    if (userError || !usuario) return errorResponse("Usuário não encontrado.", 404);

    // Check active
    if (!usuario.ativo) {
      const motivo = usuario.motivo_bloqueio || "";
      if (motivo.includes("reembolso")) {
        return errorResponse("Sua conta foi suspensa por reembolso. Fale com o suporte.", 403);
      }
      if (motivo.includes("chargeback")) {
        return errorResponse("Sua conta foi suspensa. Fale com o suporte.", 403);
      }
      return errorResponse(
        usuario.motivo_bloqueio || "Conta bloqueada. Fale com o suporte.",
        403
      );
    }

    // Check expiry
    if (usuario.acesso_svp_expira) {
      const expira = new Date(usuario.acesso_svp_expira);
      if (expira < new Date()) {
        return errorResponse("Seu acesso expirou. Renove sua assinatura para continuar.", 403);
      }
    }

    // Check monthly quota
    const plano = usuario.plano || "basico";
    const limite = PLAN_LIMITS[plano] || PLAN_LIMITS.basico;
    const consultasMes = usuario.consultas_mes || 0;
    if (consultasMes >= limite) {
      const hoje = new Date();
      const proximoReset = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
      const dataReset = proximoReset.toLocaleDateString("pt-BR");
      return errorResponse(
        `Você usou todos os ${limite} diagnósticos deste mês. Próximo reset em ${dataReset}.`,
        402
      );
    }

    // ── Load user DNA (Layer 2) ──
    const { data: dna } = await supabaseAdmin
      .from("usuario_dna")
      .select("bloco_injetado, contexto")
      .eq("usuario_id", user.id)
      .single();

    const blocoInjetado = dna?.bloco_injetado || null;

    // Determine B2B/B2C context
    let contexto = contexto_geracao || null;
    if (!contexto && dna?.contexto && dna.contexto !== "ambos") {
      contexto = dna.contexto;
    }

    // ── Build prompts ──
    const systemPrompt = buildSystemPrompt(_modalidade, blocoInjetado);
    const userPrompt = buildUserPrompt(formFields, contexto);

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
        max_tokens: 12000,
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
      console.error("Anthropic API error:", anthropicResponse.status, errText);
      return errorResponse(`Erro na API de IA: ${anthropicResponse.status}`, 502);
    }

    const anthropicData = await anthropicResponse.json();
    const rawText = anthropicData.content?.[0]?.text || "";
    const jsonString = "{" + rawText;

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      console.error("Failed to parse AI response:", jsonString.substring(0, 500));
      return errorResponse("Resposta da IA não é JSON válido.", 502);
    }

    // ── Track usage ──
    const usage = anthropicData.usage || {};
    const tokensEntrada = usage.input_tokens || 0;
    const tokensSaida = usage.output_tokens || 0;
    const tokensTotal = tokensEntrada + tokensSaida;
    const custoUsd = tokensEntrada * COST_INPUT_PER_TOKEN + tokensSaida * COST_OUTPUT_PER_TOKEN;

    // Insert generation record
    await supabaseAdmin.from("geracoes").insert({
      usuario_id: user.id,
      modalidade: _modalidade,
      contexto_geracao: contexto,
      nicho: formFields.nicho,
      produto: formFields.produto,
      tokens_entrada: tokensEntrada,
      tokens_saida: tokensSaida,
      tokens_total: tokensTotal,
      custo_usd: custoUsd,
    });

    // Update user stats
    await supabaseAdmin
      .from("usuarios")
      .update({
        consultas_mes: (usuario.consultas_mes || 0) + 1,
        consultas_total: (usuario.consultas_total || 0) + 1,
        tokens_total: (usuario.tokens_total || 0) + tokensTotal,
        custo_total_usd: (usuario.custo_total_usd || 0) + custoUsd,
      })
      .eq("id", user.id);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno do servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
