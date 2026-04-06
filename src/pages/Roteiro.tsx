import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Copy, Loader2,
  ChevronDown, ChevronUp, Eye, Pencil, RotateCcw, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { svpApi } from '@/lib/api-svp';
import { supabase } from '@/integrations/supabase/client';
import PecasPanel from '@/components/roteiro/PecasPanel';
import type {
  SessaoVenda, BlocoRoteiro, SecaoRoteiro, SecaoEstado, RoteiroJSON, RoteiroBloco,
} from '@/types/crm';



const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function callFn<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Normalize old roteiro format to BlocoRoteiro[] ──
function normalizeBlocos(roteiro: RoteiroJSON): BlocoRoteiro[] {
  const rr = roteiro.roteiro_reuniao;
  if (Array.isArray(rr)) {
    // Could be new BlocoRoteiro[] with secoes, or old RoteiroBloco[] without
    if (rr.length > 0 && 'secoes' in rr[0]) {
      return rr as unknown as BlocoRoteiro[];
    }
    // Old format: RoteiroBloco[] — convert each to BlocoRoteiro with single section
    return (rr as unknown as RoteiroBloco[]).map((b, i) => ({
      numero: b.numero ?? i + 1,
      bloco: b.bloco,
      titulo: b.titulo,
      tempo: b.tempo,
      secoes: [{
        id: `bloco-${b.numero ?? i + 1}-script`,
        tipo: 'script' as const,
        label: b.titulo,
        conteudo: b.script || '',
        raciocinio: b.nota_tecnica || undefined,
      }],
    }));
  }
  // Legacy object format
  const legacy = rr as Record<string, { duracao_min?: number; objetivo?: string; script?: string }>;
  const LEGACY_NAMES: Record<string, string> = {
    abertura: 'Abertura',
    descoberta: 'Diagnóstico',
    apresentacao_solucao: 'Solução',
    tratamento_objecoes: 'Objeções',
    fechamento: 'Fechamento',
  };
  return Object.entries(legacy).map(([key, val], i) => ({
    numero: i + 1,
    bloco: key,
    titulo: LEGACY_NAMES[key] || key,
    tempo: val.duracao_min ? `${val.duracao_min} min` : '—',
    secoes: [{
      id: `${key}-script`,
      tipo: 'script' as const,
      label: LEGACY_NAMES[key] || key,
      conteudo: val.script || val.objetivo || '',
    }],
  }));
}

function getScoreColor(score: number) {
  if (score < 60) return 'text-red-500';
  if (score < 80) return 'text-amber-500';
  return 'text-green-500';
}
function getScoreBg(score: number) {
  if (score < 60) return 'bg-red-500/10 border-red-500/30';
  if (score < 80) return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-green-500/10 border-green-500/30';
}

// ── Section Card ──────────────────────────────────
function SecaoCard({
  secao,
  estado,
  isFocused,
  onFocus,
  onAprovar,
  onSalvarEdicao,
  onRegenerar,
  isObjecao,
}: {
  secao: SecaoRoteiro;
  estado?: SecaoEstado;
  isFocused: boolean;
  onFocus: () => void;
  onAprovar: () => void;
  onSalvarEdicao: (texto: string) => void;
  onRegenerar: (feedback?: string) => void;
  isObjecao?: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [textoEdit, setTextoEdit] = useState('');
  const [showRaciocinio, setShowRaciocinio] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [regenerando, setRegenerando] = useState(false);
  const [collapsed, setCollapsed] = useState(isObjecao ?? false);

  const aprovada = estado?.aprovada ?? false;
  const editada = estado?.editada ?? false;
  const conteudoExibido = editada && estado?.texto_editado ? estado.texto_editado : secao.conteudo;

  const tipoBadge = {
    script: { label: 'Script', className: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
    instrucao: { label: 'Instrução', className: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
    objecao: { label: 'Objeção', className: 'bg-red-500/10 text-red-500 border-red-500/30' },
  }[secao.tipo];

  const borderColor = aprovada ? 'border-green-500/50' : editada ? 'border-blue-500/50' : 'border-border';
  const bgColor = aprovada ? 'bg-green-500/5' : editada ? 'bg-blue-500/5' : 'bg-card';

  const handleStartEdit = () => {
    setTextoEdit(conteudoExibido);
    setEditando(true);
  };

  const handleSaveEdit = () => {
    onSalvarEdicao(textoEdit);
    setEditando(false);
  };

  const handleRegenerar = async () => {
    setRegenerando(true);
    await onRegenerar(feedback || undefined);
    setRegenerando(false);
    setShowFeedback(false);
    setFeedback('');
  };

  const cardContent = (
    <div
      className={`rounded-xl border-2 ${borderColor} ${bgColor} transition-all duration-200 ${isFocused ? 'ring-2 ring-primary/30' : ''}`}
      onClick={onFocus}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          {isObjecao && (
            <button onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }} className="text-muted-foreground hover:text-foreground">
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          )}
          <span className="font-medium text-sm text-foreground">{secao.label}</span>
          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${tipoBadge.className}`}>
            {tipoBadge.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {aprovada && <Badge variant="outline" className="text-green-500 border-green-500/30 text-[10px]">✓ Aprovado</Badge>}
          {editada && !aprovada && <Badge variant="outline" className="text-blue-500 border-blue-500/30 text-[10px]">✏️ Editado</Badge>}
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="p-4 space-y-3">
          {editando ? (
            <div className="space-y-2">
              <Textarea
                value={textoEdit}
                onChange={e => setTextoEdit(e.target.value)}
                rows={8}
                className="text-sm font-mono"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit}>Salvar edição</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditando(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {conteudoExibido}
            </div>
          )}

          {/* Raciocínio */}
          {secao.raciocinio && !editando && (
            <div>
              <button
                onClick={(e) => { e.stopPropagation(); setShowRaciocinio(!showRaciocinio); }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <Eye className="h-3 w-3" />
                {showRaciocinio ? 'Ocultar raciocínio ↑' : 'Ver raciocínio ↓'}
              </button>
              <AnimatePresence>
                {showRaciocinio && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground whitespace-pre-wrap">
                      {secao.raciocinio}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Feedback for regeneration */}
          {showFeedback && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border">
              <Input
                placeholder="Feedback opcional para regeneração..."
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleRegenerar} disabled={regenerando}>
                  {regenerando ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Regenerando...</> : 'Regenerar'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowFeedback(false); setFeedback(''); }}>Cancelar</Button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!editando && !showFeedback && (
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" variant={aprovada ? 'outline' : 'default'} onClick={(e) => { e.stopPropagation(); onAprovar(); }} className="text-xs h-7">
                <Check className="mr-1 h-3 w-3" /> {aprovada ? 'Aprovado' : 'Aprovar'}
              </Button>
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleStartEdit(); }} className="text-xs h-7">
                <Pencil className="mr-1 h-3 w-3" /> Editar
              </Button>
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setShowFeedback(true); }} className="text-xs h-7">
                <RotateCcw className="mr-1 h-3 w-3" /> Regenerar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return cardContent;
}

// ── Main Page ─────────────────────────────────────
export default function RoteiroPage() {
  const { sessao_id } = useParams<{ sessao_id: string }>();
  const navigate = useNavigate();

  const [sessao, setSessao] = useState<SessaoVenda | null>(null);
  const [blocos, setBlocos] = useState<BlocoRoteiro[]>([]);
  const [secoesEstado, setSecoesEstado] = useState<Record<string, SecaoEstado>>({});
  const [faseAtiva, setFaseAtiva] = useState(0);
  const [focusedSecao, setFocusedSecao] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gerandoProposta, setGerandoProposta] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load session data
  useEffect(() => {
    if (!sessao_id) return;
    setLoading(true);
    svpApi.buscarCliente(sessao_id) // try via crm-listar
      .then(() => {
        // Try fetching session directly
        return callFn<{ sessoes?: SessaoVenda[] }>(`crm-listar?sessao_id=${sessao_id}`);
      })
      .catch(() => callFn<{ sessoes?: SessaoVenda[] }>(`crm-listar?sessao_id=${sessao_id}`))
      .then(res => {
        const s = res.sessoes?.[0];
        if (!s) {
          setError('Sessão não encontrada.');
          setLoading(false);
          return;
        }
        if (!s.roteiro_json) {
          // Still generating — redirect to loading page
          navigate(`/loading/${sessao_id}`, { replace: true });
          return;
        }
        setSessao(s);
        const normalized = normalizeBlocos(s.roteiro_json);
        setBlocos(normalized);
        setSecoesEstado((s as any).secoes_estado ?? {});
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Erro ao carregar sessão.');
        setLoading(false);
      });
  }, [sessao_id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFaseAtiva(f => Math.min(f + 1, blocos.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFaseAtiva(f => Math.max(f - 1, 0));
      } else if (e.key === 'a' || e.key === 'A') {
        if (focusedSecao) handleAprovar(focusedSecao);
      } else if (e.key === 'e' || e.key === 'E') {
        // E shortcut handled inside SecaoCard
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [blocos.length, focusedSecao]);

  const roteiro = sessao?.roteiro_json;
  const score = roteiro?.score ?? 0;
  const scoreBreakdown = roteiro?.score_breakdown;
  const nomeCliente = (sessao?.dados_formulario as any)?.nome_cliente || 'Lead';
  const nicho = sessao?.nicho || '';
  const dataSessao = sessao?.criado_em ? new Date(sessao.criado_em).toLocaleDateString('pt-BR') : '';

  // Phase status
  const getFaseStatus = useCallback((blocoIdx: number): 'pendente' | 'aprovado' | 'editando' => {
    const bloco = blocos[blocoIdx];
    if (!bloco) return 'pendente';
    const allApproved = bloco.secoes.every(s => secoesEstado[s.id]?.aprovada);
    const anyEdited = bloco.secoes.some(s => secoesEstado[s.id]?.editada && !secoesEstado[s.id]?.aprovada);
    if (allApproved) return 'aprovado';
    if (anyEdited) return 'editando';
    return 'pendente';
  }, [blocos, secoesEstado]);

  const allApproved = useMemo(() => {
    return blocos.every((b, i) => getFaseStatus(i) === 'aprovado');
  }, [blocos, getFaseStatus]);

  const approvedPhases = useMemo(() => {
    return blocos.filter((_, i) => getFaseStatus(i) === 'aprovado').length;
  }, [blocos, getFaseStatus]);

  // Actions
  const handleAprovar = useCallback(async (secaoId: string) => {
    const current = secoesEstado[secaoId];
    const newAprovada = !current?.aprovada;
    setSecoesEstado(prev => ({
      ...prev,
      [secaoId]: { ...prev[secaoId], aprovada: newAprovada, editada: prev[secaoId]?.editada ?? false, atualizado_em: new Date().toISOString() },
    }));
    try {
      await callFn('roteiro-aprovar-secao', { sessao_id, secao_id: secaoId, aprovada: newAprovada });
    } catch {
      // Revert on error
      setSecoesEstado(prev => ({
        ...prev,
        [secaoId]: { ...prev[secaoId], aprovada: !newAprovada },
      }));
      toast.error('Erro ao aprovar seção');
    }
  }, [secoesEstado, sessao_id]);

  const handleSalvarEdicao = useCallback(async (secaoId: string, texto: string) => {
    setSecoesEstado(prev => ({
      ...prev,
      [secaoId]: { ...prev[secaoId], editada: true, texto_editado: texto, aprovada: prev[secaoId]?.aprovada ?? false, atualizado_em: new Date().toISOString() },
    }));
    try {
      await callFn('roteiro-editar-secao', { sessao_id, secao_id: secaoId, texto_editado: texto });
      toast.success('Edição salva');
    } catch {
      toast.error('Erro ao salvar edição');
    }
  }, [sessao_id]);

  const handleRegenerar = useCallback(async (secaoId: string, feedback?: string) => {
    try {
      const res = await callFn<{ conteudo: string }>('roteiro-regenerar-secao', { sessao_id, secao_id: secaoId, feedback });
      // Update the section content in blocos
      setBlocos(prev => prev.map(b => ({
        ...b,
        secoes: b.secoes.map(s => s.id === secaoId ? { ...s, conteudo: res.conteudo, conteudo_anterior: s.conteudo } : s),
      })));
      setSecoesEstado(prev => ({
        ...prev,
        [secaoId]: { aprovada: false, editada: false, atualizado_em: new Date().toISOString() },
      }));
      toast.success('Seção regenerada');
    } catch {
      toast.error('Erro ao regenerar seção');
    }
  }, [sessao_id]);

  const handleCopiarRoteiro = useCallback(() => {
    const text = blocos.map(b => {
      const header = `━━━ FASE ${b.numero}: ${b.titulo} (${b.tempo}) ━━━`;
      const secoes = b.secoes.map(s => {
        const estado = secoesEstado[s.id];
        const conteudo = estado?.editada && estado?.texto_editado ? estado.texto_editado : s.conteudo;
        return `[${s.tipo.toUpperCase()}] ${s.label}\n${conteudo}`;
      }).join('\n\n');
      return `${header}\n\n${secoes}`;
    }).join('\n\n\n');
    navigator.clipboard.writeText(text);
    toast.success('Roteiro copiado!');
  }, [blocos, secoesEstado]);

  const handleGerarProposta = useCallback(async () => {
    if (!sessao_id) return;
    setGerandoProposta(true);
    try {
      await svpApi.aprovarRoteiro({ sessao_id, aprovado: true });
      navigate(`/gerar?sessao_id=${sessao_id}&proposta=true`);
    } catch {
      toast.error('Erro ao aprovar roteiro');
      setGerandoProposta(false);
    }
  }, [sessao_id, navigate]);

  // ── Render ──────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando roteiro...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        </div>
      </div>
    );
  }

  const blocoAtivo = blocos[faseAtiva];

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" ref={containerRef}>
      {/* ── HEADER ── */}
      <header className="h-16 border-b border-border bg-card flex items-center px-4 gap-4 shrink-0 z-20">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        <div className="h-5 w-px bg-border" />

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-semibold text-sm text-foreground truncate">{nomeCliente}</span>
          {nicho && <span className="text-xs text-muted-foreground hidden sm:inline">• {nicho}</span>}
          {dataSessao && <span className="text-xs text-muted-foreground hidden sm:inline">• {dataSessao}</span>}
        </div>

        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-bold ${getScoreBg(score)} ${getScoreColor(score)}`}>
          {score}/100
        </div>

        <Button variant="outline" size="sm" onClick={handleCopiarRoteiro} className="shrink-0">
          <Copy className="h-3.5 w-3.5 mr-1.5" /> <span className="hidden sm:inline">Copiar roteiro</span>
        </Button>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── SIDEBAR ── */}
        <aside className="w-[220px] border-r border-border bg-card overflow-y-auto shrink-0 hidden md:flex flex-col">
          <div className="p-3 space-y-1 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">Fases</p>
            {blocos.map((bloco, i) => {
              const status = getFaseStatus(i);
              const isActive = i === faseAtiva;
              return (
                <button
                  key={bloco.bloco}
                  onClick={() => setFaseAtiva(i)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono">{bloco.numero}</span>
                      <span className="truncate">{bloco.titulo}</span>
                    </div>
                    <span className="text-xs">
                      {status === 'aprovado' ? '✓' : status === 'editando' ? '✏️' : '○'}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground ml-5">{bloco.tempo}</span>
                </button>
              );
            })}
          </div>

          {/* Insights */}
          <div className="p-3 border-t border-border space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">Insights</p>
            {roteiro?.maior_medo && (
              <div className="px-2 py-1.5 rounded-md bg-red-500/5 text-xs">
                <span className="text-muted-foreground">😰 Maior medo</span>
                <p className="text-foreground mt-0.5">{roteiro.maior_medo}</p>
              </div>
            )}
            {roteiro?.decisao_style && (
              <div className="px-2 py-1.5 rounded-md bg-blue-500/5 text-xs">
                <span className="text-muted-foreground">🧠 Decisão</span>
                <p className="text-foreground mt-0.5">{roteiro.decisao_style}</p>
              </div>
            )}
            {roteiro?.tom_ideal && (
              <div className="px-2 py-1.5 rounded-md bg-green-500/5 text-xs">
                <span className="text-muted-foreground">🎯 Tom ideal</span>
                <p className="text-foreground mt-0.5">{roteiro.tom_ideal}</p>
              </div>
            )}
          </div>

          {/* Score breakdown */}
          {scoreBreakdown && (
            <div className="p-3 border-t border-border space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">Score</p>
              {Object.entries(scoreBreakdown).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between px-2 text-xs">
                  <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-foreground">{val as number}</span>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* ── CONTENT ── */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {blocoAtivo && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {blocoAtivo.numero}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{blocoAtivo.titulo}</h2>
                  <p className="text-xs text-muted-foreground">{blocoAtivo.tempo}</p>
                </div>
              </div>

              {/* Mobile phase selector */}
              <div className="flex gap-1.5 overflow-x-auto pb-3 md:hidden mb-4">
                {blocos.map((b, i) => {
                  const status = getFaseStatus(i);
                  return (
                    <button
                      key={b.bloco}
                      onClick={() => setFaseAtiva(i)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        i === faseAtiva
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/40'
                      }`}
                    >
                      {status === 'aprovado' ? '✓' : b.numero} {b.titulo}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={faseAtiva}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {blocoAtivo.secoes.map(secao => (
                    <SecaoCard
                      key={secao.id}
                      secao={secao}
                      estado={secoesEstado[secao.id]}
                      isFocused={focusedSecao === secao.id}
                      onFocus={() => setFocusedSecao(secao.id)}
                      onAprovar={() => handleAprovar(secao.id)}
                      onSalvarEdicao={(texto) => handleSalvarEdicao(secao.id, texto)}
                      onRegenerar={(fb) => handleRegenerar(secao.id, fb)}
                      isObjecao={secao.tipo === 'objecao'}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      {/* ── FOOTER ── */}
      <footer className="h-14 border-t border-border bg-card flex items-center px-4 gap-4 shrink-0 z-20">
        <div className="flex items-center gap-3 flex-1">
          <Progress value={(approvedPhases / Math.max(blocos.length, 1)) * 100} className="h-2 flex-1 max-w-[200px]" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">{approvedPhases}/{blocos.length} fases</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={faseAtiva === 0}
            onClick={() => setFaseAtiva(f => f - 1)}
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Anterior
          </Button>

          {faseAtiva < blocos.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setFaseAtiva(f => f + 1)}
            >
              Próxima <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ) : allApproved ? (
            <Button
              size="sm"
              onClick={handleGerarProposta}
              disabled={gerandoProposta}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {gerandoProposta ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Gerando...</>
              ) : (
                <><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Gerar proposta completa</>
              )}
            </Button>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
