import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { svpApi } from '@/lib/api-svp';
import type { Cliente, SessaoVenda, Interacao, ClienteTemperatura } from '@/types/crm';
import NovaInteracaoModal from './NovaInteracaoModal';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
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

const AVATAR_COLORS: Record<string, { bg: string; color: string }> = {
  ativo:    { bg: '#ff6b4a22', color: '#ff6b4a' },
  morno:    { bg: '#f5c84222', color: '#f5c842' },
  frio:     { bg: '#4a9eff22', color: '#4a9eff' },
  em_risco: { bg: '#ff6b4a22', color: '#ff6b4a' },
};
const AVATAR_DEFAULT = { bg: '#3a3a5222', color: '#9090b0' };

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
  roteiro: ClipboardList, proposta: FileText, email: Mail, whatsapp: MessageSquare,
  objecoes: Shield, ligacao: Phone, reuniao: CalendarDays, nota: ClipboardList, transcricao: FileText,
};

const CANAL_LABEL: Record<string, string> = {
  roteiro: 'Roteiro gerado', proposta: 'Proposta comercial', email: 'E-mail de follow-up',
  whatsapp: 'Mensagem WhatsApp', objecoes: 'Objeções geradas', ligacao: 'Ligação',
  reuniao: 'Reunião', nota: 'Nota', transcricao: 'Transcrição',
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
  const avatarColor = AVATAR_COLORS[cliente.temperatura] ?? AVATAR_DEFAULT;
  const initials = cliente.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const score = sessao?.roteiro_json ? (sessao.roteiro_json as any).score : null;
  const statusLabel = STATUS_LABELS[cliente.status] ?? cliente.status;
  const subtitleText = cliente.empresa || null;

  const agingText = cliente.ultimo_contato_em
    ? formatDistanceToNow(new Date(cliente.ultimo_contato_em), { addSuffix: false, locale: ptBR })
    : null;

  const criadoText = formatDistanceToNow(new Date(cliente.criado_em), { addSuffix: false, locale: ptBR });

  const daysSince = cliente.ultimo_contato_em
    ? Math.floor((Date.now() - new Date(cliente.ultimo_contato_em).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const agingColor = daysSince !== null
    ? daysSince >= 14 ? '#ff6b4a' : daysSince >= 7 ? '#f5c842' : '#4a9eff'
    : '#4a9eff';

  const sessaoDate = sessao?.criado_em
    ? format(new Date(sessao.criado_em), 'dd/MM/yyyy', { locale: ptBR })
    : null;

  return (
    <>
      <Dialog open={!!cliente} onOpenChange={v => { if (!v) onClose(); }}>
        <DialogContent className="p-0 gap-0 overflow-hidden" style={{ width: '820px', maxWidth: '95vw', maxHeight: '90vh', borderRadius: '16px', background: '#1a1a24', border: '1px solid #3a3a52' }}>
          {/* HEADER */}
          <div className="flex items-center gap-3" style={{ padding: '20px 24px', borderBottom: '1px solid #2e2e42' }}>
             <div
               className="rounded-full flex items-center justify-center shrink-0"
               style={{ height: '44px', width: '44px', background: avatarColor.bg, color: avatarColor.color }}
             >
               <span style={{ fontSize: '18px', fontWeight: 700 }}>{initials}</span>
             </div>
             <div className="flex-1 min-w-0">
               <h2 className="font-semibold truncate" style={{ fontSize: '18px', color: '#e8e8f0' }}>{cliente.nome}</h2>
               {subtitleText && (
                 <p className="truncate" style={{ color: '#9090b0', fontSize: '12px' }}>{subtitleText}</p>
               )}
             </div>
             <span
               className="shrink-0"
               style={{
                 fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                 background: avatarColor.bg, color: avatarColor.color,
                 border: `1px solid ${avatarColor.color}44`,
               }}
             >
               {temp.label.toUpperCase()}
             </span>
          </div>

          {/* BODY */}
          <div className="flex" style={{ flex: 1, overflow: 'hidden' }}>
             {/* LEFT SIDEBAR */}
             <div className="space-y-5" style={{ width: '240px', borderRight: '1px solid #2e2e42', padding: '20px', overflowY: 'auto', flexShrink: 0 }}>
              <div className="space-y-2">
                <h3 style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5a5a7a' }}>Contato</h3>
                 <div className="flex items-center gap-2" style={{ fontSize: '13px' }}>
                   <MessageSquare style={{ width: '16px', height: '16px', color: '#5a5a7a' }} />
                   <span style={{ color: '#9090b0' }}>{cliente.whatsapp || '—'}</span>
                 </div>
                 <div className="flex items-center gap-2" style={{ fontSize: '13px' }}>
                   <Mail style={{ width: '16px', height: '16px', color: '#5a5a7a' }} />
                   <span className="truncate" style={{ color: '#9090b0' }}>{cliente.email || '—'}</span>
                 </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pipeline</h3>
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{statusLabel}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                   <Clock className="h-3.5 w-3.5" style={{ color: agingColor }} />
                   <span style={{ color: agingColor }}>{agingText ? `há ${agingText}` : 'Sem contato'}</span>
                 </div>
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Criado há {criadoText}</span>
                </div>
              </div>

              <div className="space-y-2">
               <h3 style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5a5a7a', marginTop: '20px' }}>Ações rápidas</h3>
                 <button
                   onClick={() => setInteracaoModal(true)}
                   style={{ width: '100%', padding: '8px 12px', border: '1px solid #3a3a52', color: '#9090b0', background: 'transparent', borderRadius: '8px', fontSize: '13px', textAlign: 'left', cursor: 'pointer' }}
                 >
                   📝 Registrar contato
                 </button>
                 <button
                   onClick={() => { onClose(); navigate(`/crm/${cliente.id}`); }}
                   style={{ width: '100%', padding: '8px 12px', border: '1px solid #3a3a52', color: '#9090b0', background: 'transparent', borderRadius: '8px', fontSize: '13px', textAlign: 'left', cursor: 'pointer', marginTop: '6px' }}
                 >
                   ✏️ Editar
                 </button>
              </div>
            </div>

            {/* RIGHT CONTENT */}
            <div className="flex flex-col">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* ÚLTIMA SESSÃO — card de metadados */}
                  <div className="p-4 border-b border-border space-y-3">
                    {sessao ? (
                      <>
                        {/* Card com borda roxa */}
                        <div
                          className="rounded-lg p-3 space-y-1.5"
                          style={{ borderLeft: '3px solid #7c5cfc', background: 'hsl(var(--muted) / 0.3)' }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold uppercase tracking-wider" style={{ fontSize: '10px', color: '#5a5a7a' }}>
                              Última sessão
                            </span>
                            {sessaoDate && (
                              <span style={{ fontSize: '12px', color: '#9090b0' }}>{sessaoDate}</span>
                            )}
                          </div>
                          <p className="font-bold truncate" style={{ fontSize: '13px', color: '#e8e8f0' }}>
                            {sessao.nicho ?? 'Sem nicho'}
                          </p>
                          <p className="truncate" style={{ fontSize: '12px', color: '#9090b0' }}>
                            {sessao.produto ?? 'Sem produto'}
                          </p>
                          {score != null && (
                            <div>
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                                style={{ background: '#7c5cfc22', color: '#7c5cfc' }}
                              >
                                Score {score}/100
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Separador */}
                        <div className="border-t border-border" />

                        {/* Chips de peças */}
                        <div className="flex flex-wrap gap-1.5">
                          {sessao.roteiro_json ? (
                            <button
                              onClick={() => navigate(`/roteiro/${sessao.id}`)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors"
                              style={{ background: '#34d39922', color: '#34d399', border: '1px solid #34d39944' }}
                            >
                              ✓ 📋 Roteiro
                            </button>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium"
                              style={{ background: '#2a2a3a', color: '#5a5a7a', border: '1px solid #3a3a52' }}
                            >
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
                                <span
                                  key={peca.tipo}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium animate-pulse"
                                  style={{ background: '#2a2a3a', color: '#5a5a7a', border: '1px solid #3a3a52', minWidth: '70px' }}
                                >
                                  <Loader2 className="h-3 w-3 animate-spin" /> Gerando...
                                </span>
                              );
                            }

                            if (temPeca) {
                              return (
                                <button
                                  key={peca.tipo}
                                  onClick={() => navigate(`/roteiro/${sessao.id}`)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all animate-scale-in"
                                  style={{ background: '#34d39922', color: '#34d399', border: '1px solid #34d39944' }}
                                >
                                  ✓ <Icon className="h-3 w-3" /> {peca.label}
                                </button>
                              );
                            }

                            return (
                              <Popover key={peca.tipo}>
                                <PopoverTrigger asChild>
                                  <button
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors"
                                    style={{ background: '#2a2a3a', color: '#5a5a7a', border: '1px solid #3a3a52' }}
                                  >
                                    + <Icon className="h-3 w-3" /> {peca.label}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-3 space-y-2" side="top">
                                  <p className="text-xs text-foreground">Gerar {peca.label.toLowerCase()} para este cliente?</p>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="text-xs h-7 px-2">Cancelar</Button>
                                    <Button size="sm" className="text-xs h-7 px-2" onClick={() => handleGerarPeca(peca.tipo)}>
                                      Gerar
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            );
                          })}
                        </div>

                        {/* Botões */}
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
                      <div className="text-center py-6">
                        <p className="text-xs text-muted-foreground mb-3">Nenhuma sessão registrada</p>
                        <Button size="sm" className="text-xs" onClick={() => { onClose(); navigate('/'); }}>
                          <Plus className="h-3 w-3 mr-1" /> Nova sessão
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* ATIVIDADE */}
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
