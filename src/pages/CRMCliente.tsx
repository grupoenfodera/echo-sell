import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import NovaInteracaoModal from '@/components/crm/NovaInteracaoModal';
import RegistrarResultadoModal from '@/components/crm/RegistrarResultadoModal';
import { svpApi } from '@/lib/api-svp';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Cliente, SessaoVenda, Interacao, InteracaoCanal, ClienteStatus, ClienteTemperatura, RoteiroEtapa,
  MensagensConfirmacao, FollowUpItem,
} from '@/types/crm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Edit2, Plus, Phone, Mail, Linkedin, Instagram, UserPlus,
  Circle, Thermometer, Calendar, Clock, StickyNote, FileText, ChevronRight,
  Sparkles, Loader2, AlertCircle, MessageSquare, ClipboardCheck, X, Trash2,
  Copy, Check, Shield, Save, ClipboardList, CalendarClock, RotateCw, Send, RefreshCw,
} from 'lucide-react';

/* ── Synthetic timeline ─────────────────────────── */

type TimelineRow = {
  id: string;
  label: string;
  detail?: string;
  date: Date;
  dotCls: string;
  synthetic: boolean;
  canal?: InteracaoCanal;
};

function buildTimeline(sessoes: SessaoVenda[], interacoes: Interacao[]): TimelineRow[] {
  const rows: TimelineRow[] = [];

  for (const int of interacoes) {
    rows.push({
      id: `int-${int.id}`,
      label: int.titulo ?? CANAL_LABEL[int.canal as InteracaoCanal] ?? int.canal,
      detail: int.resumo_ia ?? (int.conteudo ? int.conteudo.slice(0, 80) : undefined),
      date: new Date(int.criado_em),
      dotCls: CANAL_DOT[int.canal as InteracaoCanal] || 'bg-gray-400',
      synthetic: false,
      canal: int.canal as InteracaoCanal,
    });
  }

  for (const s of sessoes) {
    if (s.objecoes_geradas_em) rows.push({ id: `${s.id}-objecoes`, label: 'Objeções geradas', date: new Date(s.objecoes_geradas_em), dotCls: 'bg-amber-500', synthetic: true, canal: 'proposta' });
    if (s.whatsapp_gerado_em)  rows.push({ id: `${s.id}-whatsapp`, label: 'Mensagem WhatsApp gerada', date: new Date(s.whatsapp_gerado_em), dotCls: 'bg-green-500', synthetic: true, canal: 'whatsapp' });
    if (s.email_gerado_em)     rows.push({ id: `${s.id}-email`, label: 'E-mail de follow-up gerado', date: new Date(s.email_gerado_em), dotCls: 'bg-blue-500', synthetic: true, canal: 'email' });
    if (s.proposta_gerada_em)  rows.push({ id: `${s.id}-proposta`, label: 'Proposta comercial gerada', date: new Date(s.proposta_gerada_em), dotCls: 'bg-rose-500', synthetic: true, canal: 'proposta' });
    if (s.roteiro_gerado_em)   rows.push({ id: `${s.id}-roteiro`, label: 'Roteiro gerado', detail: s.nicho ?? undefined, date: new Date(s.roteiro_gerado_em), dotCls: 'bg-blue-700', synthetic: true, canal: 'roteiro' });
    rows.push({ id: `${s.id}-sessao`, label: 'Nova sessão criada', detail: s.nicho ?? undefined, date: new Date(s.criado_em), dotCls: 'bg-muted-foreground', synthetic: true });
  }

  const seen = new Set<string>();
  return rows
    .filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

/* ── Maps ──────────────────────────────────────── */

const TEMP_BADGE: Record<ClienteTemperatura, { emoji: string; label: string; cls: string }> = {
  frio:     { emoji: '🔵', label: 'Frio',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  morno:    { emoji: '🟡', label: 'Morno',    cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  ativo:    { emoji: '🟢', label: 'Ativo',    cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  em_risco: { emoji: '🔴', label: 'Em risco', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

const STATUS_LABEL: Record<ClienteStatus, string> = {
  novo: 'Novo', em_contato: 'Em contato', proposta_enviada: 'Proposta enviada',
  negociacao: 'Negociação', ganho: 'Ganho', perdido: 'Perdido',
};

const STATUS_CLS: Record<ClienteStatus, string> = {
  novo: 'border-muted-foreground/40 text-muted-foreground',
  em_contato: 'border-blue-400 text-blue-700 dark:text-blue-300',
  proposta_enviada: 'border-blue-500 text-blue-700 dark:text-blue-300',
  negociacao: 'border-orange-400 text-orange-700 dark:text-orange-300',
  ganho: 'border-green-400 text-green-700 dark:text-green-300',
  perdido: 'border-red-400 text-red-700 dark:text-red-300',
};

const COMO_LABEL: Record<string, string> = {
  indicacao: 'Indicação', evento: 'Evento', linkedin: 'LinkedIn',
  instagram: 'Instagram', abordagem_fria: 'Abordagem fria', outros: 'Outros',
};

const CANAL_LABEL: Record<InteracaoCanal, string> = {
  whatsapp: 'WhatsApp', email: 'Email', ligacao: 'Ligação', reuniao: 'Reunião',
  nota: 'Nota', roteiro: 'Roteiro', proposta: 'Proposta', transcricao: 'Transcrição',
};

const CANAL_DOT: Record<InteracaoCanal, string> = {
  whatsapp: 'bg-green-500', email: 'bg-blue-500', ligacao: 'bg-orange-500',
  reuniao: 'bg-blue-600', nota: 'bg-gray-400', roteiro: 'bg-blue-700',
  proposta: 'bg-rose-500', transcricao: 'bg-teal-500',
};

const CANAL_FILTERS: { value: InteracaoCanal | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'whatsapp', label: '💬 WhatsApp' },
  { value: 'ligacao', label: '📞 Ligações' },
  { value: 'email', label: '📧 Emails' },
  { value: 'reuniao', label: '📅 Reuniões' },
  { value: 'nota', label: '📝 Notas' },
  { value: 'roteiro', label: '📄 Roteiros' },
  { value: 'proposta', label: '📄 Propostas' },
];

/* ── Helpers ────────────────────────────────────── */

function renderHighlightsSimple(text: string) {
  let result = text;
  result = result.replace(/\[HL1\](.*?)\[\/HL1\]/gs, '<mark class="bg-primary/20 text-primary px-1 rounded">$1</mark>');
  result = result.replace(/\[HL2\](.*?)\[\/HL2\]/gs, '<mark class="bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1 rounded">$1</mark>');
  result = result.replace(/\[HL3\](.*?)\[\/HL3\]/gs, '<mark class="bg-green-500/20 text-green-700 dark:text-green-400 px-1 rounded">$1</mark>');
  return result;
}

function formatScript(text: string) {
  let result = text;
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/\[pausa\]/gi, '<span class="text-muted-foreground italic">[pausa]</span>');
  return result;
}

/* ── Página ─────────────────────────────────────── */

export default function CRMCliente() {
  const { clienteId } = useParams();
  const navigate = useNavigate();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [sessoes, setSessoes] = useState<SessaoVenda[]>([]);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [filtroCanal, setFiltroCanal] = useState<InteracaoCanal | 'todos'>('todos');
  const [modalInteracao, setModalInteracao] = useState(false);
  const [canalInicial, setCanalInicial] = useState<InteracaoCanal | undefined>(undefined);
  const [resultadoModal, setResultadoModal] = useState<{
    sessaoId: string;
    produto?: string;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  // Edit form state
  const [formEdit, setFormEdit] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!clienteId) return;
    setCarregando(true);
    svpApi.buscarCliente(clienteId)
      .then(res => {
        setCliente(res.cliente);
        setSessoes(res.sessoes);
        setInteracoes(res.interacoes);
      })
      .catch(err => setErro(err instanceof Error ? err.message : 'Erro ao carregar cliente.'))
      .finally(() => setCarregando(false));
  }, [clienteId]);

  const startEdit = () => {
    if (!cliente) return;
    setFormEdit({
      nome: cliente.nome || '',
      empresa: cliente.empresa || '',
      whatsapp: cliente.whatsapp || '',
      email: cliente.email || '',
      linkedin_url: cliente.linkedin_url || '',
      instagram_url: cliente.instagram_url || '',
      como_conhecemos: cliente.como_conhecemos || '',
      status: cliente.status || 'novo',
      notas: cliente.notas || '',
    });
    setEditando(true);
  };

  const cancelEdit = () => { setEditando(false); };

  const saveEdit = async () => {
    if (!clienteId || !formEdit.nome?.trim()) { toast.error('Nome é obrigatório.'); return; }
    setSalvando(true);
    try {
      await svpApi.atualizarCliente(clienteId, {
        nome: formEdit.nome.trim(),
        empresa: formEdit.empresa?.trim() || undefined,
        whatsapp: formEdit.whatsapp?.trim() || undefined,
        email: formEdit.email?.trim() || undefined,
        linkedin_url: formEdit.linkedin_url?.trim() || undefined,
        instagram_url: formEdit.instagram_url?.trim() || undefined,
        como_conhecemos: (formEdit.como_conhecemos || undefined) as Cliente['como_conhecemos'],
        status: formEdit.status as ClienteStatus,
        notas: formEdit.notas?.trim() || undefined,
      });
      setCliente(prev => prev ? { ...prev, ...formEdit } as Cliente : prev);
      setEditando(false);
      toast.success('Salvo!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const set = (k: string, v: string) => setFormEdit(p => ({ ...p, [k]: v }));

  const openInteracao = (canal?: InteracaoCanal) => {
    setCanalInicial(canal);
    setModalInteracao(true);
  };

  const handleExcluir = async () => {
    if (!clienteId) return;
    setExcluindo(true);
    try {
      const { error } = await supabase.from('clientes').delete().eq('id', clienteId);
      if (error) throw error;
      toast.success('Cliente excluído com sucesso.');
      navigate('/crm');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir cliente.');
    } finally {
      setExcluindo(false);
      setConfirmDelete(false);
    }
  };

  const timeline = buildTimeline(sessoes, interacoes);
  const timelineFiltrada = filtroCanal === 'todos'
    ? timeline
    : timeline.filter(r => r.canal === filtroCanal);

  if (carregando) {
    return (
      <>
        <main className="pb-16 px-4 sm:px-6 pt-6">
          <div className="max-w-[1100px] mx-auto space-y-6">
            <Skeleton className="h-8 w-40" />
            <div className="flex items-center gap-4"><Skeleton className="h-14 w-14 rounded-full" /><div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-32" /></div></div>
            <div className="grid grid-cols-1 lg:grid-cols-[35%_1fr] gap-6">
              <Skeleton className="h-[400px] rounded-xl" />
              <Skeleton className="h-[400px] rounded-xl" />
            </div>
          </div>
        </main>
      </>
    );
  }

  if (erro || !cliente) {
    return (
      <>
        <main className="pb-16 px-4 sm:px-6 pt-6">
          <div className="max-w-[600px] mx-auto text-center space-y-4 py-16">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm text-destructive">{erro || 'Cliente não encontrado.'}</p>
            <Button variant="outline" onClick={() => navigate('/crm')}>Voltar ao CRM</Button>
          </div>
        </main>
      </>
    );
  }

  const temp = TEMP_BADGE[cliente.temperatura] || TEMP_BADGE.frio;
  const initials = cliente.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      <main className="pb-16 px-4 sm:px-6 pt-6">
        <div className="max-w-[1100px] mx-auto space-y-6">
          {/* Back */}
          <Button variant="ghost" size="sm" onClick={() => navigate('/crm')} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Voltar ao CRM
          </Button>

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-primary">{initials}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">{cliente.nome}</h1>
                  <Badge variant="secondary" className={`text-xs ${temp.cls}`}>{temp.emoji} {temp.label}</Badge>
                </div>
                {cliente.empresa && <p className="text-sm text-muted-foreground">{cliente.empresa}</p>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {!editando && (
                <Button variant="outline" size="sm" onClick={startEdit}>
                  <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Editar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => openInteracao()}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Interação
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* 2 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-[35%_1fr] gap-6">
            {/* Left column */}
            <div className="space-y-6">
              {/* Info card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Informações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {editando ? (
                    <EditForm form={formEdit} set={set} onCancel={cancelEdit} onSave={saveEdit} salvando={salvando} />
                  ) : (
                    <ViewFields cliente={cliente} />
                  )}
                </CardContent>
              </Card>

              {/* Sessions */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Histórico de Propostas</CardTitle>
                    <Badge variant="secondary" className="text-xs">{sessoes.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {sessoes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma proposta gerada ainda.</p>
                  ) : (
                    <div className="space-y-3">
                      {sessoes.slice(0, 5).map(s => (
                        <SessaoItem
                          key={s.id}
                          sessao={s}
                          onRegistrarResultado={() =>
                            setResultadoModal({ sessaoId: s.id, produto: s.produto })
                          }
                        />
                      ))}
                      {sessoes.length > 5 && (
                        <Button variant="link" size="sm" className="px-0 text-xs">Ver todas ({sessoes.length})</Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right column — Timeline */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">Timeline</h2>
                  <Badge variant="secondary" className="text-xs">{timeline.length}</Badge>
                </div>
                <Button variant="outline" size="sm" onClick={() => openInteracao('nota' as InteracaoCanal)}>
                  <Plus className="h-3 w-3 mr-1" /> Nova Nota
                </Button>
              </div>

              {/* Filter pills */}
              <div className="flex flex-wrap gap-1.5">
                {CANAL_FILTERS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setFiltroCanal(f.value)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      filtroCanal === f.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Timeline list */}
              {timelineFiltrada.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma interação encontrada.</p>
              ) : (
                <div className="relative space-y-0">
                  {timelineFiltrada.map((row, idx) => {
                    if (!row.synthetic) {
                      // Real interacao — use full InteracaoCard
                      const inter = interacoes.find(i => row.id === `int-${i.id}`);
                      if (inter) return <InteracaoCard key={row.id} interacao={inter} isLast={idx === timelineFiltrada.length - 1} />;
                    }
                    // Synthetic event — lightweight row
                    const isLast = idx === timelineFiltrada.length - 1;
                    return (
                      <div key={row.id} className="flex gap-3 pb-4">
                        <div className="flex flex-col items-center">
                          <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${row.dotCls} opacity-60`} />
                          {!isLast && <div className="w-px flex-1 bg-border/50 mt-1" />}
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm text-muted-foreground">{row.label}</span>
                            <span className="text-[10px] text-muted-foreground/60 shrink-0 mt-0.5">
                              {formatDistanceToNow(row.date, { addSuffix: true, locale: ptBR })}
                            </span>
                          </div>
                          {row.detail && (
                            <p className="text-xs text-muted-foreground/50 truncate mt-0.5">{row.detail}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {clienteId && (
        <NovaInteracaoModal
          aberto={modalInteracao}
          clienteId={clienteId}
          canalInicial={canalInicial}
          onFechar={() => setModalInteracao(false)}
          onCriada={inter => setInteracoes(prev => [inter, ...prev])}
        />
      )}

      <RegistrarResultadoModal
        aberto={!!resultadoModal}
        sessaoId={resultadoModal?.sessaoId ?? ''}
        nomeCliente={cliente?.nome}
        produto={resultadoModal?.produto}
        onFechar={() => setResultadoModal(null)}
        onRegistrado={(resultado) => {
          setSessoes(prev =>
            prev.map(s =>
              s.id === resultadoModal?.sessaoId
                ? { ...s, resultado }
                : s
            )
          );
          setResultadoModal(null);
        }}
      />


      {/* Confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center" onClick={() => setConfirmDelete(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-xl p-6 w-full max-w-sm mx-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Excluir cliente</h3>
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja excluir <strong>{cliente?.nome}</strong>? Esta ação não pode ser desfeita e todas as interações e sessões associadas serão mantidas sem vínculo.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} disabled={excluindo}>
                Cancelar
              </Button>
              <Button variant="destructive" size="sm" onClick={handleExcluir} disabled={excluindo}>
                {excluindo && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── ViewFields ────────────────────────────────── */

function ViewFields({ cliente }: { cliente: Cliente }) {
  const rows: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [
    { icon: <Phone className="h-3.5 w-3.5" />, label: 'WhatsApp', value: cliente.whatsapp ? <a href={`https://wa.me/${cliente.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">{cliente.whatsapp}</a> : '—' },
    { icon: <Mail className="h-3.5 w-3.5" />, label: 'Email', value: cliente.email ? <a href={`mailto:${cliente.email}`} className="text-primary hover:underline">{cliente.email}</a> : '—' },
    { icon: <Linkedin className="h-3.5 w-3.5" />, label: 'LinkedIn', value: cliente.linkedin_url ? <a href={cliente.linkedin_url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate max-w-[180px] inline-block">Perfil</a> : '—' },
    { icon: <Instagram className="h-3.5 w-3.5" />, label: 'Instagram', value: cliente.instagram_url ? <a href={cliente.instagram_url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate max-w-[180px] inline-block">Perfil</a> : '—' },
    { icon: <UserPlus className="h-3.5 w-3.5" />, label: 'Como conhecemos', value: cliente.como_conhecemos ? COMO_LABEL[cliente.como_conhecemos] || cliente.como_conhecemos : '—' },
    { icon: <Circle className="h-3.5 w-3.5" />, label: 'Status', value: <Badge variant="outline" className={`text-[10px] ${STATUS_CLS[cliente.status] || ''}`}>{STATUS_LABEL[cliente.status] || cliente.status}</Badge> },
    { icon: <Thermometer className="h-3.5 w-3.5" />, label: 'Temperatura', value: (() => { const t = TEMP_BADGE[cliente.temperatura] || TEMP_BADGE.frio; return <Badge variant="secondary" className={`text-[10px] ${t.cls}`}>{t.emoji} {t.label}</Badge>; })() },
    { icon: <Calendar className="h-3.5 w-3.5" />, label: 'Criado em', value: cliente.criado_em ? format(new Date(cliente.criado_em), 'dd/MM/yyyy', { locale: ptBR }) : '—' },
    { icon: <Clock className="h-3.5 w-3.5" />, label: 'Último contato', value: cliente.ultimo_contato_em ? formatDistanceToNow(new Date(cliente.ultimo_contato_em), { addSuffix: true, locale: ptBR }) : '—' },
  ];

  return (
    <>
      <div className="space-y-2.5">
        {rows.map(r => (
          <div key={r.label} className="flex items-center gap-2.5 text-sm">
            <span className="text-muted-foreground shrink-0">{r.icon}</span>
            <span className="text-muted-foreground w-[110px] shrink-0 text-xs">{r.label}</span>
            <span className="text-foreground text-xs">{r.value}</span>
          </div>
        ))}
      </div>

      {cliente.tags && cliente.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2">
          {cliente.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
        </div>
      )}

      {cliente.notas && (
        <div className="mt-3 bg-muted/30 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><StickyNote className="h-3 w-3" /> Notas</div>
          <p className="text-sm text-foreground whitespace-pre-wrap">{cliente.notas}</p>
        </div>
      )}
    </>
  );
}

/* ── EditForm ──────────────────────────────────── */

function EditForm({ form, set, onCancel, onSave, salvando }: {
  form: Record<string, string>; set: (k: string, v: string) => void;
  onCancel: () => void; onSave: () => void; salvando: boolean;
}) {
  const COMO_OPTIONS = [
    { value: 'indicacao', label: 'Indicação' }, { value: 'evento', label: 'Evento' },
    { value: 'linkedin', label: 'LinkedIn' }, { value: 'instagram', label: 'Instagram' },
    { value: 'abordagem_fria', label: 'Abordagem fria' }, { value: 'outros', label: 'Outros' },
  ];

  return (
    <div className="space-y-3">
      <div className="space-y-1"><Label className="text-xs">Nome *</Label><Input value={form.nome} onChange={e => set('nome', e.target.value)} /></div>
      <div className="space-y-1"><Label className="text-xs">Empresa</Label><Input value={form.empresa} onChange={e => set('empresa', e.target.value)} /></div>
      <div className="space-y-1"><Label className="text-xs">WhatsApp</Label><Input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} /></div>
      <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
      <div className="space-y-1"><Label className="text-xs">LinkedIn URL</Label><Input value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} /></div>
      <div className="space-y-1"><Label className="text-xs">Instagram URL</Label><Input value={form.instagram_url} onChange={e => set('instagram_url', e.target.value)} /></div>
      <div className="space-y-1">
        <Label className="text-xs">Como conhecemos</Label>
        <Select value={form.como_conhecemos} onValueChange={v => set('como_conhecemos', v)}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>{COMO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Status</Label>
        <Select value={form.status} onValueChange={v => set('status', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{(Object.entries(STATUS_LABEL)).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label className="text-xs">Notas</Label><Textarea rows={3} value={form.notas} onChange={e => set('notas', e.target.value)} /></div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={salvando}>Cancelar</Button>
        <Button size="sm" onClick={onSave} disabled={salvando}>
          {salvando && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />} Salvar
        </Button>
      </div>
    </div>
  );
}

/* ── SessaoItem ────────────────────────────────── */

function SessaoItem({ sessao, onRegistrarResultado }: { sessao: SessaoVenda; onRegistrarResultado: () => void; onVerRoteiro?: (s: SessaoVenda) => void }) {
  const navigate = useNavigate();
  const statusLabel = sessao.roteiro_aprovado === true && sessao.proposta_gerada_em
    ? 'Proposta completa'
    : sessao.roteiro_aprovado === true
    ? 'Roteiro aprovado'
    : sessao.roteiro_aprovado === false
    ? 'Roteiro rejeitado'
    : 'Roteiro pendente';

  const statusCls = sessao.roteiro_aprovado === true && sessao.proposta_gerada_em
    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    : sessao.roteiro_aprovado === true
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    : sessao.roteiro_aprovado === false
    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    : 'bg-muted text-muted-foreground';

  const resBadge: Record<string, { label: string; cls: string }> = {
    converteu: { label: '✓ Converteu', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40' },
    nao_converteu: { label: '✗ Não converteu', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40' },
    em_andamento: { label: '● Em andamento', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40' },
  };
  const res = sessao.resultado ? resBadge[sessao.resultado] : null;

  return (
    <div
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => navigate(`/roteiro/${sessao.id}`)}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">{sessao.produto || 'Sem produto'}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {sessao.criado_em ? format(new Date(sessao.criado_em), 'dd/MM/yyyy') : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className={`text-[10px] ${statusCls}`}>{statusLabel}</Badge>
          {sessao.contexto && <Badge variant="outline" className="text-[10px]">{sessao.contexto.toUpperCase()}</Badge>}
          {res && <Badge variant="secondary" className={`text-[10px] ${res.cls}`}>{res.label}</Badge>}
          {!sessao.resultado && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={e => { e.stopPropagation(); onRegistrarResultado(); }}
            >
              <ClipboardCheck className="h-3 w-3 mr-0.5" /> Registrar
            </Button>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );
}

/* ── InteracaoCard ─────────────────────────────── */

function InteracaoCard({ interacao, isLast }: { interacao: Interacao; isLast: boolean }) {
  const [expandido, setExpandido] = useState(false);
  const dot = CANAL_DOT[interacao.canal as InteracaoCanal] || 'bg-gray-400';
  const label = CANAL_LABEL[interacao.canal as InteracaoCanal] || interacao.canal;

  const conteudo = interacao.conteudo || '';
  const longo = conteudo.length > 200;
  const textoVisivel = !expandido && longo ? conteudo.slice(0, 200) + '...' : conteudo;
  const isItalic = interacao.canal === 'roteiro' || interacao.canal === 'proposta';

  return (
    <div className="flex gap-3 pb-4">
      {/* Line + dot */}
      <div className="flex flex-col items-center">
        <div className={`h-3 w-3 rounded-full ${dot} shrink-0 mt-1`} />
        {!isLast && <div className="flex-1 w-px bg-border mt-1" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{label}</span>
          {interacao.criado_em && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(interacao.criado_em), { addSuffix: true, locale: ptBR })}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {format(new Date(interacao.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </TooltipContent>
            </Tooltip>
          )}
          {interacao.canal === 'ligacao' && interacao.duracao_minutos && (
            <Badge variant="secondary" className="text-[10px]">{interacao.duracao_minutos} min</Badge>
          )}
        </div>

        {interacao.titulo && <p className="text-sm text-foreground">{interacao.titulo}</p>}

        {conteudo && (
          <div>
            <p className={`text-sm ${isItalic ? 'italic text-muted-foreground' : 'text-foreground'} whitespace-pre-wrap`}>
              {textoVisivel}
            </p>
            {longo && (
              <button onClick={() => setExpandido(!expandido)} className="text-xs text-primary hover:underline mt-0.5">
                {expandido ? 'Ver menos' : 'Ver mais'}
              </button>
            )}
          </div>
        )}

        {interacao.resultado && (
          <Badge variant="outline" className="text-[10px]">{interacao.resultado}</Badge>
        )}

        {interacao.resumo_ia && (
          <div className="bg-muted/50 rounded p-2 flex items-start gap-1.5 mt-1">
            <Sparkles className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">{interacao.resumo_ia}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── RoteiroAccordion ──────────────────────────── */

import type { RoteiroJSON } from '@/types/crm';

const ETAPAS_CONFIG = [
  { key: 'abertura', label: 'Abertura', icon: '👋' },
  { key: 'descoberta', label: 'Descoberta', icon: '🔍' },
  { key: 'apresentacao_solucao', label: 'Solução', icon: '💡' },
  { key: 'tratamento_objecoes', label: 'Objeções', icon: '🛡️' },
  { key: 'fechamento', label: 'Fechamento', icon: '🤝' },
] as const;

function RoteiroAccordion({ roteiro }: { roteiro: RoteiroJSON }) {
  const r = roteiro.roteiro_reuniao;

  // Handle both array (new) and object (legacy) formats
  if (Array.isArray(r)) {
    return (
      <Accordion type="single" collapsible defaultValue="bloco-0">
        {r.map((bloco, i) => (
          <AccordionItem key={i} value={`bloco-${i}`}>
            <AccordionTrigger className="hover:no-underline text-sm">
              <span className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{bloco.numero}</span>
                <span className="font-medium">{bloco.titulo}</span>
                <Badge variant="secondary" className="text-[10px] ml-1">{bloco.tempo}</Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <p className="whitespace-pre-wrap">{bloco.script}</p>
              {bloco.tecnica && (
                <div className="flex items-start gap-2 mt-2">
                  <Badge variant="secondary" className="text-[10px] shrink-0">{bloco.tecnica}</Badge>
                  <p className="text-xs text-muted-foreground">{bloco.nota_tecnica}</p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  }

  const etapasMap: Record<string, RoteiroEtapa> = {
    abertura: r.abertura,
    descoberta: r.descoberta,
    apresentacao_solucao: r.apresentacao_solucao,
    tratamento_objecoes: r.tratamento_objecoes,
    fechamento: r.fechamento,
  };

  return (
    <Accordion type="single" collapsible defaultValue="abertura">
      {ETAPAS_CONFIG.map(({ key, label, icon }) => {
        const etapa = etapasMap[key];
        if (!etapa) return null;
        return (
          <AccordionItem key={key} value={key}>
            <AccordionTrigger className="hover:no-underline text-sm">
              <span className="flex items-center gap-2">
                <span>{icon}</span>
                <span className="font-medium">{label}</span>
                <Badge variant="secondary" className="text-[10px] ml-1">{etapa.duracao_min} min</Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <p><span className="font-medium text-foreground">Objetivo:</span> {etapa.objetivo}</p>
              {etapa.script && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Script</p>
                  <p className="whitespace-pre-wrap">{etapa.script}</p>
                </div>
              )}
              {etapa.perguntas && etapa.perguntas.length > 0 && (
                <ul className="list-disc pl-5 space-y-1">
                  {etapa.perguntas.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              )}
              {key === 'tratamento_objecoes' && etapa.objecoes_previstas && (
                <div className="space-y-2">
                  {etapa.objecoes_previstas.map((o, i) => (
                    <div key={i} className="bg-muted/50 rounded p-2 space-y-1">
                      <p className="text-xs font-medium">❓ {o.objecao}</p>
                      <p className="text-xs text-muted-foreground">{o.resposta}</p>
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

/* ── CopyButton ────────────────────────────────── */

function CopyBtn({ onClick }: { onClick: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex justify-end pt-2">
      <Button
        variant="outline"
        size="sm"
        className="rounded-lg gap-1.5 text-xs"
        onClick={() => { onClick(); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? 'Copiado' : 'Copiar'}
      </Button>
    </div>
  );
}

/* ── CrmSessaoDrawerContent ────────────────────── */

function CrmSessaoDrawerContent({ sessao, onSessaoUpdated }: {
  sessao: SessaoVenda;
  onSessaoUpdated: (s: SessaoVenda) => void;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const roteiro = sessao.roteiro_json as any;
  const proposta = sessao.proposta_json as any;
  const email = sessao.email_json as any;
  const objecoes = (sessao.objecoes_json as any[]) || [];
  const whatsapp = sessao.whatsapp_json as any;
  const mensagensConfirmacao = sessao.mensagens_confirmacao_json as MensagensConfirmacao | undefined;
  const followUp = sessao.follow_up_json as FollowUpItem[] | undefined;

  const hasRoteiro = !!roteiro;
  const hasProposta = !!proposta;
  const hasEmail = !!email;
  const hasObjecoes = objecoes.length > 0;
  const hasWhatsapp = !!whatsapp;
  const hasSetup = !!mensagensConfirmacao || (followUp && followUp.length > 0);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  }, []);

  const startEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const saveEdit = async (jsonField: 'email_json' | 'proposta_json' | 'whatsapp_json', path: string) => {
    setSaving(true);
    try {
      const currentJson = sessao[jsonField] as any;
      const updated = { ...currentJson };
      // Support nested paths like "corpo"
      updated[path] = editValue;
      const { error } = await supabase.from('sessoes_venda').update({ [jsonField]: updated }).eq('id', sessao.id);
      if (error) throw error;
      const updatedSessao = { ...sessao, [jsonField]: updated } as SessaoVenda;
      onSessaoUpdated(updatedSessao);
      setEditingField(null);
      toast.success('Salvo!');
    } catch (err) {
      toast.error('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (!hasRoteiro && !hasProposta && !hasEmail) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Conteúdo não disponível para esta sessão.</p>
      </div>
    );
  }

  // Context info
  const produtoNome = (() => {
    const txt = sessao.produto || '';
    // Take only the first line or first 80 chars
    const firstLine = txt.split('\n')[0].trim();
    return firstLine.length > 80 ? firstLine.slice(0, 80) + '…' : firstLine;
  })();
  const titulo = [produtoNome, sessao.preco ? `R$${Number(sessao.preco).toLocaleString('pt-BR')}` : null].filter(Boolean).join(' · ');
  const subtitulo = sessao.nicho ? `— ${sessao.nicho}` : '';
  const resumo = roteiro?.resumo_estrategico;
  const perfilDecisor = roteiro?.perfil_decisor;

  // Insight chips
  const insightChips = [
    { label: 'MAIOR MEDO', value: roteiro?.maior_medo },
    { label: 'DECISÃO', value: roteiro?.decisao_style || roteiro?.decisao },
    { label: 'TOM IDEAL', value: roteiro?.tom_ideal },
  ].filter(c => c.value);

  // Normalize roteiro blocks
  const roteiroBlocks: any[] = (() => {
    if (!roteiro?.roteiro_reuniao) return [];
    if (Array.isArray(roteiro.roteiro_reuniao)) return roteiro.roteiro_reuniao;
    const r = roteiro.roteiro_reuniao;
    const legacyOrder = [
      { key: 'abertura', label: 'Abertura', num: 1 },
      { key: 'descoberta', label: 'Descoberta', num: 2 },
      { key: 'apresentacao_solucao', label: 'Apresentação da Solução', num: 3 },
      { key: 'tratamento_objecoes', label: 'Tratamento de Objeções', num: 4 },
      { key: 'fechamento', label: 'Fechamento', num: 5 },
    ];
    return legacyOrder
      .filter(e => r[e.key])
      .map(e => ({
        numero: e.num,
        titulo: e.label,
        tempo: `${r[e.key].duracao_min} min`,
        script: r[e.key].script || r[e.key].objetivo || '',
        tecnica: r[e.key].tecnicas?.[0] || '',
        nota_tecnica: '',
        perguntas: r[e.key].perguntas,
        pontos_chave: r[e.key].pontos_chave,
      }));
  })();

  const defaultTab = hasRoteiro && roteiroBlocks.length > 0 ? 'roteiro' : hasProposta ? 'proposta' : 'email';

  return (
    <div className="space-y-5">
      {/* Context Card */}
      {(titulo || perfilDecisor || resumo) && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-2">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                {titulo} {subtitulo && <span className="font-normal text-muted-foreground">{subtitulo}</span>}
              </h3>
              {perfilDecisor && (
                <p className="text-sm text-foreground leading-relaxed">
                  <span className="text-primary font-semibold">Perfil do decisor:</span> {perfilDecisor}
                </p>
              )}
              {resumo && !perfilDecisor && (
                <p className="text-sm text-muted-foreground leading-relaxed">{resumo}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Insight Chips */}
      {insightChips.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {insightChips.map(chip => (
            <div key={chip.label} className="border border-border rounded-lg p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">{chip.label}</p>
              <p className="text-sm text-foreground leading-snug">{chip.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="bg-transparent border-0 p-0 h-auto gap-2 mb-4 justify-start flex-wrap">
          {hasRoteiro && roteiroBlocks.length > 0 && (
            <TabsTrigger value="roteiro" className="rounded-lg border border-border bg-card data-[state=active]:bg-muted data-[state=active]:border-foreground/20 text-sm px-4 py-2 shadow-none">
              Roteiro
            </TabsTrigger>
          )}
          {hasProposta && (
            <TabsTrigger value="proposta" className="rounded-lg border border-border bg-card data-[state=active]:bg-muted data-[state=active]:border-foreground/20 text-sm px-4 py-2 shadow-none">
              Proposta
            </TabsTrigger>
          )}
          {hasEmail && (
            <TabsTrigger value="email" className="rounded-lg border border-border bg-card data-[state=active]:bg-muted data-[state=active]:border-foreground/20 text-sm px-4 py-2 shadow-none">
              E-mail
            </TabsTrigger>
          )}
          {hasWhatsapp && (
            <TabsTrigger value="whatsapp" className="rounded-lg border border-border bg-card data-[state=active]:bg-muted data-[state=active]:border-foreground/20 text-sm px-4 py-2 shadow-none">
              WhatsApp
            </TabsTrigger>
          )}
          {hasObjecoes && (
            <TabsTrigger value="objecoes" className="rounded-lg border border-border bg-card data-[state=active]:bg-muted data-[state=active]:border-foreground/20 text-sm px-4 py-2 shadow-none">
              Objeções
            </TabsTrigger>
          )}
          {hasSetup && (
            <TabsTrigger value="setup" className="rounded-lg border border-border bg-card data-[state=active]:bg-muted data-[state=active]:border-foreground/20 text-sm px-4 py-2 shadow-none">
              📋 Setup
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab: Roteiro */}
        {hasRoteiro && roteiroBlocks.length > 0 && (
          <TabsContent value="roteiro">
            <div className="space-y-0 divide-y divide-border border border-border rounded-xl overflow-hidden">
              {roteiroBlocks.map((bloco: any, i: number) => (
                <div key={i} className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
                        {bloco.numero}
                      </span>
                      <h4 className="text-sm font-semibold text-foreground leading-snug">{bloco.titulo}</h4>
                    </div>
                    <span className="text-xs text-primary font-medium shrink-0">{bloco.tempo}</span>
                  </div>
                  {bloco.script && (
                    <div className="pl-10 space-y-2">
                      <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: formatScript(bloco.script) }} />
                    </div>
                  )}
                  {bloco.perguntas?.length > 0 && (
                    <div className="pl-10 space-y-1">
                      {bloco.perguntas.map((p: string, pi: number) => (
                        <p key={pi} className="text-sm text-foreground">P{pi + 1}: "{p}"</p>
                      ))}
                    </div>
                  )}
                  {bloco.pontos_chave?.length > 0 && (
                    <div className="pl-10">
                      <ul className="list-disc pl-4 space-y-1">
                        {bloco.pontos_chave.map((p: string, pi: number) => (
                          <li key={pi} className="text-sm text-foreground">{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {bloco.tecnica && (
                    <div className="pl-10 flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                      <Badge variant="secondary" className="shrink-0 text-[10px] rounded-md">{bloco.tecnica}</Badge>
                      {bloco.nota_tecnica && <p className="text-xs text-muted-foreground leading-relaxed">{bloco.nota_tecnica}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {roteiro.alerta_terceiro && (
              <div className="mt-4 flex items-start gap-2 border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800 rounded-lg p-3">
                <span className="text-sm">⚠️</span>
                <p className="text-sm text-foreground">{roteiro.alerta_terceiro}</p>
              </div>
            )}
            <CopyBtn onClick={() => {
              const text = roteiroBlocks.map((b: any) => `${b.numero}. ${b.titulo} (${b.tempo})\n${b.script}`).join('\n\n');
              copyToClipboard(text);
            }} />
          </TabsContent>
        )}

        {/* Tab: Proposta */}
        {hasProposta && (
          <TabsContent value="proposta">
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Estrutura da proposta</h3>
                {editingField !== 'proposta_intro' && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => startEdit('proposta_intro', proposta.abertura || proposta.introducao || '')}>
                    <Edit2 className="h-3 w-3" /> Editar
                  </Button>
                )}
              </div>
              <div className="p-5 space-y-5 text-sm text-foreground">
                {editingField === 'proposta_intro' ? (
                  <div className="space-y-2">
                    <Textarea rows={6} value={editValue} onChange={e => setEditValue(e.target.value)} className="text-sm" />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditingField(null)} disabled={saving}>Cancelar</Button>
                      <Button size="sm" disabled={saving} onClick={() => saveEdit('proposta_json', proposta.abertura ? 'abertura' : 'introducao')}>
                        {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />} Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const sections: { num: number; title: string; content: string | undefined }[] = [
                        { num: 1, title: 'ABERTURA', content: proposta.abertura || proposta.introducao },
                        { num: 2, title: 'O CENÁRIO ATUAL', content: proposta.diagnostico },
                        { num: 3, title: 'O QUE ENTREGAMOS', content: proposta.solucao },
                      ];
                      const beneficiosText = proposta.beneficios?.map((b: string) => `→ ${b}`).join('\n');
                      const extraSections: { num: number; title: string; content: string | undefined }[] = [];
                      if (proposta.investimento) {
                        const inv = proposta.investimento;
                        const parts = [inv.valor, inv.condicoes, inv.garantia ? `Garantia: ${inv.garantia}` : ''].filter(Boolean);
                        extraSections.push({ num: sections.length + (beneficiosText ? 2 : 1), title: 'INVESTIMENTO', content: parts.join('\n') });
                      }
                      if (proposta.fechamento) {
                        extraSections.push({ num: sections.length + (beneficiosText ? 2 : 1) + extraSections.length + 1, title: 'FECHAMENTO', content: proposta.fechamento });
                      }
                      return (
                        <>
                          {sections.filter(s => s.content).map(s => (
                            <div key={s.num}>
                              <p className="font-semibold mb-1">{s.num}. {s.title}</p>
                              <p className="whitespace-pre-wrap leading-relaxed">{s.content}</p>
                            </div>
                          ))}
                          {beneficiosText && (
                            <div>
                              <p className="font-semibold mb-1">{sections.filter(s => s.content).length + 1}. BENEFÍCIOS</p>
                              <p className="whitespace-pre-wrap leading-relaxed">{beneficiosText}</p>
                            </div>
                          )}
                          {extraSections.map(s => (
                            <div key={s.num}>
                              <p className="font-semibold mb-1">{s.num}. {s.title}</p>
                              <p className="whitespace-pre-wrap leading-relaxed">{s.content}</p>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
            <CopyBtn onClick={() => {
              const text = [proposta.titulo, proposta.abertura || proposta.introducao, proposta.diagnostico, proposta.solucao, proposta.beneficios?.map((b: string) => `→ ${b}`).join('\n'), proposta.investimento?.valor, proposta.fechamento].filter(Boolean).join('\n\n');
              copyToClipboard(text);
            }} />
          </TabsContent>
        )}

        {/* Tab: Email */}
        {hasEmail && (
          <TabsContent value="email">
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/30 space-y-1 text-sm">
                <div className="flex gap-3 items-center justify-between">
                  <div className="flex gap-3">
                    <span className="text-muted-foreground w-14 shrink-0">Assunto</span>
                    <span className="font-semibold text-foreground">{email.assunto}</span>
                  </div>
                  {editingField !== 'email_corpo' && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => startEdit('email_corpo', email.corpo || '')}>
                      <Edit2 className="h-3 w-3" /> Editar
                    </Button>
                  )}
                </div>
                {email.para && (
                  <div className="flex gap-3">
                    <span className="text-muted-foreground w-14 shrink-0">Para</span>
                    <span className="text-foreground">{email.para}</span>
                  </div>
                )}
              </div>
              <div className="p-5 space-y-4 text-sm text-foreground leading-relaxed">
                {editingField === 'email_corpo' ? (
                  <div className="space-y-2">
                    <Textarea rows={10} value={editValue} onChange={e => setEditValue(e.target.value)} className="text-sm" />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditingField(null)} disabled={saving}>Cancelar</Button>
                      <Button size="sm" disabled={saving} onClick={() => saveEdit('email_json', 'corpo')}>
                        {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />} Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {email.saudacao && <p>{email.saudacao}</p>}
                    {email.corpo && (
                      <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: renderHighlightsSimple(email.corpo) }} />
                    )}
                    {email.destaque_1 && (
                      <div className="bg-primary/10 rounded-md px-3 py-2"><p>{email.destaque_1}</p></div>
                    )}
                    {email.destaque_2 && (
                      <div className="bg-orange-100 dark:bg-orange-900/20 rounded-md px-3 py-2"><p>{email.destaque_2}</p></div>
                    )}
                    {email.cta && (
                      <div className="bg-primary/10 rounded-md px-3 py-2 inline-block"><p>{email.cta}</p></div>
                    )}
                    {email.assinatura && <p className="text-muted-foreground">{email.assinatura}</p>}
                  </>
                )}
              </div>
            </div>
            <CopyBtn onClick={() => copyToClipboard(`Assunto: ${email.assunto}\n\n${email.saudacao || ''}\n\n${email.corpo}\n\n${email.cta || ''}\n\n${email.assinatura || ''}`)} />
          </TabsContent>
        )}

        {/* Tab: WhatsApp */}
        {hasWhatsapp && (
          <TabsContent value="whatsapp">
            <div className="space-y-4">
              <div className="border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-foreground">Mensagem principal</h4>
                  {editingField !== 'whatsapp_principal' && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => startEdit('whatsapp_principal', whatsapp.mensagem_principal || '')}>
                      <Edit2 className="h-3 w-3" /> Editar
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-3">Cole diretamente no WhatsApp</p>
                {editingField === 'whatsapp_principal' ? (
                  <div className="space-y-2">
                    <Textarea rows={6} value={editValue} onChange={e => setEditValue(e.target.value)} className="text-sm" />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditingField(null)} disabled={saving}>Cancelar</Button>
                      <Button size="sm" disabled={saving} onClick={() => saveEdit('whatsapp_json', 'mensagem_principal')}>
                        {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />} Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/50 rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{whatsapp.mensagem_principal}</div>
                )}
                <div className="mt-3">
                  <CopyBtn onClick={() => copyToClipboard(whatsapp.mensagem_principal)} />
                </div>
              </div>
              {whatsapp.versao_curta && (
                <div className="border border-border rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-1">Versão curta</h4>
                  <p className="text-xs text-muted-foreground mb-3">Para quando ele não respondeu</p>
                  <div className="bg-muted/50 rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{whatsapp.versao_curta}</div>
                  <div className="mt-3">
                    <CopyBtn onClick={() => copyToClipboard(whatsapp.versao_curta)} />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {/* Tab: Objeções */}
        {hasObjecoes && (
          <TabsContent value="objecoes">
            <div className="space-y-3">
              {objecoes.map((o: any, i: number) => (
                <div key={i} className="border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">"{o.objecao}"</p>
                    {o.categoria && <Badge variant="secondary" className="text-[10px] shrink-0">{o.categoria}</Badge>}
                  </div>
                  {o.tecnica && <p className="text-xs text-muted-foreground">Técnica: <span className="font-medium">{o.tecnica}</span></p>}
                  <p className="text-sm italic text-muted-foreground">{o.resposta_curta}</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{o.resposta_completa}</p>
                  {o.se_terceiro && (
                    <div className="bg-muted/50 rounded-lg p-3 mt-1">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Se terceiro presente:</p>
                      <p className="text-sm text-foreground">{o.se_terceiro}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        {/* Tab: Setup */}
        {hasSetup && (
          <TabsContent value="setup">
            <CrmSetupTab mensagensConfirmacao={mensagensConfirmacao} followUp={followUp} copyToClipboard={copyToClipboard} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/* ── CrmSetupTab ── */

const FOLLOW_UP_BADGES = ['Combinado', '+3 dias', '+7 dias', 'Encerramento'];

function CrmSetupTab({
  mensagensConfirmacao,
  followUp,
  copyToClipboard,
}: {
  mensagensConfirmacao?: MensagensConfirmacao;
  followUp?: FollowUpItem[];
  copyToClipboard: (text: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Confirmações */}
      {mensagensConfirmacao && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" /> Confirmações
          </h4>

          <div className="border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-medium text-foreground">📅 1 dia antes da reunião</h5>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => copyToClipboard(mensagensConfirmacao.d1)}>
                <Copy className="h-3 w-3" /> Copiar
              </Button>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-muted/50 rounded-lg p-4">
              {mensagensConfirmacao.d1}
            </p>
          </div>

          <div className="border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-medium text-foreground">⏰ 10 minutos antes</h5>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => copyToClipboard(mensagensConfirmacao.d0_10min)}>
                <Copy className="h-3 w-3" /> Copiar
              </Button>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-muted/50 rounded-lg p-4">
              {mensagensConfirmacao.d0_10min}
            </p>
          </div>
        </div>
      )}

      {/* Follow-up */}
      {followUp && followUp.length > 0 && (
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <RotateCw className="h-4 w-4 text-primary" /> Follow-up pós-reunião
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">Se não fechar na call — envie nesta ordem</p>
          </div>

          {followUp.map((item, idx) => (
            <div key={idx} className="border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  <Send className="h-3 w-3 mr-1" /> {FOLLOW_UP_BADGES[idx] || item.momento}
                </Badge>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => copyToClipboard(item.mensagem)}>
                  <Copy className="h-3 w-3" /> Copiar
                </Button>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-muted/50 rounded-lg p-4">
                {item.mensagem}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
