import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Header from '@/components/Header';
import { svpApi } from '@/lib/api-svp';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Cliente, ClienteStatus, ClienteTemperatura, SessaoResultado } from '@/types/crm';
import RegistrarResultadoModal from '@/components/crm/RegistrarResultadoModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Search, Plus, Users, FileText, Clock, Loader2, AlertCircle, MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';

/* ── Constantes ────────────────────────────────── */

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

const RESULTADO_BADGE: Record<string, { label: string; cls: string }> = {
  converteu: { label: '✓ Converteu', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  nao_converteu: { label: '✗ Não converteu', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  em_andamento: { label: '● Em andamento', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
};

const COMO_OPTIONS = [
  { value: 'indicacao', label: 'Indicação' },
  { value: 'evento', label: 'Evento' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'abordagem_fria', label: 'Abordagem fria' },
  { value: 'outros', label: 'Outros' },
];

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
  const [resultadoModal, setResultadoModal] = useState<{
    sessaoId: string;
    nomeCliente: string;
    produto?: string;
  } | null>(null);

  const carregarClientes = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await svpApi.listarClientes(1, 200);
      setClientes(res.clientes);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar clientes.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregarClientes(); }, []);

  const filtroAtivo = busca !== '' || filtroStatus !== 'todos' || filtroTemp !== 'todos';

  const clientesFiltrados = clientes.filter(c => {
    if (busca) {
      const q = busca.toLowerCase();
      if (!c.nome.toLowerCase().includes(q) && !(c.empresa || '').toLowerCase().includes(q)) return false;
    }
    if (filtroStatus !== 'todos' && c.status !== filtroStatus) return false;
    if (filtroTemp !== 'todos' && c.temperatura !== filtroTemp) return false;
    return true;
  });

  const limparFiltros = () => { setBusca(''); setFiltroStatus('todos'); setFiltroTemp('todos'); };

  return (
    <>
      <Header />
      <main className="pt-[70px] pb-16 px-4 sm:px-6">
        <div className="max-w-[1100px] mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">CRM</h1>
              <p className="text-sm text-muted-foreground">Seus clientes e oportunidades</p>
            </div>
            <Button onClick={() => setModalAberto(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Novo Cliente
            </Button>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou empresa..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroStatus} onValueChange={v => setFiltroStatus(v as ClienteStatus | 'todos')}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {(Object.keys(STATUS_LABEL) as ClienteStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <p className="text-sm text-muted-foreground">
            {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? 's' : ''} encontrado{clientesFiltrados.length !== 1 ? 's' : ''}
          </p>

          {/* Content */}
          {carregando ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>
                  <Skeleton className="h-5 w-20" /><Skeleton className="h-3 w-full" />
                </CardContent></Card>
              ))}
            </div>
          ) : erro ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center space-y-3">
              <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
              <p className="text-sm text-destructive">{erro}</p>
              <Button variant="outline" size="sm" onClick={carregarClientes}>Tentar novamente</Button>
            </div>
          ) : clientesFiltrados.length === 0 ? (
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
                <ClienteCard
                  key={c.id}
                  cliente={c}
                  onClick={() => navigate(`/crm/${c.id}`)}
                  onRegistrarResultado={
                    c.ultima_sessao && !c.ultima_sessao.resultado &&
                    c.ultima_sessao.criado_em &&
                    differenceInDays(new Date(), new Date(c.ultima_sessao.criado_em)) >= 1
                      ? () => setResultadoModal({
                          sessaoId: c.ultima_sessao!.id,
                          nomeCliente: c.nome,
                          produto: c.ultima_sessao!.produto,
                        })
                      : undefined
                  }
                />
              ))}
            </div>
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
        onRegistrado={(resultado) => {
          setClientes(prev =>
            prev.map(c =>
              c.ultima_sessao?.id === resultadoModal?.sessaoId
                ? { ...c, ultima_sessao: { ...c.ultima_sessao!, resultado } }
                : c
            )
          );
          setResultadoModal(null);
        }}
      />
    </>
  );
}

/* ── ClienteCard ───────────────────────────────── */

function ClienteCard({ cliente, onClick, onRegistrarResultado }: { cliente: Cliente; onClick: () => void; onRegistrarResultado?: () => void }) {
  const temp = TEMP_BADGE[cliente.temperatura] || TEMP_BADGE.frio;
  const statusCls = STATUS_CLS[cliente.status] || STATUS_CLS.novo;
  const statusLabel = STATUS_LABEL[cliente.status] || cliente.status;
  const initials = cliente.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const resultado = cliente.ultima_sessao?.resultado;
  const resBadge = resultado ? RESULTADO_BADGE[resultado] : null;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-5 space-y-3">
        {/* Top */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{cliente.nome}</p>
            {cliente.empresa && (
              <p className="text-xs text-muted-foreground truncate">{cliente.empresa}</p>
            )}
          </div>
          <Badge variant="secondary" className={`text-[10px] shrink-0 ${temp.cls}`}>
            {temp.emoji} {temp.label}
          </Badge>
        </div>

        {/* Middle */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] ${statusCls}`}>
            {statusLabel}
          </Badge>
          {cliente.ultima_sessao?.produto && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" /> {cliente.ultima_sessao.produto}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {cliente.ultimo_contato_em
              ? `Último contato ${formatDistanceToNow(new Date(cliente.ultimo_contato_em), { addSuffix: true, locale: ptBR })}`
              : 'Sem contato registrado'}
          </span>
          {resBadge && (
            <Badge variant="secondary" className={`text-[10px] ${resBadge.cls}`}>
              {resBadge.label}
            </Badge>
          )}
          {!resBadge && onRegistrarResultado && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={e => { e.stopPropagation(); onRegistrarResultado(); }}
            >
              <MessageSquare className="h-3 w-3 mr-0.5" /> Como foi?
            </Button>
          )}
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
          {erroModal && (
            <p className="text-sm text-destructive">{erroModal}</p>
          )}
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
