const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const TOM_CONFIG = {
  tom_primario: "consultivo",
  tom_secundario: "relacional",
  peso: "70/30",
  contexto: "B2B",
  ticket: "R$ 5.000 – R$ 20.000",
  instrucao_tom:
    "Scripts com perguntas antes de afirmar. Conexão antes de lógica. Nunca pressão direta.",
  instrucao_proposta:
    "Linguagem formal. Incluir escopo detalhado, entregáveis numerados, próximos passos claros.",
  instrucao_email:
    "Abertura formal, fechamento com proposta de próxima reunião, não CTA de compra direta.",
};

const TOM_BLOCK = `
CONFIGURAÇÃO DE TOM E ESTILO (obrigatória em todo output):
- Tom primário: ${TOM_CONFIG.tom_primario} (${TOM_CONFIG.peso.split("/")[0]}%)
- Tom secundário: ${TOM_CONFIG.tom_secundario} (${TOM_CONFIG.peso.split("/")[1]}%)
- Contexto: ${TOM_CONFIG.contexto}, ticket ${TOM_CONFIG.ticket}
- Regra de tom nos scripts: ${TOM_CONFIG.instrucao_tom}
- Regra de proposta: ${TOM_CONFIG.instrucao_proposta}
- Regra de e-mail: ${TOM_CONFIG.instrucao_email}
`;

const SYSTEM_M1 = `Você é o gerador de diagnósticos do SVP — Sistema de Vendas Persuasivas de Thammy Manuella.

${TOM_BLOCK}

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

${TOM_BLOCK}

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

${TOM_BLOCK}

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

function buildUserPrompt(data: Record<string, string>): string {
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

  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY não configurada no servidor.");
    }

    const body = await req.json();
    const { _modalidade, ...formFields } = body;

    if (!_modalidade || !SYSTEM_PROMPTS[_modalidade]) {
      return new Response(
        JSON.stringify({ error: "Modalidade inválida. Use m1, m2a ou m2b." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!formFields.nicho || !formFields.produto || !formFields.preco) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: nicho, produto, preco." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = SYSTEM_PROMPTS[_modalidade];
    const userPrompt = buildUserPrompt(formFields);

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
      return new Response(
        JSON.stringify({ error: `Erro na API de IA: ${anthropicResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicData = await anthropicResponse.json();
    const rawText = anthropicData.content?.[0]?.text || "";

    // Prepend the "{" we used as prefill
    const jsonString = "{" + rawText;

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      console.error("Failed to parse AI response:", jsonString.substring(0, 500));
      return new Response(
        JSON.stringify({ error: "Resposta da IA não é JSON válido." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
