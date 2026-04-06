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
  Pencil, ChevronRight, Plus, Loader2, Phone, FileText, Shield, Send, Maximize2,
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
      color: '#9090b0',
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
    entries.push({ id: `${s.id}-sessao`, icon: CalendarDays, label: 'Nova sessão criada', detail: s.nicho ?? undefined, date: new Date(s.criado_em), color: '#5a5a7a', synthetic: true });
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
        <DialogContent className="p-0 gap-0 [&>button:first-of-type]:hidden" style={{ width: '820px', maxWidth: '95vw', height: '88vh', display: 'flex', flexDirection: 'column', borderRadius: '16px', background: '#161820', border: '1px solid #2B2F3C', overflow: 'hidden' }}>
          {/* HEADER */}
          <div className="flex items-center gap-3" style={{ padding: '20px 24px', borderBottom: '1px solid #2B2F3C' }}>
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
              <button
                onClick={() => { onClose(); navigate(`/crm/${cliente.id}`); }}
                title="Abrir tela cheia"
                style={{ padding: '6px', borderRadius: '6px', background: 'transparent', border: '1px solid #2B2F3C', color: '#7A7F92', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <Maximize2 style={{ width: '14px', height: '14px' }} />
              </button>
          </div>

          {/* BODY */}
          <div className="flex" style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
             {/* LEFT SIDEBAR */}
             <div className="space-y-5" style={{ width: '240px', borderRight: '1px solid #2B2F3C', padding: '20px', overflowY: 'auto', flexShrink: 0 }}>
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
                <h3 style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5a5a7a', marginTop: '20px' }}>Pipeline</h3>
                 <div className="flex items-center gap-2" style={{ fontSize: '13px' }}>
                   <MapPin style={{ width: '16px', height: '16px', color: '#5a5a7a' }} />
                   <span style={{ color: '#e8e8f0' }}>📍 {statusLabel}</span>
                 </div>
                 <div className="flex items-center gap-2" style={{ fontSize: '13px' }}>
                   <Clock style={{ width: '16px', height: '16px', color: agingColor }} />
                   <span style={{ color: agingColor }}>⏱ {agingText ? `há ${agingText}` : 'Sem contato'}</span>
                 </div>
                 <div className="flex items-center gap-2" style={{ fontSize: '13px' }}>
                   <CalendarDays style={{ width: '16px', height: '16px', color: '#5a5a7a' }} />
                   <span style={{ color: '#9090b0' }}>📅 Criado há {criadoText}</span>
                 </div>
              </div>

              <div className="space-y-2">
               <h3 style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5a5a7a', marginTop: '20px' }}>Ações rápidas</h3>
                 <button
                   onClick={() => setInteracaoModal(true)}
                   style={{ width: '100%', padding: '8px 12px', border: '1px solid #2B2F3C', color: '#7A7F92', background: 'transparent', borderRadius: '8px', fontSize: '13px', textAlign: 'left', cursor: 'pointer' }}
                 >
                   📝 Registrar contato
                 </button>
                 <button
                   onClick={() => { onClose(); navigate(`/crm/${cliente.id}`); }}
                   style={{ width: '100%', padding: '8px 12px', border: '1px solid #2B2F3C', color: '#7A7F92', background: 'transparent', borderRadius: '8px', fontSize: '13px', textAlign: 'left', cursor: 'pointer', marginTop: '6px' }}
                 >
                   ✏️ Editar
                 </button>
              </div>
            </div>

             {/* RIGHT CONTENT */}
             <div className="flex flex-col" style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                   {/* ÚLTIMA SESSÃO — card de metadados */}
                   <div className="space-y-3">
                     <h3 style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5a5a7a', marginBottom: '10px' }}>Última sessão</h3>
                     {sessao ? (
                       <>
                         {/* Card com borda roxa */}
                         <div
                           style={{ background: '#20232B', border: '1px solid #2B2F3C', borderLeft: '3px solid #1E3FA8', borderRadius: '10px', padding: '14px' }}
                         >
                           <div className="flex items-center justify-between">
                             <span style={{ fontSize: '10px', color: '#5a5a7a' }}>
                               Última sessão
                             </span>
                             {sessaoDate && (
                               <span style={{ fontSize: '11px', color: '#5a5a7a' }}>{sessaoDate}</span>
                             )}
                           </div>
                           <p className="truncate" style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8f0' }}>
                             {sessao.nicho ?? 'Sem nicho'}
                           </p>
                           <p className="truncate" style={{ fontSize: '12px', color: '#9090b0', maxHeight: '2.6em', overflow: 'hidden' }}>
                             {sessao.produto ?? 'Sem produto'}
                           </p>
                           <div>
                             <span
                               style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: '#1E3FA822', color: '#8AB4FF', border: '1px solid #1E3FA844' }}
                             >
                               {score != null ? `Score ${score}/100` : '—'}
                             </span>
                           </div>
                        </div>

                         {/* Separador */}
                         <div style={{ borderTop: '1px solid #2B2F3C', margin: '12px 0' }} />

                        {/* Chips de peças */}
                        <div className="flex flex-wrap" style={{ gap: '6px' }}>
                           {sessao.roteiro_json ? (
                             <button
                               onClick={() => navigate(`/roteiro/${sessao.id}`)}
                               style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: '#34d39922', color: '#34d399', border: '1px solid #34d39944' }}
                             >
                               ✓ 📋 Roteiro
                             </button>
                           ) : (
                             <span
                               style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: '#20232B', color: '#4A4F60', border: '1px solid #2B2F3C' }}
                             >
                               📋 Roteiro
                             </span>
                           )}

                          {PECAS.map(peca => {
                            const s = localSessao ?? sessao;
                            const temPeca = !!(s as any)[peca.jsonKey];
                            const isGerando = gerandoPeca === peca.tipo;
                            const Icon = peca.icon;

                             const PECA_EMOJIS: Record<string, string> = { proposta: '📄', email: '📧', whatsapp: '💬', objecoes: '🛡' };
                             const emoji = PECA_EMOJIS[peca.tipo] || '';

                             if (isGerando) {
                               return (
                                 <span
                                   key={peca.tipo}
                                   className="animate-pulse"
                                   style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: '#20232B', color: '#4A4F60', border: '1px solid #2B2F3C', minWidth: '70px' }}
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
                                   className="animate-scale-in"
                                   style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: '#34d39922', color: '#34d399', border: '1px solid #34d39944' }}
                                 >
                                   ✓ {emoji} {peca.label}
                                 </button>
                               );
                             }

                             return (
                               <Popover key={peca.tipo}>
                                 <PopoverTrigger asChild>
                                   <button
                                     className="transition-colors"
                                     style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: '#20232B', color: '#4A4F60', border: '1px solid #2B2F3C' }}
                                     onMouseEnter={e => { e.currentTarget.style.background = '#1E3FA822'; e.currentTarget.style.color = '#8AB4FF'; e.currentTarget.style.borderColor = '#1E3FA855'; }}
                                     onMouseLeave={e => { e.currentTarget.style.background = '#20232B'; e.currentTarget.style.color = '#4A4F60'; e.currentTarget.style.borderColor = '#2B2F3C'; }}
                                   >
                                     + {emoji} {peca.label}
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
                         <div className="flex items-center" style={{ gap: '8px', marginTop: '12px' }}>
                           {sessao.roteiro_json && (
                             <button
                               onClick={() => navigate(`/roteiro/${sessao.id}`)}
                               style={{ border: '1px solid #1E3FA8', color: '#8AB4FF', background: 'transparent', padding: '7px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
                             >
                               Ver roteiro →
                             </button>
                           )}
                           <button
                             onClick={() => { onClose(); navigate('/'); }}
                             style={{ border: '1px solid #2B2F3C', color: '#7A7F92', background: 'transparent', padding: '7px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
                           >
                             + Nova sessão
                           </button>
                         </div>
                      </>
                     ) : (
                       <div style={{ textAlign: 'center', padding: '20px 0' }}>
                         <p style={{ fontSize: '13px', color: '#5a5a7a' }}>Nenhuma sessão registrada</p>
                         <button
                           onClick={() => { onClose(); navigate('/'); }}
                           style={{ marginTop: '12px', border: '1px solid #2B2F3C', color: '#7A7F92', background: 'transparent', padding: '7px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
                         >
                           + Nova sessão
                         </button>
                       </div>
                     )}
                   </div>

                   {/* ATIVIDADE */}
                   <div style={{ marginTop: '28px' }}>
                     <div className="flex items-center justify-between" style={{ marginBottom: '14px' }}>
                       <h3 style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5a5a7a' }}>Atividade</h3>
                       <button
                         onClick={() => setInteracaoModal(true)}
                         style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#8AB4FF', cursor: 'pointer', background: '#1E3FA815', border: '1px solid #1E3FA833', borderRadius: '6px', padding: '3px 8px' }}
                       >
                         <Plus style={{ width: '10px', height: '10px' }} /> Registrar
                       </button>
                     </div>

                     {timeline.length === 0 ? (
                       <div style={{ textAlign: 'center', padding: '20px 0' }}>
                         <p style={{ fontSize: '13px', color: '#5a5a7a', fontStyle: 'italic' }}>Nenhuma atividade registrada</p>
                         <button
                           onClick={() => setInteracaoModal(true)}
                           style={{ marginTop: '8px', fontSize: '12px', color: '#8AB4FF', background: 'none', border: 'none', cursor: 'pointer' }}
                         >
                           + Registrar primeiro contato
                         </button>
                       </div>
                     ) : (
                       <ScrollArea>
                         <div style={{ position: 'relative', paddingLeft: '14px' }}>
                           {/* Vertical connecting line */}
                           <div style={{ position: 'absolute', left: '13px', top: '14px', bottom: '14px', width: '1px', background: '#2B2F3C' }} />

                           {timeline.slice(0, 10).map((entry, idx) => {
                             const Icon = entry.icon;
                             const ago = formatDistanceToNow(entry.date, { addSuffix: false, locale: ptBR });
                             const isLast = idx === Math.min(timeline.length, 10) - 1;
                             return (
                               <div
                                 key={entry.id}
                                 className="flex items-start gap-2.5"
                                 style={{ paddingBottom: isLast ? 0 : '14px' }}
                               >
                                 {/* Dot icon */}
                                 <div
                                   className="flex items-center justify-center shrink-0"
                                   style={{
                                     position: 'relative', zIndex: 1,
                                     height: '26px', width: '26px', borderRadius: '50%',
                                     background: `${entry.color}18`,
                                     border: `1px solid ${entry.color}44`,
                                   }}
                                 >
                                   <Icon style={{ width: '11px', height: '11px', color: entry.color }} />
                                 </div>
                                 {/* Content */}
                                 <div className="flex-1 min-w-0" style={{ paddingTop: '3px' }}>
                                   <div className="flex items-start justify-between gap-2">
                                     <p
                                       className="truncate"
                                       style={{ fontSize: '13px', color: entry.synthetic ? '#c0c0d8' : '#e8e8f0', fontWeight: entry.synthetic ? 400 : 500, lineHeight: 1.3 }}
                                     >
                                       {entry.label}
                                     </p>
                                     <span style={{ fontSize: '10px', color: '#4a4a6a', flexShrink: 0, paddingTop: '1px' }}>há {ago}</span>
                                   </div>
                                   {entry.detail && (
                                     <p className="truncate" style={{ fontSize: '11px', color: '#5a5a7a', marginTop: '1px' }}>{entry.detail}</p>
                                   )}
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
