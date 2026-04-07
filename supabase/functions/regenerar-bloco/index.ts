import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY     = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

function errorResponse(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/* ── System prompt para regenerar UM bloco ── */
function buildSystemPrompt(bloco: string): string {
  const blocoFormatMap: Record<string, string> = {
    abertura: `Retorne JSON do bloco no formato:
{
  "numero": <number>,
  "bloco": "abertura",
  "titulo": "Abertura",
  "tempo": "0–5 min",
  "script": "...",
  "instrucoes_conduta": "→ ...\n→ ...",
  "nota_tecnica": "Título\\n\\nDescrição"
}`,
    descoberta: `Retorne JSON do bloco no formato:
{
  "numero": <number>,
  "bloco": "descoberta",
  "titulo": "Diagnóstico",
  "tempo": "5–20 min",
  "script": "BLOCO 1 — DESAFIOS:\\n\\"pergunta...\\"\n\n[SILÊNCIO TOTAL após a pergunta]\\n\nBLOCO 2 — DESEJOS E REFERÊNCIAS:\\n...\n\nBLOCO 3 — CRITÉRIO DE COMPRA:\\n...\n\nCONFIRMAÇÃO OBRIGATÓRIA\\n\\"Deixa eu confirmar...\\n\nPelo que você me contou...\\n— [...]\\n\nIsso está gerando:\\n— [...]\\n\nE o que você quer chegar é:\\n— [...]\\n\nÉ mais ou menos isso?\\"",
  "instrucoes_conduta": "→ ...",
  "nota_tecnica": "Título\\n\\nDescrição"
}`,
    solucao: `Retorne JSON do bloco no formato:
{
  "numero": <number>,
  "bloco": "solucao",
  "titulo": "Solução",
  "tempo": "20–35 min",
  "script": "...",
  "fases": [
    { "nome": "...", "descricao": "...", "ganho_cliente": "...", "micro_sin": "Faz sentido...?" }
  ],
  "instrucoes_conduta": "→ ...",
  "nota_tecnica": "Título\\n\\nDescrição"
}`,
    oferta: `Retorne JSON do bloco no formato:
{
  "numero": <number>,
  "bloco": "oferta",
  "titulo": "Oferta",
  "tempo": "35–42 min",
  "script_entregaveis": "...",
  "script_proximos_passos": "...",
  "script_preco": "...\n\n[pausa — silêncio de 5 segundos — não fale]",
  "script_avanco": "...",
  "instrucoes_conduta": "→ ...",
  "nota_tecnica": "Título\\n\\nDescrição"
}`,
    objecoes: `Retorne JSON do bloco no formato:
{
  "numero": <number>,
  "bloco": "objecoes",
  "titulo": "Objeções",
  "tempo": "42–52 min",
  "objecoes": [
    { "situacao": "...", "resposta": "...", "instrucao": "→ ..." }
  ],
  "nota_tecnica": "Título\\n\\nDescrição"
}`,
    fechamento: `Retorne JSON do bloco no formato:
{
  "numero": <number>,
  "bloco": "fechamento",
  "titulo": "Fechamento",
  "tempo": "52–60 min",
  "script_fechou": "...",
  "script_nao_fechou": "...",
  "instrucoes_conduta": "→ ...",
  "nota_tecnica": "Título\\n\\nDescrição"
}`,
  };

  const formato = blocoFormatMap[bloco] ?? blocoFormatMap["abertura"];

  return `Você é o regenerador de blocos do SVP — Sistema de Vendas Persuasivas, método de Thammy Manuella.

REGRAS ABSOLUTAS
- NUNCA mencione outros autores, frameworks ou metodologias. Todo método é SVP.
- NUNCA invente cases ou resultados — use apenas o case_real informado.
- Português brasileiro natural — direto, sem ser genérico.
- Zero texto genérico — use termos exatos do nicho informado.
- Adapte ao estado_emocional, perfil_decisor e tom_ideal do cliente.
- Incorpore a instrução do usuário sem perder a estrutura SVP.

FORMATO — retorne JSON puro, sem markdown, sem crases:

${formato}`;
}

/* ── Main handler ── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return errorResponse("Não autenticado.", 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return errorResponse("Token inválido.", 401);

    // Parse body
    const { sessao_id, bloco_index, instrucao } = await req.json();
    if (!sessao_id || bloco_index === undefined || !instrucao?.trim()) {
      return errorResponse("sessao_id, bloco_index e instrucao são obrigatórios.");
    }

    // Buscar sessão
    const { data: sessao, error: sessaoErr } = await supabaseAdmin
      .from("sessoes_venda")
      .select("*")
      .eq("id", sessao_id)
      .eq("usuario_id", user.id)
      .single();

    if (sessaoErr || !sessao) return errorResponse("Sessão não encontrada.", 404);
    if (!sessao.roteiro_json) return errorResponse("Roteiro não encontrado.");

    const roteiro = sessao.roteiro_json as any;
    const blocos  = Array.isArray(roteiro.roteiro_reuniao) ? roteiro.roteiro_reuniao : [];
    const blocoAtual = blocos[bloco_index];
    if (!blocoAtual) return errorResponse(`Bloco ${bloco_index} não encontrado.`);

    const dadosForm = (sessao.dados_formulario ?? {}) as Record<string, string>;

    // Montar contexto do cliente para a IA
    const contextoCliente = {
      nome_cliente:     dadosForm.nome_cliente    || "",
      nicho:            sessao.nicho              || "",
      produto:          sessao.produto            || "",
      preco:            sessao.preco              || 0,
      estado_emocional: dadosForm.estado_emocional || "",
      perfil_decisor:   dadosForm.perfil_decisor   || "",
      processamento:    dadosForm.processamento_info || "",
      case_real:        dadosForm.case_real        || "",
      contexto_extra:   sessao.contexto            || "",
      // Insights da geração original
      maior_medo:       roteiro.maior_medo         || "",
      decisao_style:    roteiro.decisao_style       || "",
      tom_ideal:        roteiro.tom_ideal           || "",
      alerta_terceiro:  roteiro.alerta_terceiro     || "",
      resumo_estrategico: roteiro.resumo_estrategico || "",
      // Outros blocos (resumo) para manter consistência
      outros_blocos: blocos
        .filter((_: any, i: number) => i !== bloco_index)
        .map((b: any) => ({ bloco: b.bloco, titulo: b.titulo, nota: b.nota_tecnica?.split("\n")[0] || "" })),
    };

    const userMessage = JSON.stringify({
      bloco_atual:       blocoAtual,
      contexto_cliente:  contextoCliente,
      instrucao_usuario: instrucao.trim(),
    });

    // Chamar Claude
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-api-key":       ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-5",
        max_tokens: 4096,
        system:     buildSystemPrompt(blocoAtual.bloco),
        messages:   [{ role: "user", content: userMessage }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      return errorResponse(`Erro Claude: ${err}`, 502);
    }

    const claudeData = await claudeRes.json();
    const raw = claudeData.content?.[0]?.text ?? "";

    // Parse JSON do bloco regenerado
    let blocoNovo: any;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      blocoNovo = JSON.parse(match ? match[0] : raw);
    } catch {
      return errorResponse("Resposta inválida da IA. Tente novamente.");
    }

    // Garantir campos obrigatórios
    blocoNovo.numero = blocoAtual.numero;
    blocoNovo.bloco  = blocoAtual.bloco;
    blocoNovo.titulo = blocoAtual.titulo;
    blocoNovo.tempo  = blocoAtual.tempo;

    // Atualizar sessão no banco
    const novosBlockos = [...blocos];
    novosBlockos[bloco_index] = blocoNovo;

    const { error: updateErr } = await supabaseAdmin
      .from("sessoes_venda")
      .update({ roteiro_json: { ...roteiro, roteiro_reuniao: novosBlockos } })
      .eq("id", sessao_id);

    if (updateErr) return errorResponse("Erro ao salvar bloco regenerado.");

    return new Response(JSON.stringify({ ok: true, bloco: blocoNovo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return errorResponse(e.message ?? "Erro interno.", 500);
  }
});
