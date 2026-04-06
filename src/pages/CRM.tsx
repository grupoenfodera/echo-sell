import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import Header from '@/components/Header';
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

const TEMP_COLORS: Record<ClienteTemperatura, { border: string; bg: string; text: string; label: string }> = {
  ativo:    { border: '#ff6b4a', bg: '#ff6b4a22', text: '#ff6b4a', label: 'Quente' },
  morno:    { border: '#f5c842', bg: '#f5c84222', text: '#f5c842', label: 'Morno' },
  frio:     { border: '#4a9eff', bg: '#4a9eff22', text: '#4a9eff', label: 'Frio' },
  em_risco: { border: '#ff6b4a', bg: '#ff6b4a22', text: '#ff6b4a', label: 'Em risco' },
};

const TEMP_DEFAULT = { border: '#3a3a52', bg: '#3a3a5222', text: '#3a3a52', label: '—' };

const TEMP_BADGE: Record<ClienteTemperatura, { emoji: string; label: string; cls: string }> = {
  frio:     { emoji: '🔵', label: 'Frio',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  morno:    { emoji: '🟡', label: 'Morno',    cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  ativo:    { emoji: '🟢', label: 'Ativo',    cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  em_risco: { emoji: '🔴', label: 'Em risco', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
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
  proposta_enviada: 'border-purple-400 text-purple-700 dark:text-purple-300',
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
  { id: 'novo_lead',         titulo: 'Novo Lead',         dotCls: 'bg-muted-foreground', borderColor: '#6b7280' },
  { id: 'roteiro_pronto',    titulo: 'Roteiro Pronto',    dotCls: 'bg-blue-500',         borderColor: '#4a9eff' },
  { id: 'proposta_enviada',  titulo: 'Proposta Enviada',  dotCls: 'bg-purple-500',       borderColor: '#7c5cfc' },
  { id: 'follow_up',         titulo: 'Follow-up',         dotCls: 'bg-orange-500',       borderColor: '#fb923c' },
  { id: 'fechado',           titulo: 'Fechado',           dotCls: 'bg-green-500',        borderColor: '#34d399' },
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
    // Sort fechado by most recent
    map.fechado.sort((a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime());
    return map;
  }, [clientesFiltrados]);

  const [savingDragId, setSavingDragId] = useState<string | null>(null);

  // Drag and drop handler
  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const novaColuna = destination.droppableId as PipelineColuna;
    const novoStatus = mapColunaToStatus(novaColuna);

    // Optimistic update
    setClientes(prev => prev.map(c =>
      c.id === draggableId ? { ...c, status: novoStatus } : c
    ));
    setSavingDragId(draggableId);

    try {
      await svpApi.atualizarCliente(draggableId, { status: novoStatus });
      toast.success('Status atualizado');
    } catch {
      carregarClientes();
      toast.error('Erro ao atualizar status');
    } finally {
      setSavingDragId(null);
    }
  }, []);

  return (
    <>
      <Header />
      <main className="pt-[70px] pb-16 px-4 sm:px-6">
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
                  <SelectItem key={t} value={t}>{TEMP_BADGE[t].emoji} {TEMP_BADGE[t].label}</SelectItem>
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
                      {/* Column header */}
                      <div
                        className="px-3 py-2.5 mb-0"
                        style={{
                          background: '#22222f',
                          borderRadius: '10px 10px 0 0',
                          border: '1px solid #2e2e42',
                          borderBottom: 'none',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${col.dotCls}`} />
                          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{col.titulo}</span>
                          <span className="ml-auto text-[11px] text-muted-foreground font-medium">{items.length}</span>
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
                                borderTop: `3px solid ${col.borderColor}`,
                                border: `1px solid ${snapshot.isDraggingOver ? 'hsl(var(--primary) / 0.3)' : '#2e2e42'}`,
                                borderTopWidth: '3px',
                                borderTopColor: col.borderColor,
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
  const tc = TEMP_COLORS[cliente.temperatura] ?? TEMP_DEFAULT;
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
    ? daysSince >= 14 ? 'hsl(var(--destructive))' : daysSince >= 7 ? '#f5c842' : 'hsl(var(--primary))'
    : 'hsl(var(--primary))';

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
        className={`rounded-lg bg-card border border-border cursor-pointer transition-all hover:shadow-md ${
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
              {cliente.empresa && (
                <p className="text-[11px] text-muted-foreground truncate" style={{ marginTop: '1px' }}>{cliente.empresa}</p>
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

          {/* Fechado badge — with visual tint */}
          {isFechado && (
            <div
              className="rounded-md px-2 py-1"
              style={{
                background: cliente.status === 'perdido' ? 'hsl(var(--destructive) / 0.08)' : 'hsl(142 71% 45% / 0.08)',
              }}
            >
              {cliente.status === 'ganho' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color: '#34d399' }}>✅ Ganho</span>
              ) : cliente.status === 'perdido' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive">❌ Perdido</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color: '#34d399' }}>✅ Fechado</span>
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
                      className="h-1.5 flex-1 rounded-full transition-colors"
                      style={done
                        ? { background: '#7c5cfc' }
                        : { background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }
                      }
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

          {/* Aging */}
          <div className="flex items-center justify-between gap-1">
            <span className="flex items-center gap-1 text-[10px]" style={{ color: agingColor }}>
              <Clock className="h-3 w-3" />
              {agingText ? `há ${agingText}` : 'Sem contato'}
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
  const temp = TEMP_BADGE[cliente.temperatura] || TEMP_BADGE.frio;
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
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{cliente.nome}</p>
            {cliente.empresa && <p className="text-xs text-muted-foreground truncate">{cliente.empresa}</p>}
          </div>
          <Badge variant="secondary" className={`text-[10px] shrink-0 ${temp.cls}`}>
            {temp.emoji} {temp.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] ${statusCls}`}>{statusLabel}</Badge>
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
