import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, ArrowRight, ArrowLeft, Sparkles, Map, FileText, UserCircle, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

// ── Types ─────────────────────────────────────────
export interface WizardData {
  nome_cliente: string;
  perfil_decisor: string;
  estado_emocional: string;
  outros_decisores: string;
  referencia_preco: string;
  processamento_info: string;
  palavras_exatas: string;
  nicho: string;
  nome_produto: string;
  produto: string;
  resultado_entregue: string;
  entregaveis_detalhados: string;
  nome_metodologia: string;
  contexto: 'b2b' | 'b2c' | '';
  preco_ancora: string;
  preco_meta: string;
  preco_minimo: string;
  urgencia_real: string;
  qualificacao_previa: string;
  objecoes_identificadas: string;
  o_que_impediria: string;
  tentativa_anterior: string;
  case_real: string;
  objecao_principal: string;
  garantia: string;
  formato_duracao: string;
}

export interface GeracaoWizardProps {
  onSubmit: (dados: WizardData, tipo: 'roteiro' | 'proposta') => void;
  isLoading?: boolean;
  loadingTipo?: 'roteiro' | 'proposta' | null;
}

interface Persona {
  id: string;
  nome: string;
  perfil_decisor: string | null;
  processamento_info: string | null;
  referencia_preco: string | null;
  objecoes_comuns: string | null;
}

interface Produto {
  id: string;
  nome: string;
  nicho: string | null;
  descricao: string | null;
  resultado_entregue: string | null;
  entregaveis_detalhados: string | null;
  nome_metodologia: string | null;
  garantia: string | null;
  case_real: string | null;
  objecao_principal: string | null;
  formato_duracao: string | null;
  preco_ancora: number | null;
  preco_meta: number | null;
  preco_minimo: number | null;
}

const STEPS = [
  { key: 'cliente', label: 'O Cliente' },
  { key: 'produto', label: 'Produto/Serviço' },
  { key: 'venda', label: 'A Venda' },
] as const;

const initialData: WizardData = {
  nome_cliente: '',
  perfil_decisor: '',
  estado_emocional: '',
  outros_decisores: '',
  referencia_preco: '',
  processamento_info: '',
  palavras_exatas: '',
  nicho: '',
  nome_produto: '',
  produto: '',
  resultado_entregue: '',
  entregaveis_detalhados: '',
  nome_metodologia: '',
  contexto: '',
  preco_ancora: '',
  preco_meta: '',
  preco_minimo: '',
  urgencia_real: '',
  qualificacao_previa: '',
  objecoes_identificadas: '',
  o_que_impediria: '',
  tentativa_anterior: '',
  case_real: '',
  objecao_principal: '',
  garantia: '',
  formato_duracao: '',
};

const Opt = () => <span className="text-xs text-muted-foreground font-normal ml-1">(opcional)</span>;
const Req = () => <span className="text-destructive">*</span>;

// ── Score calculation ─────────────────────────────
function calcScore(data: WizardData): number {
  let personalizacao = 0;
  if (data.nome_cliente.trim()) personalizacao += 5;
  if (data.perfil_decisor) personalizacao += 8;
  if (data.palavras_exatas.trim()) personalizacao += 10;
  if (data.qualificacao_previa.trim()) personalizacao += 7;

  let clareza = 0;
  if (data.nicho.trim() && data.produto.trim()) clareza += 10;
  if (data.entregaveis_detalhados.trim()) clareza += 8;
  if (data.nome_metodologia.trim()) clareza += 7;

  const bonusCaseReal = data.case_real.trim() ? 5 : 0;

  let urgencia = 0;
  if (data.preco_ancora && data.preco_meta && data.preco_minimo) urgencia += 15;
  if (data.urgencia_real.trim()) urgencia += 5;
  urgencia = Math.min(urgencia, 20);

  let tom = 0;
  if (data.estado_emocional) tom += 7;
  if (data.processamento_info) tom += 5;
  if (data.outros_decisores.trim()) tom += 5;
  if (data.referencia_preco.trim()) tom += 5;
  if (data.formato_duracao.trim()) tom += 3;

  return Math.min(personalizacao, 30) + Math.min(clareza, 25) + bonusCaseReal + urgencia + Math.min(tom, 25);
}

function getScoreColor(score: number): string {
  if (score < 60) return 'text-red-500';
  if (score < 80) return 'text-amber-500';
  return 'text-green-500';
}

function getScoreBgColor(score: number): string {
  if (score < 60) return 'bg-red-500/10 border-red-500/30';
  if (score < 80) return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-green-500/10 border-green-500/30';
}

function getButtonLabel(score: number, loading: boolean, loadingTipo: string | null, tipo: 'roteiro' | 'proposta'): React.ReactNode {
  if (loading && loadingTipo === tipo) {
    return <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>;
  }
  if (tipo === 'proposta') {
    if (score < 60) return <><FileText className="mr-2 h-4 w-4" /> Proposta base (~60s)</>;
    if (score < 80) return <><Sparkles className="mr-2 h-4 w-4" /> Proposta ↗ (~60s)</>;
    return <><Sparkles className="mr-2 h-4 w-4" /> ✨ Proposta completa (~60s)</>;
  }
  if (score < 60) return <><Map className="mr-2 h-4 w-4" /> Gerar roteiro base (~30s)</>;
  if (score < 80) return <><Map className="mr-2 h-4 w-4" /> Gerar roteiro ↗ (~30s)</>;
  return <><Map className="mr-2 h-4 w-4" /> ✨ Gerar roteiro completo (~30s)</>;
}

// ── Score Badge ───────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-bold ${getScoreBgColor(score)} ${getScoreColor(score)}`}>
      <span>{score}/100</span>
    </div>
  );
}

// ── API helpers ───────────────────────────────────
const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function fetchWithAuth<T>(endpoint: string): Promise<T | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return null;
    const res = await fetch(`${FUNCTIONS_URL}/${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Progress Bar ──────────────────────────────────
function ProgressBar({ currentStep, score }: { currentStep: number; score: number }) {
  return (
    <div className="space-y-2 mb-6">
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Etapa {currentStep + 1} de 3 | {STEPS[currentStep].label}</span>
        <ScoreBadge score={score} />
      </div>
      <Progress value={((currentStep + 1) / 3) * 100} className="h-2" />
      <div className="flex items-center justify-center gap-0 mt-3">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep;
          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : isCurrent
                      ? 'border-2 border-primary text-primary bg-background'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={`text-xs mt-1 font-medium whitespace-nowrap ${
                    isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-12 sm:w-20 h-0.5 mx-2 mb-5 transition-colors ${
                    i < currentStep ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 1: O Cliente ─────────────────────────────
function StepCliente({
  data,
  onChange,
  errors,
  personas,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
  errors: Record<string, string>;
  personas: Persona[];
}) {
  const handlePersonaSelect = (personaId: string) => {
    const persona = personas.find(p => p.id === personaId);
    if (!persona) return;
    const updates: Partial<WizardData> = {};
    if (!data.perfil_decisor && persona.perfil_decisor) updates.perfil_decisor = persona.perfil_decisor;
    if (!data.processamento_info && persona.processamento_info) updates.processamento_info = persona.processamento_info;
    if (!data.referencia_preco && persona.referencia_preco) updates.referencia_preco = persona.referencia_preco;
    if (!data.objecoes_identificadas && persona.objecoes_comuns) updates.objecoes_identificadas = persona.objecoes_comuns;
    if (Object.keys(updates).length) onChange(updates);
  };

  return (
    <div className="space-y-4">
      {personas.length > 0 && (
        <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
          <Label htmlFor="persona_select" className="flex items-center gap-1.5">
            <UserCircle className="h-4 w-4 text-primary" />
            Carregar persona salva <Opt />
          </Label>
          <Select onValueChange={handlePersonaSelect}>
            <SelectTrigger id="persona_select"><SelectValue placeholder="Selecione uma persona..." /></SelectTrigger>
            <SelectContent>
              {personas.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="nome_cliente">Nome do cliente <Req /></Label>
        <Input id="nome_cliente" placeholder="Ex: João Silva" value={data.nome_cliente} onChange={e => onChange({ nome_cliente: e.target.value })} />
        {errors.nome_cliente && <p className="text-xs text-destructive">{errors.nome_cliente}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="perfil_decisor">Perfil do decisor <Req /></Label>
        <Select value={data.perfil_decisor} onValueChange={v => onChange({ perfil_decisor: v })}>
          <SelectTrigger id="perfil_decisor"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="analitico">Analítico (precisa de dados e lógica)</SelectItem>
            <SelectItem value="expressivo">Expressivo (movido por emoção e visão)</SelectItem>
            <SelectItem value="controlador">Controlador (foco em resultados e controle)</SelectItem>
            <SelectItem value="amigavel">Amigável (precisa de segurança e relacionamento)</SelectItem>
          </SelectContent>
        </Select>
        {errors.perfil_decisor && <p className="text-xs text-destructive">{errors.perfil_decisor}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="estado_emocional">Como ele chegou para esta reunião? <Req /></Label>
        <Select value={data.estado_emocional} onValueChange={v => onChange({ estado_emocional: v })}>
          <SelectTrigger id="estado_emocional"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="animado_receptivo">Animado e receptivo</SelectItem>
            <SelectItem value="neutro_pesquisando">Neutro / só pesquisando</SelectItem>
            <SelectItem value="desconfiado">Desconfiado / já foi enganado antes</SelectItem>
            <SelectItem value="com_pressa">Com pressa / pouco tempo</SelectItem>
            <SelectItem value="comparando">Comparando com concorrentes</SelectItem>
          </SelectContent>
        </Select>
        {errors.estado_emocional && <p className="text-xs text-destructive">{errors.estado_emocional}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="outros_decisores">Há outras pessoas que precisam aprovar? <Opt /></Label>
        <Input id="outros_decisores" placeholder="Ex: sócio, CFO, cônjuge..." value={data.outros_decisores} onChange={e => onChange({ outros_decisores: e.target.value })} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="referencia_preco">Qual o preço de referência dele? <Opt /></Label>
        <Input id="referencia_preco" placeholder="Ex: já paga R$500/mês com concorrente, orçou R$800..." value={data.referencia_preco} onChange={e => onChange({ referencia_preco: e.target.value })} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="processamento_info">Como ele processa informações? <Opt /></Label>
        <Select value={data.processamento_info} onValueChange={v => onChange({ processamento_info: v })}>
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
        <Textarea id="palavras_exatas" placeholder='Ex: "estou travado", "não consigo crescer", "perco tempo demais"...' value={data.palavras_exatas} onChange={e => onChange({ palavras_exatas: e.target.value })} rows={2} />
      </div>
    </div>
  );
}

// ── Step 2: Produto/Serviço ───────────────────────
function StepProduto({
  data,
  onChange,
  errors,
  produtos,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
  errors: Record<string, string>;
  produtos: Produto[];
}) {
  const handleProdutoSelect = (produtoId: string) => {
    const prod = produtos.find(p => p.id === produtoId);
    if (!prod) return;
    const updates: Partial<WizardData> = {};
    if (!data.nicho && prod.nicho) updates.nicho = prod.nicho;
    if (!data.produto && prod.descricao) updates.produto = prod.descricao;
    if (!data.resultado_entregue && prod.resultado_entregue) updates.resultado_entregue = prod.resultado_entregue;
    if (!data.entregaveis_detalhados && prod.entregaveis_detalhados) updates.entregaveis_detalhados = prod.entregaveis_detalhados;
    if (!data.nome_metodologia && prod.nome_metodologia) updates.nome_metodologia = prod.nome_metodologia;
    if (!data.garantia && prod.garantia) updates.garantia = prod.garantia;
    if (!data.case_real && prod.case_real) updates.case_real = prod.case_real;
    if (!data.objecao_principal && prod.objecao_principal) updates.objecao_principal = prod.objecao_principal;
    if (!data.formato_duracao && prod.formato_duracao) updates.formato_duracao = prod.formato_duracao;
    if (!data.preco_ancora && prod.preco_ancora) updates.preco_ancora = String(prod.preco_ancora);
    if (!data.preco_meta && prod.preco_meta) updates.preco_meta = String(prod.preco_meta);
    if (!data.preco_minimo && prod.preco_minimo) updates.preco_minimo = String(prod.preco_minimo);
    if (Object.keys(updates).length) onChange(updates);
  };

  return (
    <div className="space-y-4">
      {produtos.length > 0 && (
        <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
          <Label htmlFor="produto_select" className="flex items-center gap-1.5">
            <Package className="h-4 w-4 text-primary" />
            Carregar produto salvo <Opt />
          </Label>
          <Select onValueChange={handleProdutoSelect}>
            <SelectTrigger id="produto_select"><SelectValue placeholder="Selecione um produto..." /></SelectTrigger>
            <SelectContent>
              {produtos.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="nicho">Nicho / Segmento <Req /></Label>
        <Input id="nicho" placeholder="Ex: Clínicas de estética, Escritórios de advocacia..." value={data.nicho} onChange={e => onChange({ nicho: e.target.value })} />
        {errors.nicho && <p className="text-xs text-destructive">{errors.nicho}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="nome_produto">Nome do Produto ou Serviço <Req /></Label>
        <Input id="nome_produto" placeholder="Ex: Consultoria de Marketing Digital, Plano Premium..." value={data.nome_produto} onChange={e => onChange({ nome_produto: e.target.value })} />
        {errors.nome_produto && <p className="text-xs text-destructive">{errors.nome_produto}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="produto">Descrição e Diferenciais <Req /></Label>
        <Textarea id="produto" placeholder="Descreva o que você vende, como funciona e seus diferenciais" value={data.produto} onChange={e => onChange({ produto: e.target.value })} rows={3} />
        {errors.produto && <p className="text-xs text-destructive">{errors.produto}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="resultado_entregue">Qual resultado concreto você entrega? <Opt /></Label>
        <Textarea id="resultado_entregue" placeholder="Ex: aumento de 30% nas vendas em 90 dias..." value={data.resultado_entregue} onChange={e => onChange({ resultado_entregue: e.target.value })} rows={2} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="entregaveis_detalhados">Quais são os entregáveis detalhados? <Opt /></Label>
        <Textarea id="entregaveis_detalhados" placeholder="Ex: 8 semanas de acompanhamento, planilha de gestão, 2 mentorias individuais..." value={data.entregaveis_detalhados} onChange={e => onChange({ entregaveis_detalhados: e.target.value })} rows={2} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nome_metodologia">Como se chama sua metodologia/solução? <Opt /></Label>
        <Input id="nome_metodologia" placeholder="Ex: Método SVP, Protocolo Presença, Sistema X..." value={data.nome_metodologia} onChange={e => onChange({ nome_metodologia: e.target.value })} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contexto">Contexto de Venda <Req /></Label>
        <Select value={data.contexto} onValueChange={v => onChange({ contexto: v as 'b2b' | 'b2c' })}>
          <SelectTrigger id="contexto"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="b2b">B2B — Empresa para Empresa</SelectItem>
            <SelectItem value="b2c">B2C — Empresa para Pessoa Física</SelectItem>
          </SelectContent>
        </Select>
        {errors.contexto && <p className="text-xs text-destructive">{errors.contexto}</p>}
      </div>
    </div>
  );
}

// ── Step 3: A Venda ───────────────────────────────
function StepVenda({
  data,
  onChange,
  errors,
  isLoading,
  loadingTipo,
  onSelect,
  score,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
  errors: Record<string, string>;
  isLoading?: boolean;
  loadingTipo?: 'roteiro' | 'proposta' | null;
  onSelect: (tipo: 'roteiro' | 'proposta') => void;
  score: number;
}) {
  const canSubmit = data.preco_ancora && data.preco_meta && data.preco_minimo;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="preco_ancora">Preço âncora (R$) <Req /></Label>
          <Input id="preco_ancora" type="number" placeholder="Ex: 2500" value={data.preco_ancora} onChange={e => onChange({ preco_ancora: e.target.value })} min={0} />
          {errors.preco_ancora && <p className="text-xs text-destructive">{errors.preco_ancora}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="preco_meta">Preço meta (R$) <Req /></Label>
          <Input id="preco_meta" type="number" placeholder="Ex: 1800" value={data.preco_meta} onChange={e => onChange({ preco_meta: e.target.value })} min={0} />
          {errors.preco_meta && <p className="text-xs text-destructive">{errors.preco_meta}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="preco_minimo">Preço mínimo (R$) <Req /></Label>
          <Input id="preco_minimo" type="number" placeholder="Ex: 1200" value={data.preco_minimo} onChange={e => onChange({ preco_minimo: e.target.value })} min={0} />
          {errors.preco_minimo && <p className="text-xs text-destructive">{errors.preco_minimo}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="urgencia_real">Existe urgência real para decidir? <Opt /></Label>
        <Input id="urgencia_real" placeholder="Ex: promoção até sexta, vagas limitadas, evento se aproximando..." value={data.urgencia_real} onChange={e => onChange({ urgencia_real: e.target.value })} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="qualificacao_previa">O que você já sabe sobre ele antes desta reunião? <Opt /></Label>
        <Textarea id="qualificacao_previa" placeholder="Ex: tem loja há 3 anos, faturamento médio R$30k/mês, tentou ads antes..." value={data.qualificacao_previa} onChange={e => onChange({ qualificacao_previa: e.target.value })} rows={2} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="objecoes_identificadas">Quais objeções você já espera? <Opt /></Label>
        <Textarea id="objecoes_identificadas" placeholder="Ex: vai dizer que é caro, que precisa pensar, que já tem alguém..." value={data.objecoes_identificadas} onChange={e => onChange({ objecoes_identificadas: e.target.value })} rows={2} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="o_que_impediria">O que poderia impedir ele de avançar? <Opt /></Label>
        <Textarea id="o_que_impediria" placeholder="Ex: sócio precisa aprovar, orçamento travado até julho, já tentou algo parecido..." value={data.o_que_impediria} onChange={e => onChange({ o_que_impediria: e.target.value })} rows={2} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tentativa_anterior">Já tentou vender para ele antes? <Opt /></Label>
        <Input id="tentativa_anterior" placeholder="Ex: sim, reunião há 2 meses, disse que voltaria em janeiro" value={data.tentativa_anterior} onChange={e => onChange({ tentativa_anterior: e.target.value })} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="case_real">Seu melhor case de resultado para este nicho <Opt /></Label>
        <Textarea id="case_real" placeholder="Ex: cliente do mesmo segmento triplicou o faturamento em 4 meses..." value={data.case_real} onChange={e => onChange({ case_real: e.target.value })} rows={2} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="objecao_principal">Objeção que mais trava suas vendas neste nicho <Opt /></Label>
        <Input id="objecao_principal" placeholder="Ex: 'já tenho fornecedor', 'não tenho orçamento'..." value={data.objecao_principal} onChange={e => onChange({ objecao_principal: e.target.value })} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="garantia">Qual garantia você oferece? <Opt /></Label>
        <Input id="garantia" placeholder="Ex: 30 dias ou devolvo, 3 ajustes inclusos..." value={data.garantia} onChange={e => onChange({ garantia: e.target.value })} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="formato_duracao">Formato e duração do trabalho <Opt /></Label>
        <Input id="formato_duracao" placeholder="Ex: 3 meses, encontros semanais online, mentoria individual..." value={data.formato_duracao} onChange={e => onChange({ formato_duracao: e.target.value })} />
      </div>

      {/* Generate buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isLoading || !canSubmit}
          onClick={() => onSelect('roteiro')}
        >
          {getButtonLabel(score, !!isLoading, loadingTipo ?? null, 'roteiro')}
        </Button>
        <Button
          type="button"
          className="w-full"
          disabled={isLoading || !canSubmit}
          onClick={() => onSelect('proposta')}
        >
          {getButtonLabel(score, !!isLoading, loadingTipo ?? null, 'proposta')}
        </Button>
      </div>
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────
export default function GeracaoWizard({
  onSubmit,
  isLoading = false,
  loadingTipo = null,
}: GeracaoWizardProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  const score = useMemo(() => calcScore(data), [data]);

  // Load personas and produtos on mount
  useEffect(() => {
    fetchWithAuth<{ personas?: Persona[] }>('personas-listar').then(res => {
      if (res?.personas?.length) setPersonas(res.personas);
    });
    fetchWithAuth<{ produtos?: Produto[] }>('produtos-listar').then(res => {
      if (res?.produtos?.length) setProdutos(res.produtos);
    });
  }, []);

  const patch = (updates: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
    const clearedErrors = { ...errors };
    Object.keys(updates).forEach(k => delete clearedErrors[k]);
    setErrors(clearedErrors);
  };

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 0) {
      if (!data.nome_cliente.trim()) errs.nome_cliente = 'Nome do cliente é obrigatório';
      if (!data.perfil_decisor) errs.perfil_decisor = 'Selecione o perfil do decisor';
      if (!data.estado_emocional) errs.estado_emocional = 'Selecione o estado emocional';
    }
    if (s === 1) {
      if (!data.nicho.trim()) errs.nicho = 'Nicho é obrigatório';
      if (!data.nome_produto.trim()) errs.nome_produto = 'Nome do produto é obrigatório';
      if (!data.produto.trim()) errs.produto = 'Descreva o produto ou serviço';
      if (!data.contexto) errs.contexto = 'Selecione o contexto da venda';
    }
    if (s === 2) {
      if (!data.preco_ancora) errs.preco_ancora = 'Preço âncora é obrigatório';
      if (!data.preco_meta) errs.preco_meta = 'Preço meta é obrigatório';
      if (!data.preco_minimo) errs.preco_minimo = 'Preço mínimo é obrigatório';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setDirection(1);
    setStep(s => Math.min(s + 1, 2));
  };

  const goBack = () => {
    setDirection(-1);
    setStep(s => Math.max(s - 1, 0));
  };

  const handleSelect = (tipo: 'roteiro' | 'proposta') => {
    if (!validateStep(2)) return;
    onSubmit(data, tipo);
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <div className="w-full max-w-[600px] mx-auto">
      <ProgressBar currentStep={step} score={score} />

      <Card className="shadow-sm">
        <CardContent className="p-6">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {step === 0 && <StepCliente data={data} onChange={patch} errors={errors} personas={personas} />}
              {step === 1 && <StepProduto data={data} onChange={patch} errors={errors} produtos={produtos} />}
              {step === 2 && (
                <StepVenda
                  data={data}
                  onChange={patch}
                  errors={errors}
                  isLoading={isLoading}
                  loadingTipo={loadingTipo}
                  onSelect={handleSelect}
                  score={score}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={step === 0 || isLoading}
              className={step === 0 ? 'invisible' : ''}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            {step < 2 && (
              <Button onClick={goNext}>
                Próxima etapa <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
