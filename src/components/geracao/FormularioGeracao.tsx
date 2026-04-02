import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, Sparkles, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import type { GerarRoteiroPayload } from '@/types/crm';

interface FormularioGeracaoProps {
  onSubmit: (payload: GerarRoteiroPayload) => void;
  loading: boolean;
  error: string | null;
}

const STEP_TITLES = ['O Cliente', 'O Produto/Serviço', 'A Venda'];

export function FormularioGeracao({ onSubmit, loading, error }: FormularioGeracaoProps) {
  const [step, setStep] = useState(0);

  // Step 1
  const [nomeCliente, setNomeCliente] = useState('');
  const [perfilDecisor, setPerfilDecisor] = useState('');
  const [estadoEmocional, setEstadoEmocional] = useState('');
  const [outrosDecisores, setOutrosDecisores] = useState('');
  const [referenciaPreco, setReferenciaPreco] = useState('');
  const [processamentoInfo, setProcessamentoInfo] = useState('');
  const [palavrasExatas, setPalavrasExatas] = useState('');

  // Step 2
  const [nicho, setNicho] = useState('');
  const [produto, setProduto] = useState('');
  const [resultadoEntregue, setResultadoEntregue] = useState('');
  const [contextoGeracao, setContextoGeracao] = useState<'b2b' | 'b2c'>('b2b');

  // Step 3
  const [precoAncora, setPrecoAncora] = useState('');
  const [precoMeta, setPrecoMeta] = useState('');
  const [precoMinimo, setPrecoMinimo] = useState('');
  const [urgenciaReal, setUrgenciaReal] = useState('');
  const [qualificacaoPrevia, setQualificacaoPrevia] = useState('');
  const [objecoesIdentificadas, setObjecoesIdentificadas] = useState('');
  const [oQueImpediria, setOQueImpediria] = useState('');
  const [tentativaAnterior, setTentativaAnterior] = useState('');
  const [caseReal, setCaseReal] = useState('');
  const [objecaoPrincipal, setObjecaoPrincipal] = useState('');
  const [garantia, setGarantia] = useState('');
  const [entregaveisDetalhados, setEntregaveisDetalhados] = useState('');
  const [nomeMetodologia, setNomeMetodologia] = useState('');
  const [formatoDuracao, setFormatoDuracao] = useState('');

  const canAdvanceStep1 = nomeCliente.trim() && perfilDecisor && estadoEmocional;
  const canAdvanceStep2 = nicho.trim() && produto.trim();
  const canSubmit = precoAncora && precoMeta && precoMinimo;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: GerarRoteiroPayload = {
      nicho,
      produto,
      contextoGeracao,
      nome_cliente: nomeCliente,
      preco: Number(precoMeta),
      dados_extras: {
        perfil_decisor: perfilDecisor,
        estado_emocional: estadoEmocional,
        ...(outrosDecisores && { outros_decisores: outrosDecisores }),
        ...(referenciaPreco && { referencia_preco: referenciaPreco }),
        ...(processamentoInfo && { processamento_info: processamentoInfo }),
        ...(palavrasExatas && { palavras_exatas: palavrasExatas }),
        ...(resultadoEntregue && { resultado_entregue: resultadoEntregue }),
        preco_ancora: Number(precoAncora),
        preco_meta: Number(precoMeta),
        preco_minimo: Number(precoMinimo),
        ...(urgenciaReal && { urgencia_real: urgenciaReal }),
        ...(qualificacaoPrevia && { qualificacao_previa: qualificacaoPrevia }),
        ...(objecoesIdentificadas && { objecoes_identificadas: objecoesIdentificadas }),
        ...(oQueImpediria && { o_que_impediria: oQueImpediria }),
        ...(tentativaAnterior && { tentativa_anterior: tentativaAnterior }),
        ...(caseReal && { case_real: caseReal }),
        ...(objecaoPrincipal && { objecao_principal: objecaoPrincipal }),
        ...(garantia && { garantia }),
        ...(entregaveisDetalhados && { entregaveis_detalhados: entregaveisDetalhados }),
        ...(nomeMetodologia && { nome_metodologia: nomeMetodologia }),
        ...(formatoDuracao && { formato_duracao: formatoDuracao }),
      },
    };
    onSubmit(payload);
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 2));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const Opt = () => <span className="text-xs text-muted-foreground font-normal ml-1">(opcional)</span>;
  const Req = () => <span className="text-destructive">*</span>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Etapa {step + 1} de 3 — {STEP_TITLES[step]}</span>
        </div>
        <Progress value={((step + 1) / 3) * 100} className="h-2" />
      </div>

      {/* STEP 1 */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome_cliente">Nome do cliente <Req /></Label>
            <Input id="nome_cliente" placeholder="Ex: João Silva" value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} required disabled={loading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="perfil_decisor">Perfil do decisor <Req /></Label>
            <Select value={perfilDecisor} onValueChange={setPerfilDecisor} disabled={loading}>
              <SelectTrigger id="perfil_decisor"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="analitico">Analítico (precisa de dados e lógica)</SelectItem>
                <SelectItem value="expressivo">Expressivo (movido por emoção e visão)</SelectItem>
                <SelectItem value="controlador">Controlador (foco em resultados e controle)</SelectItem>
                <SelectItem value="amigavel">Amigável (precisa de segurança e relacionamento)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estado_emocional">Como ele chegou para esta reunião? <Req /></Label>
            <Select value={estadoEmocional} onValueChange={setEstadoEmocional} disabled={loading}>
              <SelectTrigger id="estado_emocional"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="animado_receptivo">Animado e receptivo</SelectItem>
                <SelectItem value="neutro_pesquisando">Neutro / só pesquisando</SelectItem>
                <SelectItem value="desconfiado">Desconfiado / já foi enganado antes</SelectItem>
                <SelectItem value="com_pressa">Com pressa / pouco tempo</SelectItem>
                <SelectItem value="comparando">Comparando com concorrentes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="outros_decisores">Há outras pessoas que precisam aprovar? <Opt /></Label>
            <Input id="outros_decisores" placeholder="Ex: sócio, CFO, cônjuge..." value={outrosDecisores} onChange={e => setOutrosDecisores(e.target.value)} disabled={loading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="referencia_preco">Qual o preço de referência dele? <Opt /></Label>
            <Input id="referencia_preco" placeholder="Ex: já paga R$500/mês com concorrente, orçou R$800..." value={referenciaPreco} onChange={e => setReferenciaPreco(e.target.value)} disabled={loading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="processamento_info">Como ele processa informações? <Opt /></Label>
            <Select value={processamentoInfo} onValueChange={setProcessamentoInfo} disabled={loading}>
              <SelectTrigger id="processamento_info"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="visual">Visual (prefere ver, gráficos, exemplos visuais)</SelectItem>
                <SelectItem value="auditivo">Auditivo (prefere ouvir explicações detalhadas)</SelectItem>
                <SelectItem value="cinestesico">Cinestésico (prefere sentir, testar, praticar)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="palavras_exatas">Palavras exatas que ele usou para descrever o problema <Opt /></Label>
            <Textarea id="palavras_exatas" placeholder='Ex: "estou travado", "não consigo crescer", "perco tempo demais"...' value={palavrasExatas} onChange={e => setPalavrasExatas(e.target.value)} disabled={loading} rows={2} />
          </div>

          <Button type="button" className="w-full" onClick={nextStep} disabled={!canAdvanceStep1}>
            Próxima etapa <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nicho">Nicho / Segmento <Req /></Label>
            <Input id="nicho" placeholder="Ex: Clínicas de estética, Escritórios de advocacia..." value={nicho} onChange={e => setNicho(e.target.value)} required disabled={loading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="produto">Produto ou Serviço <Req /></Label>
            <Textarea id="produto" placeholder="Descreva o que você vende e seus diferenciais" value={produto} onChange={e => setProduto(e.target.value)} required disabled={loading} rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resultado_entregue">Qual resultado concreto você entrega? <Opt /></Label>
            <Textarea id="resultado_entregue" placeholder="Ex: aumento de 30% nas vendas em 90 dias..." value={resultadoEntregue} onChange={e => setResultadoEntregue(e.target.value)} disabled={loading} rows={2} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contexto">Contexto de Venda <Req /></Label>
            <Select value={contextoGeracao} onValueChange={v => setContextoGeracao(v as 'b2b' | 'b2c')} disabled={loading}>
              <SelectTrigger id="contexto"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="b2b">B2B — Empresa para Empresa</SelectItem>
                <SelectItem value="b2c">B2C — Empresa para Pessoa Física</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={prevStep}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button type="button" className="flex-1" onClick={nextStep} disabled={!canAdvanceStep2}>
              Próxima etapa <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preco_ancora">Preço âncora (R$) <Req /></Label>
              <Input id="preco_ancora" type="number" placeholder="Ex: 2500" value={precoAncora} onChange={e => setPrecoAncora(e.target.value)} required disabled={loading} min={0} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preco_meta">Preço meta (R$) <Req /></Label>
              <Input id="preco_meta" type="number" placeholder="Ex: 1800" value={precoMeta} onChange={e => setPrecoMeta(e.target.value)} required disabled={loading} min={0} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preco_minimo">Preço mínimo (R$) <Req /></Label>
              <Input id="preco_minimo" type="number" placeholder="Ex: 1200" value={precoMinimo} onChange={e => setPrecoMinimo(e.target.value)} required disabled={loading} min={0} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="urgencia_real">Existe urgência real para decidir? <Opt /></Label>
            <Input id="urgencia_real" placeholder="Ex: promoção até sexta, vagas limitadas, evento se aproximando..." value={urgenciaReal} onChange={e => setUrgenciaReal(e.target.value)} disabled={loading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qualificacao_previa">O que você já sabe sobre ele antes desta reunião? <Opt /></Label>
            <Textarea id="qualificacao_previa" placeholder="Ex: tem loja há 3 anos, faturamento médio R$30k/mês, tentou ads antes..." value={qualificacaoPrevia} onChange={e => setQualificacaoPrevia(e.target.value)} disabled={loading} rows={2} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objecoes_identificadas">Quais objeções você já espera? <Opt /></Label>
            <Textarea id="objecoes_identificadas" placeholder="Ex: vai dizer que é caro, que precisa pensar, que já tem alguém..." value={objecoesIdentificadas} onChange={e => setObjecoesIdentificadas(e.target.value)} disabled={loading} rows={2} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tentativa_anterior">Já tentou vender para ele antes? <Opt /></Label>
            <Input id="tentativa_anterior" placeholder="Ex: sim, reunião há 2 meses, disse que voltaria em janeiro" value={tentativaAnterior} onChange={e => setTentativaAnterior(e.target.value)} disabled={loading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="case_real">Seu melhor case de resultado para este nicho <Opt /></Label>
            <Textarea id="case_real" placeholder="Ex: cliente do mesmo segmento triplicou o faturamento em 4 meses..." value={caseReal} onChange={e => setCaseReal(e.target.value)} disabled={loading} rows={2} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objecao_principal">Objeção que mais trava suas vendas neste nicho <Opt /></Label>
            <Input id="objecao_principal" placeholder="Ex: 'já tenho fornecedor', 'não tenho orçamento'..." value={objecaoPrincipal} onChange={e => setObjecaoPrincipal(e.target.value)} disabled={loading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="garantia">Qual garantia você oferece? <Opt /></Label>
            <Input id="garantia" placeholder="Ex: 30 dias ou devolvo, 3 ajustes inclusos..." value={garantia} onChange={e => setGarantia(e.target.value)} disabled={loading} />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={prevStep} disabled={loading}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !canSubmit}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando roteiro...</>
              ) : (
                <>Gerar Roteiro <Sparkles className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
