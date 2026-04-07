import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { svpApi } from '@/lib/api-svp';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Cliente, ClienteStatus, ClienteTemperatura, UltimaSessao } from '@/types/crm';
import RegistrarResultadoModal from '@/components/crm/RegistrarResultadoModal';
import ClienteQuickViewModal from '@/components/crm/ClienteQuickViewModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Search, Plus, Users, Clock, Loader2, AlertCircle, LayoutGrid, List,
  ChevronRight, GripVertical, Check,
} from 'lucide-react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';

/* ── Constantes ────────────────────────────────── */

const TEMP_COLORS: Record<ClienteTemperatura, { border: string; bg: string; bgDark: string; text: string; textDark: string; label: string }> = {
  ativo:    { border: '#E03E3E', bg: '#E03E3E18', bgDark: '#E03E3E25', text: '#C53030', textDark: '#F87171', label: 'Quente' },
  morno:    { border: '#E8A020', bg: '#E8A02018', bgDark: '#E8A02025', text: '#B7791F', textDark: '#FBBF24', label: 'Morno' },
  frio:     { border: '#3B6FE8', bg: '#3B6FE818', bgDark: '#3B6FE825', text: '#2B5DC2', textDark: '#60A5FA', label: 'Frio' },
  em_risco: { border: '#E03E3E', bg: '#E03E3E18', bgDark: '#E03E3E25', text: '#C53030', textDark: '#F87171', label: 'Em risco' },
};

const TEMP_DEFAULT = { border: '#7A7F92', bg: '#7A7F9215', bgDark: '#7A7F9220', text: '#7A7F92', textDark: '#9CA3AF', label: '—' };

const TEMP_BADGE: Record<ClienteTemperatura, { label: string }> = {
  frio:     { label: 'Frio' },
  morno:    { label: 'Morno' },
  ativo:    { label: 'Quente' },
  em_risco: { label: 'Em risco' },
};

const STATUS_LABEL: Record<ClienteStatus, string> = {
  novo: 'Novo',
  em_contato: 'Em contato',
  proposta_enviada: 'Proposta enviada',
  negociacao: 'Negociação',
  ganho: 'Ganho',
  perdido: 'Perdido',
};

const STATUS_CLS: Record<ClienteStatus, string> = {
  novo: 'border-muted-foreground/40 text-muted-foreground',
  em_contato: 'border-blue-400 text-blue-700 dark:text-blue-300',
  proposta_enviada: 'border-blue-500 text-blue-700 dark:text-blue-300',
  negociacao: 'border-orange-400 text-orange-700 dark:text-orange-300',
  ganho: 'border-green-400 text-green-700 dark:text-green-300',
  perdido: 'border-red-400 text-red-700 dark:text-red-300',
};

const COMO_OPTIONS = [
  { value: 'indicacao', label: 'Indicação' },
  { value: 'evento', label: 'Evento' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'abordagem_fria', label: 'Abordagem fria' },
  { value: 'outros', label: 'Outros' },
];

/* ── Pipeline columns ─────────────────────────── */

type PipelineColuna = 'novo_lead' | 'roteiro_pronto' | 'proposta_enviada' | 'follow_up' | 'fechado';

interface ColunaConfig {
  id: PipelineColuna;
  titulo: string;
  dotCls: string;
  borderColor: string;
}

const COLUNAS: ColunaConfig[] = [
  { id: 'novo_lead',        titulo: 'Novo Lead',        dotCls: 'bg-muted-foreground', borderColor: '#7A7F92' },
  { id: 'roteiro_pronto',   titulo: 'Roteiro Pronto',   dotCls: 'bg-blue-600',         borderColor: '#1E3FA8' },
  { id: 'proposta_enviada', titulo: 'Proposta Enviada', dotCls: 'bg-blue-500',         borderColor: '#254DC7' },
  { id: 'follow_up',        titulo: 'Follow-up',        dotCls: 'bg-amber-500',        borderColor: '#E8A020' },
  { id: 'fechado',          titulo: 'Fechado',          dotCls: 'bg-emerald-500',      borderColor: '#1D9E6F' },
];

function mapStatusToColuna(status: ClienteStatus | string): PipelineColuna {
  switch (status) {
    case 'novo': return 'novo_lead';
    case 'em_contato':
    case 'reuniao_agendada': return 'roteiro_pronto';
    case 'proposta_enviada': return 'proposta_enviada';
    case 'negociacao':
    case 'em_negociacao': return 'follow_up';
    case 'fechado':
    case 'ganho':
    case 'perdido': return 'fechado';
    default: return 'novo_lead';
  }
}

function mapColunaToStatus(coluna: PipelineColuna): ClienteStatus {
  switch (coluna) {
    case 'novo_lead': return 'novo';
    case 'roteiro_pronto': return 'em_contato';
    case 'proposta_enviada': return 'proposta_enviada';
    case 'follow_up': return 'negociacao';
    case 'fechado': return 'ganho';
  }
}

function mapColunaToTemp(coluna: PipelineColuna): ClienteTemperatura {
  switch (coluna) {
    case 'novo_lead':        return 'frio';
    case 'roteiro_pronto':   return 'morno';
    case 'proposta_enviada': return 'morno';
    case 'follow_up':        return 'ativo';
    case 'fechado':          return 'ativo';
  }
}

/* ── Peças config ──────────────────────────────── */

type PecaTipo = 'proposta' | 'email' | 'whatsapp' | 'objecoes';

const PECAS_CONFIG: { tipo: PecaTipo; label: string; emoji: string; temKey: keyof UltimaSessao }[] = [
  { tipo: 'proposta', label: 'Proposta', emoji: '📄', temKey: 'tem_proposta' },
  { tipo: 'email', label: 'E-mail', emoji: '📧', temKey: 'tem_email' },
  { tipo: 'whatsapp', label: 'WhatsApp', emoji: '💬', temKey: 'tem_whatsapp' },
  { tipo: 'objecoes', label: 'Objeções', emoji: '🛡️', temKey: 'tem_objecoes' },
];

const PIECE_LABELS = ['Roteiro', 'Proposta', 'E-mail', 'WhatsApp', 'Objeções'];

/* ── Página CRM ────────────────────────────────── */

export default function CRM() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<ClienteStatus | 'todos'>('todos');
  const [filtroTemp, setFiltroTemp] = useState<ClienteTemperatura | 'todos'>('todos');
  const [modalAberto, setModalAberto] = useState(false);
  const [viewMode, setViewMode] = useState<'pipeline' | 'lista'>('pipeline');
  const [fechadoColapsado, setFechadoColapsado] = useState(false);
  const [resultadoModal, setResultadoModal] = useState<{
    sessaoId: string;
    nomeCliente: string;
    produto?: string;
  } | null>(null);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);

  const carregarClientes = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await svpApi.listarClientes(1, 200);
      setClientes(res.clientes ?? []);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar clientes.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregarClientes(); }, []);

  const filtroAtivo = busca !== '' || filtroStatus !== 'todos' || filtroTemp !== 'todos';

  const clientesFiltrados = useMemo(() => clientes.filter(c => {
    if (busca) {
      const q = busca.toLowerCase();
      if (!c.nome.toLowerCase().includes(q) && !(c.empresa || '').toLowerCase().includes(q)) return false;
    }
    if (filtroStatus !== 'todos' && c.status !== filtroStatus) return false;
    if (filtroTemp !== 'todos' && c.temperatura !== filtroTemp) return false;
    return true;
  }), [clientes, busca, filtroStatus, filtroTemp]);

  const limparFiltros = () => { setBusca(''); setFiltroStatus('todos'); setFiltroTemp('todos'); };

  // Group clients by pipeline column
  const colunaClientes = useMemo(() => {
    const map: Record<PipelineColuna, Cliente[]> = {
      novo_lead: [], roteiro_pronto: [], proposta_enviada: [], follow_up: [], fechado: [],
    };
    clientesFiltrados.forEach(c => {
      const col = mapStatusToColuna(c.status);
      map[col].push(c);
    });
    // Sort all columns by most recent first
    const sortRecent = (a: Cliente, b: Cliente) =>
      new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime();
    (Object.keys(map) as PipelineColuna[]).forEach(col => map[col].sort(sortRecent));
    return map;
  }, [clientesFiltrados]);

  const [savingDragId, setSavingDragId] = useState<string | null>(null);

  // Drag and drop handler
  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const novaColuna = destination.droppableId as PipelineColuna;
    const novoStatus = mapColunaToStatus(novaColuna);
    const novaTemp   = mapColunaToTemp(novaColuna);
    const colTitulo  = COLUNAS.find(c => c.id === novaColuna)?.titulo ?? novaColuna;

    // Optimistic update — status + temperatura simultaneamente
    setClientes(prev => prev.map(c =>
      c.id === draggableId
        ? { ...c, status: novoStatus, temperatura: novaTemp }
        : c
    ));
    setSavingDragId(draggableId);

    try {
      // 1. Persiste status + temperatura no banco
      await svpApi.atualizarCliente(draggableId, { status: novoStatus, temperatura: novaTemp });

      // 2. Registra movimentação na timeline de atividade
      await svpApi.registrarInteracao({
        cliente_id: draggableId,
        canal: 'nota',
        direcao: 'interno',
        titulo: `Movido para ${colTitulo}`,
        conteudo: `Pipeline atualizado → ${colTitulo}`,
      });

      toast.success(`Movido para ${colTitulo}`);
    } catch {
      carregarClientes();
      toast.error('Erro ao atualizar status');
    } finally {
      setSavingDragId(null);
    }
  }, []);

  return (
    <>
      <main className="pb-16 px-4 sm:px-6 pt-6">
        <div className={viewMode === 'pipeline' ? 'max-w-full mx-auto space-y-4' : 'max-w-[1100px] mx-auto space-y-6'}>
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">CRM</h1>
              <p className="text-sm text-muted-foreground">Pipeline de vendas</p>
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('pipeline')}
                  className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    viewMode === 'pipeline' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Pipeline
                </button>
                <button
                  onClick={() => setViewMode('lista')}
                  className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    viewMode === 'lista' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <List className="h-3.5 w-3.5" /> Lista
                </button>
              </div>
              <Button onClick={() => setModalAberto(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Novo Cliente
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou empresa..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroTemp} onValueChange={v => setFiltroTemp(v as ClienteTemperatura | 'todos')}>
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue placeholder="Temperatura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas temperaturas</SelectItem>
                {(Object.keys(TEMP_BADGE) as ClienteTemperatura[]).map(t => (
                  <SelectItem key={t} value={t}>{TEMP_BADGE[t].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          {carregando ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {COLUNAS.map(col => (
                <div key={col.id} className="w-[280px] shrink-0 space-y-3">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-28 w-full rounded-lg" />
                  <Skeleton className="h-28 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : erro ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center space-y-3">
              <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
              <p className="text-sm text-destructive">{erro}</p>
              <Button variant="outline" size="sm" onClick={carregarClientes}>Tentar novamente</Button>
            </div>
          ) : viewMode === 'pipeline' ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 250px)' }}>
                {COLUNAS.map(col => {
                  const items = colunaClientes[col.id];
                  const isFechado = col.id === 'fechado';

                  return (
                    <div key={col.id} className="w-[280px] shrink-0 flex flex-col">
                      {/* Column header — colored top stripe + card bg */}
                      <div
                        className="px-3 py-2.5 mb-0 bg-card"
                        style={{
                          borderRadius: '10px 10px 0 0',
                          borderTop: `3px solid ${col.borderColor}`,
                          borderLeft: '1px solid hsl(var(--border))',
                          borderRight: '1px solid hsl(var(--border))',
                          borderBottom: '1px solid hsl(var(--border))',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ background: col.borderColor }}
                          />
                          <span
                            className="text-[11px] font-semibold uppercase tracking-widest"
                            style={{ color: col.borderColor }}
                          >
                            {col.titulo}
                          </span>
                          <span
                            className="ml-auto text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md"
                            style={{
                              background: `${col.borderColor}18`,
                              color: col.borderColor,
                            }}
                          >
                            {items.length}
                          </span>
                          {isFechado && items.length > 0 && (
                            <button
                              onClick={() => setFechadoColapsado(p => !p)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ChevronRight className={`h-4 w-4 transition-transform ${!fechadoColapsado ? 'rotate-90' : ''}`} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Column body */}
                      {isFechado && fechadoColapsado ? (
                        <div className="flex-1 rounded-b-lg bg-muted/30 border border-t-0 border-border p-3">
                          <p className="text-xs text-muted-foreground text-center">{items.length} fechado{items.length !== 1 ? 's' : ''}</p>
                        </div>
                      ) : (
                        <Droppable droppableId={col.id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`flex-1 rounded-b-lg p-2 space-y-2 overflow-y-auto transition-colors ${
                                snapshot.isDraggingOver ? 'bg-primary/5' : 'bg-muted/20'
                              }`}
                              style={{
                                maxHeight: 'calc(100vh - 310px)',
                                border: `1px solid ${snapshot.isDraggingOver ? `${col.borderColor}55` : 'hsl(var(--border))'}`,
                                borderTop: 'none',
                              }}
                            >
                              {items.length === 0 ? (
                                <div className="flex items-center justify-center h-24 text-center">
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    Nenhum lead aqui<br />
                                    Arraste um card ou adicione novo
                                  </p>
                                </div>
                              ) : (
                                items.map((c, idx) => (
                                  <Draggable key={c.id} draggableId={c.id} index={idx}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        style={provided.draggableProps.style}
                                      >
                                        <PipelineCard
                                          cliente={c}
                                          isDragging={snapshot.isDragging}
                                          isFechado={isFechado}
                                          isSaving={savingDragId === c.id}
                                          onClick={() => setClienteSelecionado(c)}
                                          dragHandleProps={provided.dragHandleProps}
                                        />
                                      </div>
                                    )}
                                  </Draggable>
                                ))
                              )}
                              {provided.placeholder}

                              {col.id === 'novo_lead' && (
                                <button
                                  onClick={() => setModalAberto(true)}
                                  className="w-full py-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg hover:border-primary/40 transition-colors"
                                >
                                  + Novo lead
                                </button>
                              )}
                            </div>
                          )}
                        </Droppable>
                      )}
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          ) : (
            /* Lista view (original grid) */
            clientesFiltrados.length === 0 ? (
              filtroAtivo ? (
                <div className="text-center py-12 space-y-2">
                  <p className="text-sm text-muted-foreground">Nenhum cliente encontra os filtros aplicados.</p>
                  <Button variant="link" size="sm" onClick={limparFiltros}>Limpar filtros</Button>
                </div>
              ) : (
                <div className="text-center py-16 space-y-4">
                  <Users className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                  <div>
                    <p className="font-medium text-foreground">Nenhum cliente ainda</p>
                    <p className="text-sm text-muted-foreground">Comece gerando um roteiro ou proposta — o cliente será criado automaticamente.</p>
                  </div>
                  <Button onClick={() => navigate('/')}>Gerar primeiro roteiro</Button>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientesFiltrados.map(c => (
                  <ListClienteCard
                    key={c.id}
                    cliente={c}
                    onClick={() => setClienteSelecionado(c)}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </main>

      <NovoClienteModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onCriado={c => setClientes(prev => [c, ...prev])}
      />

      <RegistrarResultadoModal
        aberto={!!resultadoModal}
        sessaoId={resultadoModal?.sessaoId ?? ''}
        nomeCliente={resultadoModal?.nomeCliente}
        produto={resultadoModal?.produto}
        onFechar={() => setResultadoModal(null)}
        onRegistrado={() => { setResultadoModal(null); }}
      />

      <ClienteQuickViewModal
        cliente={clienteSelecionado}
        onClose={() => setClienteSelecionado(null)}
        onClienteAtualizado={carregarClientes}
      />
    </>
  );
}

/* ── PipelineCard (inside Kanban column) ──────── */

function PipelineCard({ cliente, isDragging, isFechado, isSaving, onClick, dragHandleProps }: {
  cliente: Cliente;
  isDragging: boolean;
  isFechado: boolean;
  isSaving?: boolean;
  onClick: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLElement> | null;
}) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const tcRaw = TEMP_COLORS[cliente.temperatura] ?? TEMP_DEFAULT;
  const tc = { border: tcRaw.border, bg: isDark ? tcRaw.bgDark : tcRaw.bg, text: isDark ? tcRaw.textDark : tcRaw.text, label: tcRaw.label };
  const initials = cliente.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const sessao = cliente.ultima_sessao;

  const [localTem, setLocalTem] = useState<Partial<Record<PecaTipo, boolean>>>({});
  const [gerando, setGerando] = useState<PecaTipo | null>(null);

  const handleGerarPeca = useCallback(async (tipo: PecaTipo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sessao) return;
    setGerando(tipo);
    try {
      await svpApi.gerarPeca(sessao.id, tipo);
      setLocalTem(prev => ({ ...prev, [tipo]: true }));
      toast.success(`${PECAS_CONFIG.find(p => p.tipo === tipo)!.label} gerada!`);
    } catch {
      toast.error(`Erro ao gerar ${tipo}`);
    } finally {
      setGerando(null);
    }
  }, [sessao]);

  // Aging
  const agingText = cliente.ultimo_contato_em
    ? formatDistanceToNow(new Date(cliente.ultimo_contato_em), { addSuffix: false, locale: ptBR })
    : null;
  const daysSince = cliente.ultimo_contato_em
    ? differenceInDays(new Date(), new Date(cliente.ultimo_contato_em))
    : null;
  const agingColor = daysSince !== null
    ? daysSince >= 14 ? '#E03E3E' : daysSince >= 7 ? '#E8A020' : '#3B6FE8'
    : '#3B6FE8';

  // Contextual primary button
  const isGerando = sessao?.geracao_status === 'gerando';
  const temRoteiro = sessao?.tem_roteiro;
  const totalPecas = sessao ? [sessao.tem_proposta, sessao.tem_email, sessao.tem_whatsapp, sessao.tem_objecoes].filter(Boolean).length : 0;
  const todasGeradas = totalPecas === 4 && temRoteiro;

  let primaryAction = { label: 'Gerar roteiro', action: () => navigate('/') };
  if (sessao) {
    if (todasGeradas) {
      primaryAction = { label: 'Registrar contato', action: () => navigate(`/crm/${cliente.id}`) };
    } else if (temRoteiro && totalPecas > 0 && totalPecas < 4) {
      primaryAction = { label: 'Continuar', action: () => navigate(`/roteiro/${sessao.id}`) };
    } else if (temRoteiro) {
      primaryAction = { label: 'Ver roteiro', action: () => navigate(`/roteiro/${sessao.id}`) };
    }
  }

  // Segmented progress bar
  const pieceStates = sessao ? [
    sessao.tem_roteiro,
    localTem.proposta ?? sessao.tem_proposta,
    localTem.email ?? sessao.tem_email,
    localTem.whatsapp ?? sessao.tem_whatsapp,
    localTem.objecoes ?? sessao.tem_objecoes,
  ] : null;

  const doneCount = pieceStates?.filter(Boolean).length ?? 0;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        onClick={onClick}
        className={`rounded-lg bg-card border border-border cursor-pointer transition-all hover:shadow-md hover:-translate-y-px ${
          isDragging ? 'opacity-80 shadow-lg rotate-1 scale-[1.02]' : ''
        } ${isSaving ? 'ring-2 ring-primary/40 animate-pulse' : ''}`}
        style={{ borderLeft: `3px solid ${tc.border}` }}
      >
        {/* Card body */}
        <div className="p-3 space-y-2">
          {/* Name + grip + temp badge */}
          <div className="flex items-center gap-1.5">
            <div
              {...dragHandleProps}
              className="flex items-center gap-1 cursor-grab active:cursor-grabbing shrink-0"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center"
                style={{ background: tc.bg, color: tc.text }}
              >
                <span className="text-[10px] font-bold">{initials}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{cliente.nome}</p>
              {(cliente.empresa) && (
                <p className="truncate text-muted-foreground" style={{ fontSize: '11px', marginTop: '1px' }}>{cliente.empresa}</p>
              )}
            </div>
            <span
              className="shrink-0 font-bold"
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '20px',
                background: tc.bg,
                color: tc.text,
                border: `1px solid ${tc.border}44`,
              }}
            >
              {tc.label}
            </span>
          </div>

          {/* Produto + Ticket */}
          {sessao?.produto && (
            <p className="text-[10px] text-muted-foreground truncate">
              📦 {sessao.produto}
            </p>
          )}
          {sessao?.preco != null && sessao.preco > 0 && (
            <p className="text-xs font-semibold text-primary">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sessao.preco)}
            </p>
          )}

          {/* Fechado badge — with visual tint */}
          {isFechado && (
            <div
              className="rounded-md px-2 py-1"
              style={{
                background: cliente.status === 'perdido' ? 'hsl(var(--destructive) / 0.08)' : 'hsl(var(--ok) / 0.10)',
              }}
            >
              {cliente.status === 'ganho' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color: 'hsl(var(--ok))' }}>✅ Ganho</span>
              ) : cliente.status === 'perdido' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive">❌ Perdido</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color: 'hsl(var(--ok))' }}>✅ Fechado</span>
              )}
            </div>
          )}

          {/* Segmented progress bar with tooltips */}
          {pieceStates && (
            <div className="flex items-center gap-0.5">
              {pieceStates.map((done, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <span
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        done ? 'bg-primary' : 'bg-muted border border-border'
                      }`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px] px-2 py-1">
                    {PIECE_LABELS[i]} {done ? '✓' : '— pendente'}
                  </TooltipContent>
                </Tooltip>
              ))}
              {isGerando && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-1" />}
              <span className="text-[9px] text-muted-foreground ml-1">{doneCount}/5</span>
            </div>
          )}

          {/* Aging + creation date */}
          <div className="flex items-center justify-between gap-1">
            <span className="flex items-center gap-1 text-[10px]" style={{ color: agingColor }}>
              <Clock className="h-3 w-3" />
              {agingText ? `há ${agingText}` : 'Sem contato'}
            </span>
            <span className="text-[9px] text-muted-foreground/70">
              criado {formatDistanceToNow(new Date(cliente.criado_em), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
        </div>

        {/* Separator + Primary action button */}
        <div className="border-t border-border">
          <button
            onClick={e => { e.stopPropagation(); primaryAction.action(); }}
            className="w-full text-[11px] font-medium py-2 rounded-b-lg bg-primary/5 text-primary hover:bg-primary/15 transition-colors flex items-center justify-center gap-1"
          >
            {primaryAction.label} <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ── ListClienteCard (grid view) ──────────────── */

function ListClienteCard({ cliente, onClick }: { cliente: Cliente; onClick: () => void }) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const temp = TEMP_BADGE[cliente.temperatura] || TEMP_BADGE.frio;
  const tcRaw = TEMP_COLORS[cliente.temperatura] || TEMP_DEFAULT;
  const tempColor = { border: tcRaw.border, bg: isDark ? tcRaw.bgDark : tcRaw.bg, text: isDark ? tcRaw.textDark : tcRaw.text, label: tcRaw.label };
  const statusCls = STATUS_CLS[cliente.status] || STATUS_CLS.novo;
  const statusLabel = STATUS_LABEL[cliente.status] || cliente.status;
  const initials = cliente.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const sessao = cliente.ultima_sessao;

  const [localTem, setLocalTem] = useState<Partial<Record<PecaTipo, boolean>>>({});
  const [gerando, setGerando] = useState<PecaTipo | null>(null);
  const [erroTipo, setErroTipo] = useState<PecaTipo | null>(null);

  const handleGerarPeca = useCallback(async (tipo: PecaTipo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sessao) return;
    setGerando(tipo);
    setErroTipo(null);
    try {
      await svpApi.gerarPeca(sessao.id, tipo);
      setLocalTem(prev => ({ ...prev, [tipo]: true }));
      toast.success(`${PECAS_CONFIG.find(p => p.tipo === tipo)!.label} gerada!`);
    } catch {
      setErroTipo(tipo);
      toast.error(`Erro ao gerar ${tipo}`);
    } finally {
      setGerando(null);
    }
  }, [sessao]);

  const handleClickPeca = useCallback((tipo: PecaTipo, temPeca: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sessao) return;
    if (temPeca) {
      navigate(`/roteiro/${sessao.id}`);
    } else {
      handleGerarPeca(tipo, e);
    }
  }, [sessao, navigate, handleGerarPeca]);

  const isGerando = sessao?.geracao_status === 'gerando';

  return (
    <Card className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-px" onClick={onClick}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{cliente.nome}</p>
            {cliente.empresa && <p className="text-xs text-muted-foreground truncate">{cliente.empresa}</p>}
          </div>
          <span
            className="text-[10px] font-medium shrink-0 px-2 py-0.5 rounded-full"
            style={{ background: tempColor.bg, color: tempColor.text, border: `1px solid ${tempColor.border}40` }}
          >
            {temp.label}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] ${statusCls}`}>{statusLabel}</Badge>
          {sessao?.produto && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">📦 {sessao.produto}</span>
          )}
          {sessao?.preco != null && sessao.preco > 0 && (
            <span className="text-xs font-semibold text-primary">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sessao.preco)}
            </span>
          )}
        </div>
        {sessao && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {isGerando ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                <Loader2 className="h-3 w-3 animate-spin" /> Roteiro...
              </span>
            ) : sessao.tem_roteiro ? (
              <button
                onClick={e => { e.stopPropagation(); navigate(`/roteiro/${sessao.id}`); }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500/20 transition-colors"
              >
                ✓ 📋 Roteiro
              </button>
            ) : null}
            {PECAS_CONFIG.map(peca => {
              const temPeca = localTem[peca.tipo] ?? (sessao as any)[peca.temKey];
              const isGerandoThis = gerando === peca.tipo;
              const hasError = erroTipo === peca.tipo;
              if (isGerandoThis) {
                return (
                  <span key={peca.tipo} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                    <Loader2 className="h-3 w-3 animate-spin" /> Gerando...
                  </span>
                );
              }
              return (
                <button
                  key={peca.tipo}
                  onClick={e => handleClickPeca(peca.tipo, temPeca, e)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                    temPeca
                      ? 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20'
                      : hasError
                        ? 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
                        : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {temPeca ? '✓' : hasError ? '!' : ''} {peca.emoji} {temPeca ? peca.label : 'Gerar'}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {cliente.ultimo_contato_em
              ? `Último contato ${formatDistanceToNow(new Date(cliente.ultimo_contato_em), { addSuffix: true, locale: ptBR })}`
              : 'Sem contato registrado'}
          </span>
          <span className="text-[9px] text-muted-foreground/70">
            criado {formatDistanceToNow(new Date(cliente.criado_em), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── NovoClienteModal ──────────────────────────── */

function NovoClienteModal({
  aberto, onFechar, onCriado,
}: { aberto: boolean; onFechar: () => void; onCriado: (c: Cliente) => void }) {
  const { user } = useAuth();
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: '', empresa: '', whatsapp: '', email: '', como_conhecemos: '',
  });

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.nome.trim()) { setErroModal('Nome é obrigatório.'); return; }
    if (!user?.id) return;
    setSalvando(true);
    setErroModal(null);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          usuario_id: user.id,
          nome: form.nome.trim(),
          empresa: form.empresa.trim() || null,
          whatsapp: form.whatsapp.trim() || null,
          email: form.email.trim() || null,
          como_conhecemos: form.como_conhecemos || null,
        })
        .select()
        .single();
      if (error) throw error;
      toast.success('Cliente criado com sucesso!');
      onCriado(data as unknown as Cliente);
      onFechar();
      setForm({ nome: '', empresa: '', whatsapp: '', email: '', como_conhecemos: '' });
    } catch (err) {
      setErroModal(err instanceof Error ? err.message : 'Erro ao criar cliente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={v => { if (!v) onFechar(); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="nc-nome">Nome *</Label>
            <Input id="nc-nome" value={form.nome} onChange={e => set('nome', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-empresa">Empresa</Label>
            <Input id="nc-empresa" value={form.empresa} onChange={e => set('empresa', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-whatsapp">WhatsApp</Label>
            <Input id="nc-whatsapp" placeholder="(11) 99999-9999" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-email">Email</Label>
            <Input id="nc-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Como conhecemos?</Label>
            <Select value={form.como_conhecemos} onValueChange={v => set('como_conhecemos', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {COMO_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {erroModal && <p className="text-sm text-destructive">{erroModal}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar} disabled={salvando}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Criar Cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
