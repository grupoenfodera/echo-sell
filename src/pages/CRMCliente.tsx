import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import Header from '@/components/Header';
import NovaInteracaoModal from '@/components/crm/NovaInteracaoModal';
import RegistrarResultadoModal from '@/components/crm/RegistrarResultadoModal';
import { svpApi } from '@/lib/api-svp';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Cliente, SessaoVenda, Interacao, InteracaoCanal, ClienteStatus, ClienteTemperatura, RoteiroEtapa,
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Edit2, Plus, Phone, Mail, Linkedin, Instagram, UserPlus,
  Circle, Thermometer, Calendar, Clock, StickyNote, FileText, ChevronRight,
  Sparkles, Loader2, AlertCircle, MessageSquare, ClipboardCheck, X, Trash2,
} from 'lucide-react';

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
  proposta_enviada: 'border-purple-400 text-purple-700 dark:text-purple-300',
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
  reuniao: 'bg-purple-500', nota: 'bg-gray-400', roteiro: 'bg-indigo-500',
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
  const [sessaoAberta, setSessaoAberta] = useState<SessaoVenda | null>(null);
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

  const interacoesFiltradas = filtroCanal === 'todos'
    ? interacoes
    : interacoes.filter(i => i.canal === filtroCanal);

  if (carregando) {
    return (
      <>
        <Header />
        <main className="pt-[70px] pb-16 px-4 sm:px-6">
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
        <Header />
        <main className="pt-[70px] pb-16 px-4 sm:px-6">
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
      <Header />
      <main className="pt-[70px] pb-16 px-4 sm:px-6">
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
                          onVerRoteiro={(sess) => setSessaoAberta(sess)}
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
                  <Badge variant="secondary" className="text-xs">{interacoes.length}</Badge>
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
              {interacoesFiltradas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma interação encontrada.</p>
              ) : (
                <div className="relative">
                  {interacoesFiltradas.map((inter, idx) => (
                    <InteracaoCard key={inter.id} interacao={inter} isLast={idx === interacoesFiltradas.length - 1} />
                  ))}
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

      {/* Drawer de Roteiro */}
      {sessaoAberta && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setSessaoAberta(null)}>
          <div
            onClick={e => e.stopPropagation()}
            className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
          >
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-base font-semibold text-foreground">{sessaoAberta.produto || 'Roteiro'}</h2>
                <p className="text-xs text-muted-foreground">
                  {sessaoAberta.nicho && `${sessaoAberta.nicho} · `}
                  {sessaoAberta.criado_em ? format(new Date(sessaoAberta.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
                  {sessaoAberta.roteiro_json?.score && ` · Score ${sessaoAberta.roteiro_json.score}/100`}
                </p>
              </div>
              <button onClick={() => setSessaoAberta(null)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!sessaoAberta.roteiro_json ? (
                <p className="text-sm text-muted-foreground text-center py-8">Roteiro não disponível para esta sessão.</p>
              ) : (
                <>
                  {sessaoAberta.roteiro_json.resumo_estrategico && (
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Estratégia</p>
                      <p className="text-sm text-foreground">{sessaoAberta.roteiro_json.resumo_estrategico}</p>
                    </div>
                  )}
                  <RoteiroAccordion roteiro={sessaoAberta.roteiro_json} />
                </>
              )}

              {sessaoAberta.proposta_json && (
                <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Proposta</p>
                  <p className="text-sm font-semibold text-foreground">{sessaoAberta.proposta_json.titulo}</p>
                  <p className="text-sm text-foreground">{sessaoAberta.proposta_json.introducao}</p>
                </div>
              )}

              {sessaoAberta.email_json && (
                <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Email de Follow-up</p>
                  <p className="text-sm font-medium text-foreground">{sessaoAberta.email_json.assunto}</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{sessaoAberta.email_json.corpo}</p>
                </div>
              )}
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

function SessaoItem({ sessao, onRegistrarResultado, onVerRoteiro }: { sessao: SessaoVenda; onRegistrarResultado: () => void; onVerRoteiro: (s: SessaoVenda) => void }) {
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
      onClick={() => {
        console.log('Sessao clicada:', sessao.id, 'roteiro_json:', !!sessao.roteiro_json, typeof sessao.roteiro_json);
        onVerRoteiro(sessao);
      }}
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
