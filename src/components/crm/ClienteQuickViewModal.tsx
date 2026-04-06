import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { svpApi } from '@/lib/api-svp';
import type { Cliente, SessaoVenda, Interacao, ClienteTemperatura } from '@/types/crm';
import NovaInteracaoModal from './NovaInteracaoModal';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  MessageSquare, Mail, MapPin, Clock, CalendarDays, ClipboardList,
  ChevronRight, Plus, Loader2, Phone, FileText, Shield, Send, Maximize2, X,
} from 'lucide-react';
import { toast } from 'sonner';

const TEMP_BADGE: Record<ClienteTemperatura, { emoji: string; label: string; cls: string }> = {
  frio:     { emoji: '🔵', label: 'Frio',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  morno:    { emoji: '🟡', label: 'Morno',    cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  ativo:    { emoji: '🔥', label: 'Quente',   cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  em_risco: { emoji: '🔴', label: 'Em risco', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

const AVATAR_COLORS: Record<string, { bg: string; color: string }> = {
  ativo:    { bg: '#E03E3E22', color: '#E03E3E' },
  morno:    { bg: '#E8A02022', color: '#E8A020' },
  frio:     { bg: '#3B6FE822', color: '#3B6FE8' },
  em_risco: { bg: '#E03E3E22', color: '#E03E3E' },
};
const AVATAR_DEFAULT = { bg: '#2B2F3C44', color: '#7A7F92' };

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

type TimelineEntry = {
  id: string;
  icon: React.ElementType;
  label: string;
  detail?: string;
  date: Date;
  color: string;
  synthetic: boolean;
};

function buildTimeline(sessoes: SessaoVenda[], interacoes: Interacao[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  // Real interacoes
  for (const int of interacoes) {
    entries.push({
      id: `int-${int.id}`,
      icon: CANAL_ICON[int.canal] ?? ClipboardList,
      label: int.titulo ?? CANAL_LABEL[int.canal] ?? int.canal,
      detail: int.resumo_ia ?? int.conteudo?.slice(0, 60) ?? undefined,
      date: new Date(int.criado_em),
      color: '#7A7F92',
      synthetic: false,
    });
  }

  // Synthetic events from sessions
  for (const s of sessoes) {
    if (s.objecoes_geradas_em) entries.push({ id: `${s.id}-objecoes`, icon: Shield, label: 'Objeções geradas', date: new Date(s.objecoes_geradas_em), color: '#f59e0b', synthetic: true });
    if (s.whatsapp_gerado_em) entries.push({ id: `${s.id}-whatsapp`, icon: Send, label: 'Mensagem WhatsApp gerada', date: new Date(s.whatsapp_gerado_em), color: '#34d399', synthetic: true });
    if (s.email_gerado_em) entries.push({ id: `${s.id}-email`, icon: Mail, label: 'E-mail de follow-up gerado', date: new Date(s.email_gerado_em), color: '#60a5fa', synthetic: true });
    if (s.proposta_gerada_em) entries.push({ id: `${s.id}-proposta`, icon: FileText, label: 'Proposta comercial gerada', date: new Date(s.proposta_gerada_em), color: '#3B6FE8', synthetic: true });
    if (s.roteiro_gerado_em) entries.push({ id: `${s.id}-roteiro`, icon: ClipboardList, label: 'Roteiro gerado', detail: s.nicho ?? undefined, date: new Date(s.roteiro_gerado_em), color: '#1E3FA8', synthetic: true });
    entries.push({ id: `${s.id}-sessao`, icon: CalendarDays, label: 'Nova sessão criada', detail: s.nicho ?? undefined, date: new Date(s.criado_em), color: '#4A4F60', synthetic: true });
  }

  // Sort newest first, dedupe by id
  const seen = new Set<string>();
  return entries
    .filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

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
    ? daysSince >= 14 ? '#E03E3E' : daysSince >= 7 ? '#E8A020' : '#3B6FE8'
    : '#3B6FE8';

  const sessaoDate = sessao?.criado_em
    ? format(new Date(sessao.criado_em), 'dd/MM/yyyy', { locale: ptBR })
    : null;

  const timeline = buildTimeline(sessoes, interacoes);

  return (
    <>
      <Dialog open={!!cliente} onOpenChange={v => { if (!v) onClose(); }}>
        <DialogContent
          className="p-0 gap-0 bg-card border-border [&>button:first-of-type]:hidden"
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            left: 'auto',
            width: '480px',
            maxWidth: '95vw',
            height: '100vh',
            maxHeight: '100vh',
            borderRadius: '12px 0 0 12px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transform: 'none',
            translate: 'none',
            margin: 0,
          }}
        >
          <DialogTitle className="sr-only">{cliente.nome}</DialogTitle>

          {/* HEADER */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
            <div
              className="rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
              style={{ height: '40px', width: '40px', background: avatarColor.bg, color: avatarColor.color }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-foreground truncate text-[15px] leading-tight">{cliente.nome}</h2>
              {subtitleText && (
                <p className="truncate text-muted-foreground text-[11px] mt-0.5">{subtitleText}</p>
              )}
            </div>
            <span
              className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: avatarColor.bg, color: avatarColor.color, border: `1px solid ${avatarColor.color}44` }}
            >
              {temp.label.toUpperCase()}
            </span>
            <button
              onClick={() => { onClose(); navigate(`/crm/${cliente.id}`); }}
              title="Abrir tela cheia"
              className="shrink-0 p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* META STRIP — pipeline + contato inline */}
          <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border bg-muted/30 shrink-0 flex-wrap">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" /> {statusLabel}
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: agingColor }}>
              <Clock className="h-3 w-3" />
              {agingText ? `há ${agingText}` : 'Sem contato'}
            </span>
            {cliente.whatsapp && (
              <>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <MessageSquare className="h-3 w-3" /> {cliente.whatsapp}
                </span>
              </>
            )}
          </div>

          {/* BODY — scrollable single column */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* ÚLTIMA SESSÃO */}
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Última sessão</p>
                  {sessao ? (
                    <>
                      <div className="rounded-lg border border-border bg-muted/30 border-l-[3px] px-4 py-3 space-y-1" style={{ borderLeftColor: 'hsl(var(--primary))' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">Sessão</span>
                          {sessaoDate && <span className="text-[10px] text-muted-foreground">{sessaoDate}</span>}
                        </div>
                        <p className="text-sm font-semibold text-foreground truncate">{sessao.nicho ?? 'Sem nicho'}</p>
                        <p className="text-xs text-muted-foreground truncate">{sessao.produto ?? 'Sem produto'}</p>
                        {score != null && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                            Score {score}/100
                          </span>
                        )}
                      </div>

                      {/* Chips de peças */}
                      <div className="flex flex-wrap gap-1.5">
                        {sessao.roteiro_json ? (
                          <button
                            onClick={() => navigate(`/roteiro/${sessao.id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 cursor-pointer hover:bg-emerald-500/25 transition-colors"
                          >
                            ✓ 📋 Roteiro
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
                            📋 Roteiro
                          </span>
                        )}

                        {PECAS.map(peca => {
                          const s = localSessao ?? sessao;
                          const temPeca = !!(s as any)[peca.jsonKey];
                          const isGerando = gerandoPeca === peca.tipo;
                          const PECA_EMOJIS: Record<string, string> = { proposta: '📄', email: '📧', whatsapp: '💬', objecoes: '🛡' };
                          const emoji = PECA_EMOJIS[peca.tipo] || '';

                          if (isGerando) {
                            return (
                              <span key={peca.tipo} className="animate-pulse inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border min-w-[70px]">
                                <Loader2 className="h-3 w-3 animate-spin" /> Gerando...
                              </span>
                            );
                          }
                          if (temPeca) {
                            return (
                              <button
                                key={peca.tipo}
                                onClick={() => navigate(`/roteiro/${sessao.id}`)}
                                className="animate-scale-in inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 cursor-pointer hover:bg-emerald-500/25 transition-colors"
                              >
                                ✓ {emoji} {peca.label}
                              </button>
                            );
                          }
                          return (
                            <Popover key={peca.tipo}>
                              <PopoverTrigger asChild>
                                <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors">
                                  + {emoji} {peca.label}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-3 space-y-2" side="top">
                                <p className="text-xs text-foreground">Gerar {peca.label.toLowerCase()} para este cliente?</p>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" className="text-xs h-7 px-2">Cancelar</Button>
                                  <Button size="sm" className="text-xs h-7 px-2" onClick={() => handleGerarPeca(peca.tipo)}>Gerar</Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          );
                        })}
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-2">
                        {sessao.roteiro_json && (
                          <Button size="sm" variant="default" className="text-xs h-8" onClick={() => navigate(`/roteiro/${sessao.id}`)}>
                            Ver roteiro →
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => { onClose(); navigate('/'); }}>
                          + Nova sessão
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground">Nenhuma sessão registrada</p>
                      <Button size="sm" variant="outline" className="text-xs h-8 mt-3" onClick={() => { onClose(); navigate('/'); }}>
                        + Nova sessão
                      </Button>
                    </div>
                  )}
                </div>

                <div className="border-t border-border" />

                {/* AÇÕES RÁPIDAS */}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-8 justify-start" onClick={() => setInteracaoModal(true)}>
                    📝 Registrar contato
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-8 justify-start" onClick={() => { onClose(); navigate(`/crm/${cliente.id}`); }}>
                    ✏️ Editar perfil
                  </Button>
                </div>

                <div className="border-t border-border" />

                {/* ATIVIDADE */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Atividade</p>
                    <button
                      onClick={() => setInteracaoModal(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 rounded-md px-2 py-1 hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      <Plus className="h-2.5 w-2.5" /> Registrar
                    </button>
                  </div>

                  {timeline.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground italic">Nenhuma atividade registrada</p>
                      <button
                        onClick={() => setInteracaoModal(true)}
                        className="mt-2 text-xs text-primary hover:underline cursor-pointer bg-transparent border-none"
                      >
                        + Registrar primeiro contato
                      </button>
                    </div>
                  ) : (
                    <div className="relative pl-3.5">
                      <div className="absolute left-3 top-3 bottom-3 w-px bg-border" />
                      {timeline.slice(0, 10).map((entry, idx) => {
                        const Icon = entry.icon;
                        const ago = formatDistanceToNow(entry.date, { addSuffix: false, locale: ptBR });
                        const isLast = idx === Math.min(timeline.length, 10) - 1;
                        return (
                          <div key={entry.id} className="flex items-start gap-2.5" style={{ paddingBottom: isLast ? 0 : '12px' }}>
                            <div
                              className="relative z-10 flex items-center justify-center shrink-0 rounded-full"
                              style={{ height: '24px', width: '24px', background: `${entry.color}18`, border: `1px solid ${entry.color}44` }}
                            >
                              <Icon style={{ width: '10px', height: '10px', color: entry.color }} />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-start justify-between gap-2">
                                <p className="truncate text-[12px] text-foreground leading-snug" style={{ fontWeight: entry.synthetic ? 400 : 500, opacity: entry.synthetic ? 0.75 : 1 }}>
                                  {entry.label}
                                </p>
                                <span className="text-[10px] text-muted-foreground/60 shrink-0">há {ago}</span>
                              </div>
                              {entry.detail && (
                                <p className="truncate text-[11px] text-muted-foreground mt-0.5">{entry.detail}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
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
