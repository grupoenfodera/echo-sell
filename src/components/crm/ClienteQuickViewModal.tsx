import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { svpApi } from '@/lib/api-svp';
import type { Cliente, SessaoVenda, Interacao, ClienteTemperatura } from '@/types/crm';
import NovaInteracaoModal from './NovaInteracaoModal';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageSquare, Mail, MapPin, Clock, CalendarDays, ClipboardList,
  Pencil, ChevronRight, Plus, Loader2, Phone, FileText, Shield, Send,
} from 'lucide-react';
import { toast } from 'sonner';

const TEMP_BADGE: Record<ClienteTemperatura, { emoji: string; label: string; cls: string }> = {
  frio:     { emoji: '🔵', label: 'Frio',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  morno:    { emoji: '🟡', label: 'Morno',    cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  ativo:    { emoji: '🔥', label: 'Quente',   cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  em_risco: { emoji: '🔴', label: 'Em risco', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo Lead',
  em_contato: 'Roteiro Pronto',
  proposta_enviada: 'Proposta Enviada',
  negociacao: 'Follow-up',
  ganho: 'Fechado — Ganho',
  perdido: 'Fechado — Perdido',
};

type PecaTipo = 'proposta' | 'email' | 'whatsapp' | 'objecoes';

const PECAS: { tipo: PecaTipo; label: string; icon: React.ElementType; jsonKey: string }[] = [
  { tipo: 'proposta', label: 'Proposta', icon: FileText,      jsonKey: 'proposta_json' },
  { tipo: 'email',    label: 'E-mail',   icon: Mail,          jsonKey: 'email_json' },
  { tipo: 'whatsapp', label: 'WhatsApp', icon: Send,          jsonKey: 'whatsapp_json' },
  { tipo: 'objecoes', label: 'Objeções', icon: Shield,        jsonKey: 'objecoes_json' },
];

const CANAL_ICON: Record<string, React.ElementType> = {
  roteiro: ClipboardList,
  proposta: FileText,
  email: Mail,
  whatsapp: MessageSquare,
  objecoes: Shield,
  ligacao: Phone,
  reuniao: CalendarDays,
  nota: ClipboardList,
  transcricao: FileText,
};

const CANAL_LABEL: Record<string, string> = {
  roteiro: 'Roteiro gerado',
  proposta: 'Proposta comercial',
  email: 'E-mail de follow-up',
  whatsapp: 'Mensagem WhatsApp',
  objecoes: 'Objeções geradas',
  ligacao: 'Ligação',
  reuniao: 'Reunião',
  nota: 'Nota',
  transcricao: 'Transcrição',
};

interface Props {
  cliente: Cliente | null;
  onClose: () => void;
  onClienteAtualizado?: () => void;
}

export default function ClienteQuickViewModal({ cliente, onClose, onClienteAtualizado }: Props) {
  const navigate = useNavigate();
  const [sessoes, setSessoes] = useState<SessaoVenda[]>([]);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [interacaoModal, setInteracaoModal] = useState(false);
  const [gerandoPeca, setGerandoPeca] = useState<PecaTipo | null>(null);
  const [localSessao, setLocalSessao] = useState<SessaoVenda | null>(null);

  const sessao = localSessao ?? sessoes[0] ?? null;

  useEffect(() => {
    if (!cliente) return;
    setLoading(true);
    setLocalSessao(null);
    svpApi.buscarCliente(cliente.id)
      .then(res => {
        setSessoes(res.sessoes ?? []);
        setInteracoes((res.interacoes ?? []).sort((a, b) =>
          new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
        ));
      })
      .catch(() => toast.error('Erro ao carregar detalhes'))
      .finally(() => setLoading(false));
  }, [cliente?.id]);

  const handleGerarPeca = useCallback(async (tipo: PecaTipo) => {
    if (!sessao) return;
    setGerandoPeca(tipo);
    try {
      await svpApi.gerarPeca(sessao.id, tipo);
      setLocalSessao(prev => {
        const base = prev ?? sessao;
        return { ...base, [`${tipo === 'objecoes' ? 'objecoes' : tipo}_json`]: true, [`${tipo === 'objecoes' ? 'objecoes' : tipo}_gerado_em`]: new Date().toISOString() } as SessaoVenda;
      });
      toast.success(`${PECAS.find(p => p.tipo === tipo)!.label} gerada!`);
    } catch {
      toast.error(`Erro ao gerar ${tipo}`);
    } finally {
      setGerandoPeca(null);
    }
  }, [sessao]);

  if (!cliente) return null;

  const temp = TEMP_BADGE[cliente.temperatura] ?? TEMP_BADGE.frio;
  const initials = cliente.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const score = sessao?.roteiro_json ? (sessao.roteiro_json as any).score : null;
  const statusLabel = STATUS_LABELS[cliente.status] ?? cliente.status;

  const agingText = cliente.ultimo_contato_em
    ? formatDistanceToNow(new Date(cliente.ultimo_contato_em), { addSuffix: false, locale: ptBR })
    : null;

  const criadoText = formatDistanceToNow(new Date(cliente.criado_em), { addSuffix: false, locale: ptBR });

  return (
    <>
      <Dialog open={!!cliente} onOpenChange={v => { if (!v) onClose(); }}>
        <DialogContent className="sm:max-w-[720px] p-0 gap-0 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-foreground truncate">{cliente.nome}</h2>
              <p className="text-xs text-muted-foreground truncate">
                {[cliente.empresa, score != null ? `Score ${score}/100` : null].filter(Boolean).join(' · ')}
              </p>
            </div>
            <Badge className={`shrink-0 text-[10px] ${temp.cls}`}>
              {temp.emoji} {temp.label}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] min-h-[360px]">
            <div className="border-r border-border p-4 space-y-5 bg-muted/20">
              <div className="space-y-2">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Contato</h3>
                {cliente.whatsapp && (
                  <div className="flex items-center gap-2 text-xs text-foreground">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{cliente.whatsapp}</span>
                  </div>
                )}
                {cliente.email && (
                  <div className="flex items-center gap-2 text-xs text-foreground">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{cliente.email}</span>
                  </div>
                )}
                {!cliente.whatsapp && !cliente.email && (
                  <p className="text-xs text-muted-foreground italic">Sem contato</p>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pipeline</h3>
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{statusLabel}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{agingText ? `há ${agingText}` : 'Sem contato'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Criado há {criadoText}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ações rápidas</h3>
                <Button
                  variant="outline" size="sm"
                  className="w-full justify-start text-xs gap-2"
                  onClick={() => setInteracaoModal(true)}
                >
                  <ClipboardList className="h-3.5 w-3.5" /> Registrar contato
                </Button>
                <Button
                  variant="outline" size="sm"
                  className="w-full justify-start text-xs gap-2"
                  onClick={() => { onClose(); navigate(`/crm/${cliente.id}`); }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              </div>
            </div>

            <div className="flex flex-col">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="p-4 border-b border-border space-y-3">
                    <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Última sessão</h3>
                    {sessao ? (
                      <>
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs font-medium text-foreground">
                              {sessao.produto ?? 'Reunião'} · {sessao.nicho ?? cliente.empresa ?? '—'}
                            </p>
                            {score != null && (
                              <p className="text-[10px] text-muted-foreground">Score {score}/100</p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {sessao.roteiro_json ? (
                            <button
                              onClick={() => navigate(`/roteiro/${sessao.id}`)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                            >
                              ✓ 📋 Roteiro
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-muted/50 text-muted-foreground border border-border">
                              📋 Roteiro
                            </span>
                          )}

                          {PECAS.map(peca => {
                            const s = localSessao ?? sessao;
                            const temPeca = !!(s as any)[peca.jsonKey];
                            const isGerando = gerandoPeca === peca.tipo;
                            const Icon = peca.icon;

                            if (isGerando) {
                              return (
                                <span key={peca.tipo} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                                  <Loader2 className="h-3 w-3 animate-spin" /> Gerando...
                                </span>
                              );
                            }

                            return (
                              <button
                                key={peca.tipo}
                                onClick={() => temPeca ? navigate(`/roteiro/${sessao.id}`) : handleGerarPeca(peca.tipo)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                                  temPeca
                                    ? 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20'
                                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                                }`}
                              >
                                {temPeca ? '✓' : '+'} <Icon className="h-3 w-3" /> {peca.label}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-2">
                          {sessao.roteiro_json && (
                            <Button
                              variant="outline" size="sm"
                              className="text-xs gap-1"
                              onClick={() => navigate(`/roteiro/${sessao.id}`)}
                            >
                              Ver roteiro <ChevronRight className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost" size="sm"
                            className="text-xs gap-1"
                            onClick={() => { onClose(); navigate('/'); }}
                          >
                            <Plus className="h-3 w-3" /> Nova sessão
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-xs text-muted-foreground mb-2">Nenhuma sessão ainda</p>
                        <Button size="sm" className="text-xs" onClick={() => { onClose(); navigate('/'); }}>
                          Gerar primeiro roteiro
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Atividade</h3>
                      <button
                        onClick={() => setInteracaoModal(true)}
                        className="text-[10px] font-medium text-primary hover:underline flex items-center gap-0.5"
                      >
                        <Plus className="h-3 w-3" /> Registrar
                      </button>
                    </div>

                    {interacoes.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Nenhuma atividade registrada</p>
                    ) : (
                      <ScrollArea className="max-h-[180px]">
                        <div className="space-y-2.5">
                          {interacoes.slice(0, 8).map(int => {
                            const Icon = CANAL_ICON[int.canal] ?? ClipboardList;
                            const label = int.titulo ?? CANAL_LABEL[int.canal] ?? int.canal;
                            const ago = formatDistanceToNow(new Date(int.criado_em), { addSuffix: false, locale: ptBR });
                            return (
                              <div key={int.id} className="flex items-start gap-2.5">
                                <div className="mt-0.5 h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                  <Icon className="h-3 w-3 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-foreground truncate">{label}</p>
                                  <p className="text-[10px] text-muted-foreground">há {ago}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <NovaInteracaoModal
        aberto={interacaoModal}
        clienteId={cliente.id}
        onFechar={() => setInteracaoModal(false)}
        onCriada={(int) => {
          setInteracoes(prev => [int, ...prev]);
          onClienteAtualizado?.();
        }}
      />
    </>
  );
}
