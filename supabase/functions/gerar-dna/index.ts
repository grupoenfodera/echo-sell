const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY não configurada.");
    }

    const { tom_primario, tom_secundario, peso_secundario, contexto, ticket_medio, nicho_principal } = await req.json();

    if (!tom_primario || !contexto || !ticket_medio || !nicho_principal) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: tom_primario, contexto, ticket_medio, nicho_principal." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const peso_primario = tom_secundario ? (100 - (peso_secundario || 30)) : 100;
    const tomDesc = tom_secundario
      ? `tom=${tom_primario} ${peso_primario}% + ${tom_secundario} ${peso_secundario || 30}%`
      : `tom=${tom_primario} 100%`;

    const prompt = `Dado o perfil: ${tomDesc}, contexto=${contexto}, ticket=${ticket_medio}, nicho=${nicho_principal}.
Gere um bloco de instrução de tom com máximo 120 tokens para injetar no system prompt de um assistente de vendas.
O bloco deve: calibrar vocabulário e estilo de frase, nunca sobrescrever estrutura do método SVP, usar as características do tom de forma sutil e natural.
Retorne apenas o texto do bloco, sem explicações.`;

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
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

    const data = await anthropicResponse.json();
    const bloco = data.content?.[0]?.text || "";

    return new Response(JSON.stringify({ bloco_injetado: bloco.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("gerar-dna error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
