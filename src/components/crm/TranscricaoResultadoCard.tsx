import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronRight,
  Loader2, Zap, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { svpApi } from '@/lib/api-svp';

/* ── Types ───────────────────────────────────────── */

interface PalavrasExatas {
  problema?: string[];
  desejo?: string[];
  criterio_compra?: string[];
  referencia_citada?: string | null;
}

interface ObjecaoItem {
  objecao: string;
  foi_tratada: boolean;
  camadas_tratadas?: string[];
  observacao?: string;
}

interface BlocoStatus {
  status: 'executado' | 'parcial' | 'ausente';
  o_que_faltou?: string | null;
  impacto?: string | null;
}

interface BlocosSVP {
  abertura?: BlocoStatus;
  diagnostico?: BlocoStatus;
  solucao?: BlocoStatus;
  oferta?: BlocoStatus;
  objecoes?: BlocoStatus;
  fechamento?: BlocoStatus;
}

interface ProximaAcao {
  recomendacao_principal?: string;
  para_roteiro?: string;
  para_proposta?: string;
  para_whatsapp?: string;
}

export interface AnaliseTranscricao {
  resumo?: string;
  palavras_exatas_cliente?: PalavrasExatas;
  objecoes_identificadas?: ObjecaoItem[];
  outros_decisores?: { nome_cargo: string; nivel_influencia: string; objecao_provavel?: string | null }[];
  nivel_interesse?: 'frio' | 'morno' | 'quente';
  justificativa_interesse?: string;
  blocos_svp?: BlocosSVP;
  proxima_acao?: ProximaAcao;
  contexto_enriquecido?: string;
}

interface Props {
  analise: AnaliseTranscricao;
  clienteId?: string;
  nomeCliente?: string;
  onNovaTranscricao?: () => void;
  onFechar?: () => void;
}

/* ── Helpers ─────────────────────────────────────── */

const NIVEL_BADGE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  frio:   { label: 'Frio 🔵',   bg: '#1d4ed822', color: '#3b82f6', border: '#3b82f644' },
  morno:  { label: 'Morno 🟡',  bg: '#92400e22', color: '#d97706', border: '#d9770644' },
  quente: { label: 'Quente 🔥', bg: '#16a34a22', color: '#22c55e', border: '#22c55e44' },
};

const BLOCO_LABELS: Record<string, string> = {
  abertura: 'Abertura', diagnostico: 'Diagnóstico', solucao: 'Solução',
  oferta: 'Oferta', objecoes: 'Objeções', fechamento: 'Fechamento',
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'executado') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
  if (status === 'parcial')   return <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
  return <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />;
}

/* ── Component ───────────────────────────────────── */

export default function TranscricaoResultadoCard({
  analise, clienteId, nomeCliente, onNovaTranscricao, onFechar,
}: Props) {
  const navigate = useNavigate();

  // UI state
  const [svpExpanded, setSvpExpanded]           = useState(false);
  const [objecoesExpanded, setObjecoesExpanded] = useState(false);
  const [gerarAberto, setGerarAberto]           = useState(false);

  // Mini-form state
  const [nicho, setNicho]     = useState('');
  const [produto, setProduto] = useState('');
  const [preco, setPreco]     = useState('');
  const [gerando, setGerando] = useState(false);

  /* ── Generate roteiro directly ── */
  const handleGerarRoteiro = async () => {
    if (!nicho.trim() || !produto.trim()) {
      toast.error('Preencha o nicho e o produto.');
      return;
    }
    setGerando(true);
    try {
      const { data } = await svpApi.gerarRoteiroAsync({
        nicho: nicho.trim(),
        produto: produto.trim(),
        preco: preco ? parseFloat(preco) : undefined,
        nome_cliente: nomeCliente,
        cliente_id: clienteId,
        dados_extras: {
          qualificacao_previa: analise.contexto_enriquecido ?? '',
          palavras_exatas: (analise.palavras_exatas_cliente?.problema ?? []).join(', '),
          origem: 'transcricao',
        },
      });

      if (!data?.sessao_id) throw new Error('Sessão não retornada pela API.');

      toast.success('Roteiro gerado com sucesso!');
      onFechar?.();
      navigate(`/roteiro/${data.sessao_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar roteiro.');
    } finally {
      setGerando(false);
    }
  };

  const nivel = analise.nivel_interesse ?? 'frio';
  const nivelBadge = NIVEL_BADGE[nivel] ?? NIVEL_BADGE.frio;
  const palavras = analise.palavras_exatas_cliente;

  const todasPalavras = [
    ...(palavras?.problema ?? []),
    ...(palavras?.desejo ?? []),
    ...(palavras?.criterio_compra ?? []),
  ];

  const blocosSVP = analise.blocos_svp ?? {};
  const blocoKeys = ['abertura', 'diagnostico', 'solucao', 'oferta', 'objecoes', 'fechamento'] as const;

  const countStatus = (s: string) =>
    blocoKeys.filter(k => (blocosSVP as Record<string, BlocoStatus>)[k]?.status === s).length;
  const executados = countStatus('executado');
  const parciais   = countStatus('parcial');
  const ausentes   = countStatus('ausente');

  return (
    <div className="space-y-4">

      {/* ── Nivel de interesse ── */}
      <div className="flex items-center justify-between gap-3">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
          style={{ background: nivelBadge.bg, color: nivelBadge.color, border: `1px solid ${nivelBadge.border}` }}
        >
          Interesse: {nivelBadge.label}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Análise SVP
        </span>
      </div>

      {/* ── Resumo ── */}
      {analise.resumo && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Resumo</p>
          <p className="text-sm text-foreground leading-relaxed">{analise.resumo}</p>
        </div>
      )}

      {/* ── Justificativa ── */}
      {analise.justificativa_interesse && (
        <p className="text-[12px] text-muted-foreground italic px-1">{analise.justificativa_interesse}</p>
      )}

      {/* ── Palavras exatas ── */}
      {todasPalavras.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Palavras exatas do cliente
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(palavras?.problema ?? []).map((p, i) => (
              <span key={`prob-${i}`} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800">
                "{p}"
              </span>
            ))}
            {(palavras?.desejo ?? []).map((d, i) => (
              <span key={`des-${i}`} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                "{d}"
              </span>
            ))}
            {(palavras?.criterio_compra ?? []).map((c, i) => (
              <span key={`crit-${i}`} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                "{c}"
              </span>
            ))}
          </div>
          {palavras?.referencia_citada && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              📌 Referência: <span className="font-semibold text-foreground">{palavras.referencia_citada}</span>
            </p>
          )}
        </div>
      )}

      {/* ── Auditoria SVP ── */}
      <div className="rounded-lg border border-border overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
          onClick={() => setSvpExpanded(v => !v)}
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Auditoria SVP
            </span>
            <span className="flex items-center gap-1 text-[10px]">
              <span className="text-emerald-500 font-bold">{executados}✓</span>
              {parciais > 0 && <span className="text-amber-500 font-bold ml-1">{parciais}~</span>}
              {ausentes > 0 && <span className="text-red-400 font-bold ml-1">{ausentes}✗</span>}
            </span>
          </div>
          {svpExpanded
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
        {svpExpanded && (
          <div className="px-4 py-3 space-y-2.5 bg-background">
            {blocoKeys.map(key => {
              const bloco = (blocosSVP as Record<string, BlocoStatus>)[key];
              if (!bloco) return null;
              return (
                <div key={key}>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={bloco.status} />
                    <span className="text-[12px] font-medium text-foreground">{BLOCO_LABELS[key]}</span>
                    <span className="text-[10px] text-muted-foreground capitalize ml-auto">{bloco.status}</span>
                  </div>
                  {bloco.status !== 'executado' && bloco.o_que_faltou && (
                    <p className="mt-0.5 ml-5 text-[11px] text-muted-foreground">{bloco.o_que_faltou}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Objeções ── */}
      {(analise.objecoes_identificadas ?? []).length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
            onClick={() => setObjecoesExpanded(v => !v)}
          >
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Objeções ({analise.objecoes_identificadas!.length})
            </span>
            {objecoesExpanded
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
          {objecoesExpanded && (
            <div className="px-4 py-3 space-y-3 bg-background">
              {analise.objecoes_identificadas!.map((ob, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="flex items-start gap-2">
                    {ob.foi_tratada
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      : <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />}
                    <p className="text-[12px] font-medium text-foreground">"{ob.objecao}"</p>
                  </div>
                  {ob.observacao && (
                    <p className="ml-5 text-[11px] text-muted-foreground">{ob.observacao}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Próxima ação ── */}
      {analise.proxima_acao?.recomendacao_principal && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary mb-1.5">
            Próxima ação recomendada
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            {analise.proxima_acao.recomendacao_principal}
          </p>
          {analise.proxima_acao.para_whatsapp && (
            <div className="mt-2 pt-2 border-t border-primary/15">
              <p className="text-[10px] text-muted-foreground mb-0.5">Abertura de follow-up:</p>
              <p className="text-[12px] text-foreground italic">"{analise.proxima_acao.para_whatsapp}"</p>
            </div>
          )}
        </div>
      )}

      {/* ── Divisor ── */}
      <div className="border-t border-border" />

      {/* ── GERAR ROTEIRO — CTA principal ── */}
      {!gerarAberto ? (
        <div className="space-y-2">
          <Button
            onClick={() => setGerarAberto(true)}
            className="w-full gap-2 font-semibold"
            size="lg"
          >
            <Zap className="h-4 w-4" />
            Gerar Roteiro com esta análise
          </Button>
          <div className="flex gap-2">
            {onNovaTranscricao && (
              <Button variant="ghost" className="flex-1 text-sm text-muted-foreground" onClick={onNovaTranscricao}>
                + Nova análise
              </Button>
            )}
            <Button variant="ghost" className="flex-1 text-sm text-muted-foreground" onClick={onFechar}>
              Fechar
            </Button>
          </div>
        </div>
      ) : (
        /* ── Mini-form de confirmação ── */
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Confirmar para gerar o roteiro</p>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">
            O contexto completo da análise será injetado automaticamente. Confirme o nicho e produto.
          </p>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nicho *</Label>
              <Input
                placeholder="Ex: Desenvolvimento Web, Microfiltragem Industrial..."
                value={nicho}
                onChange={e => setNicho(e.target.value)}
                disabled={gerando}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Produto / Serviço *</Label>
              <Input
                placeholder="Ex: Site institucional bilíngue, Mentoria comercial..."
                value={produto}
                onChange={e => setProduto(e.target.value)}
                disabled={gerando}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Preço âncora (opcional)</Label>
              <Input
                type="number"
                placeholder="Ex: 8500"
                value={preco}
                onChange={e => setPreco(e.target.value)}
                disabled={gerando}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleGerarRoteiro}
              disabled={gerando || !nicho.trim() || !produto.trim()}
              className="flex-1 gap-2 font-semibold"
            >
              {gerando
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando roteiro...</>
                : <><Zap className="h-4 w-4" /> Gerar Roteiro →</>}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setGerarAberto(false)}
              disabled={gerando}
              className="shrink-0"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
