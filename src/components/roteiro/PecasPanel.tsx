import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Mail, MessageCircle, ShieldAlert, Check, Loader2,
  RotateCcw, Copy, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { svpApi } from '@/lib/api-svp';
import type { SessaoVenda, PropostaJSON, EmailJSON, WhatsAppJSON, ObjecaoItem } from '@/types/crm';

type PecaTipo = 'proposta' | 'email' | 'whatsapp' | 'objecoes';

interface PecaConfig {
  tipo: PecaTipo;
  label: string;
  icon: React.ReactNode;
  jsonKey: keyof SessaoVenda;
}

const PECAS: PecaConfig[] = [
  { tipo: 'proposta',  label: 'Proposta',  icon: <FileText      className="h-3.5 w-3.5" />, jsonKey: 'proposta_json'  },
  { tipo: 'email',     label: 'E-mail',    icon: <Mail          className="h-3.5 w-3.5" />, jsonKey: 'email_json'     },
  { tipo: 'whatsapp',  label: 'WhatsApp',  icon: <MessageCircle className="h-3.5 w-3.5" />, jsonKey: 'whatsapp_json'  },
  { tipo: 'objecoes',  label: 'Objeções',  icon: <ShieldAlert   className="h-3.5 w-3.5" />, jsonKey: 'objecoes_json'  },
];

interface Props {
  sessao: SessaoVenda;
  onSessaoUpdate: (updated: Partial<SessaoVenda>) => void;
}

export default function PecasPanel({ sessao, onSessaoUpdate }: Props) {
  const isGerada = (tipo: PecaTipo) => {
    const config = PECAS.find(p => p.tipo === tipo)!;
    return !!(sessao as any)[config.jsonKey];
  };

  // Auto-select the first generated piece, or default to 'proposta'
  const [activeTab, setActiveTab] = useState<PecaTipo>(
    () => PECAS.find(p => isGerada(p.tipo))?.tipo ?? 'proposta'
  );
  const [gerando, setGerando] = useState<PecaTipo | null>(null);
  const [erro, setErro]       = useState<PecaTipo | null>(null);

  const handleGerar = useCallback(async (tipo: PecaTipo) => {
    setGerando(tipo);
    setErro(null);
    try {
      const res = await svpApi.gerarPeca(sessao.id, tipo);
      const updates: Partial<SessaoVenda> = {};
      if (tipo === 'proposta' && res.proposta) {
        updates.proposta_json      = res.proposta as unknown as PropostaJSON;
        updates.proposta_gerada_em = new Date().toISOString();
      } else if (tipo === 'email' && res.email) {
        updates.email_json      = res.email as unknown as EmailJSON;
        updates.email_gerado_em = new Date().toISOString();
      } else if (tipo === 'whatsapp' && res.whatsapp) {
        updates.whatsapp_json      = res.whatsapp as unknown as WhatsAppJSON;
        updates.whatsapp_gerado_em = new Date().toISOString();
      } else if (tipo === 'objecoes' && res.objecoes) {
        updates.objecoes_json      = res.objecoes as unknown as ObjecaoItem[];
        updates.objecoes_geradas_em = new Date().toISOString();
      }
      onSessaoUpdate(updates);
      setActiveTab(tipo);
      toast.success(`${PECAS.find(p => p.tipo === tipo)!.label} gerada!`);
    } catch (err: any) {
      setErro(tipo);
      toast.error(`Erro ao gerar ${tipo}: ${err.message}`);
    } finally {
      setGerando(null);
    }
  }, [sessao.id, onSessaoUpdate]);

  return (
    <div className="flex flex-col h-full">

      {/* ── Tab bar ── */}
      <div className="shrink-0 flex border-b border-border px-2 bg-card">
        {PECAS.map(peca => {
          const gerada    = isGerada(peca.tipo);
          const isActive  = activeTab === peca.tipo;
          const isGerando = gerando === peca.tipo;

          return (
            <button
              key={peca.tipo}
              onClick={() => {
                if (gerada) {
                  setActiveTab(peca.tipo);
                } else if (!isGerando) {
                  handleGerar(peca.tipo);
                }
              }}
              disabled={isGerando}
              className={`
                relative flex items-center gap-1.5 px-3 py-3.5 text-xs font-medium
                transition-colors border-b-2 -mb-px
                ${isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }
                ${isGerando ? 'cursor-wait opacity-60' : 'cursor-pointer'}
              `}
            >
              {isGerando ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : gerada ? (
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
              ) : (
                peca.icon
              )}
              {isGerando ? 'Gerando...' : peca.label}
              {!gerada && !isGerando && (
                <span className="ml-0.5 text-[10px] text-muted-foreground/60">+</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="h-full"
          >
            <PecaContent
              tipo={activeTab}
              sessao={sessao}
              gerando={gerando === activeTab}
              erro={erro === activeTab}
              onGerar={() => handleGerar(activeTab)}
              onRegenerar={() => handleGerar(activeTab)}
            />
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}

/* ─────────────────────────────────────────────────
   PecaContent — renders the correct view per tab
───────────────────────────────────────────────── */

function PecaContent({
  tipo, sessao, gerando, erro, onGerar, onRegenerar,
}: {
  tipo: PecaTipo;
  sessao: SessaoVenda;
  gerando: boolean;
  erro: boolean;
  onGerar: () => void;
  onRegenerar: () => void;
}) {
  const config = PECAS.find(p => p.tipo === tipo)!;
  const data   = (sessao as any)[config.jsonKey];

  /* Empty / not-generated state */
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground">
          {config.icon}
        </div>
        <p className="text-sm font-medium text-foreground mb-1">{config.label} não gerada ainda</p>
        <p className="text-xs text-muted-foreground mb-5 max-w-xs">
          Gerada com IA a partir do roteiro aprovado — personalizada para {config.label === 'WhatsApp' ? 'envio imediato' : 'este lead'}
        </p>
        {erro ? (
          <div className="flex flex-col items-center gap-2">
            <p className="flex items-center gap-1.5 text-destructive text-xs">
              <AlertCircle className="h-3.5 w-3.5" /> Erro ao gerar. Tente novamente.
            </p>
            <Button size="sm" onClick={onGerar} disabled={gerando}>
              {gerando ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Gerando...</> : 'Tentar novamente'}
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={onGerar} disabled={gerando}>
            {gerando
              ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Gerando {config.label}...</>
              : `Gerar ${config.label}`}
          </Button>
        )}
      </div>
    );
  }

  /* Content header — sticky, consistent across all tabs */
  return (
    <div className="flex flex-col">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-background/95 backdrop-blur border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2">
          <CopyButton tipo={tipo} sessao={sessao} />
        </div>
        <button
          onClick={onRegenerar}
          disabled={gerando}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {gerando
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <RotateCcw className="h-3 w-3" />}
          Regenerar
        </button>
      </div>

      {/* Scrollable content body */}
      <div className="px-5 py-5">
        {tipo === 'proposta'  && <PropostaView  data={data as PropostaJSON}  />}
        {tipo === 'email'     && <EmailView     data={data as EmailJSON}     />}
        {tipo === 'whatsapp'  && <WhatsAppView  data={data as WhatsAppJSON}  />}
        {tipo === 'objecoes'  && <ObjecoesView  data={data as ObjecaoItem[]} />}
      </div>
    </div>
  );
}

/* ── Copy button — type-aware ── */
function CopyButton({ tipo, sessao }: { tipo: PecaTipo; sessao: SessaoVenda }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    let text = '';
    if (tipo === 'proposta') {
      const d = sessao.proposta_json as any;
      if (!d) return;
      text = [d.titulo, d.abertura || d.introducao, `Diagnóstico:\n${d.diagnostico}`, `Solução:\n${d.solucao}`, d.beneficios?.join('\n'), `Investimento: ${d.investimento?.valor}`, d.proximo_passo, d.fechamento].filter(Boolean).join('\n\n');
    } else if (tipo === 'email') {
      const d = sessao.email_json as any;
      if (!d) return;
      text = `Assunto: ${d.assunto}\n\n${d.saudacao}\n\n${d.corpo}\n\n${d.cta}\n\n${d.assinatura}`;
    } else if (tipo === 'whatsapp') {
      const d = sessao.whatsapp_json as any;
      if (!d) return;
      text = d.mensagem_principal || `${d.abertura}\n\n${d.valor_rapido}\n\n${d.cta}`;
    } else if (tipo === 'objecoes') {
      const d = sessao.objecoes_json as any;
      if (!d) return;
      text = (d as ObjecaoItem[]).map((o: any) => `${o.objecao}\n${o.resposta_curta}`).join('\n\n');
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copiado!');
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
        copied
          ? 'bg-green-500/10 text-green-500 border-green-500/30'
          : 'bg-card border-border text-foreground hover:bg-muted/50'
      }`}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  );
}

/* ─────────────────────────────────────────────────
   Section label — unified style
───────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
      {children}
    </p>
  );
}

/* ─────────────────────────────────────────────────
   Content views
───────────────────────────────────────────────── */

function PropostaView({ data }: { data: PropostaJSON }) {
  return (
    <div className="space-y-5 text-sm text-foreground">
      {data.titulo && (
        <h4 className="text-base font-semibold text-foreground leading-snug">
          {data.titulo}
        </h4>
      )}

      {(data.abertura || data.introducao) && (
        <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">
          {data.abertura || data.introducao}
        </p>
      )}

      {data.diagnostico && (
        <div>
          <SectionLabel>Diagnóstico</SectionLabel>
          <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{data.diagnostico}</p>
        </div>
      )}

      {data.solucao && (
        <div>
          <SectionLabel>Solução</SectionLabel>
          <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{data.solucao}</p>
        </div>
      )}

      {data.beneficios?.length > 0 && (
        <div>
          <SectionLabel>Benefícios</SectionLabel>
          <ul className="space-y-1.5">
            {data.beneficios.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-foreground/90">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.investimento && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
          <SectionLabel>Investimento</SectionLabel>
          <p className="text-base font-semibold text-foreground">{data.investimento.valor}</p>
          {data.investimento.condicoes && (
            <p className="text-xs text-muted-foreground">{data.investimento.condicoes}</p>
          )}
          {data.investimento.garantia && (
            <p className="text-xs text-muted-foreground">Garantia: {data.investimento.garantia}</p>
          )}
        </div>
      )}

      {data.proximo_passo && (
        <div>
          <SectionLabel>Próximo passo</SectionLabel>
          <p className="text-foreground/90">{data.proximo_passo}</p>
        </div>
      )}

      {data.fechamento && (
        <p className="text-sm text-muted-foreground italic border-l-2 border-border pl-3">
          {data.fechamento}
        </p>
      )}
    </div>
  );
}

function EmailView({ data }: { data: EmailJSON }) {
  return (
    <div className="space-y-4">
      {/* Email container */}
      <div className="rounded-xl border border-border bg-card overflow-hidden text-sm text-foreground">

        {/* Subject line */}
        <div className="flex items-start gap-3 px-4 py-3 border-b border-border bg-muted/20">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0 mt-0.5">Assunto</span>
          <span className="font-medium text-foreground leading-snug">{data.assunto}</span>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-3">
          {data.saudacao && <p className="font-medium">{data.saudacao}</p>}
          {data.corpo && <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{data.corpo}</p>}

          {/* Destaques — callout style, not pill */}
          {data.destaque_1 && (
            <div className="border-l-2 border-primary/60 pl-3 py-0.5">
              <p className="text-sm text-foreground/80 italic">{data.destaque_1}</p>
            </div>
          )}
          {data.destaque_2 && (
            <div className="border-l-2 border-primary/60 pl-3 py-0.5">
              <p className="text-sm text-foreground/80 italic">{data.destaque_2}</p>
            </div>
          )}

          {data.cta && (
            <p className="font-semibold text-foreground">{data.cta}</p>
          )}
          {data.assinatura && (
            <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">
              {data.assinatura}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function WhatsAppView({ data }: { data: WhatsAppJSON }) {
  const mensagem = data.mensagem_principal || `${data.abertura}\n\n${data.valor_rapido}\n\n${data.cta}`;

  return (
    <div className="space-y-4">
      {/* Main message */}
      <div>
        <SectionLabel>Mensagem principal</SectionLabel>
        <div className="rounded-xl border border-border bg-card p-4">
          {/* Fake WhatsApp bubble header */}
          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border/50">
            <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <MessageCircle className="h-3 w-3 text-green-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">WhatsApp · Mensagem</span>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{mensagem}</p>
        </div>
      </div>

      {/* Short version */}
      {data.versao_curta && (
        <div>
          <SectionLabel>Versão curta</SectionLabel>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border/50">
              <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <MessageCircle className="h-3 w-3 text-green-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">WhatsApp · Seguimento rápido</span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{data.versao_curta}</p>
          </div>
          <CopyShortButton text={data.versao_curta} />
        </div>
      )}
    </div>
  );
}

function CopyShortButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Versão curta copiada!');
  };
  return (
    <button
      onClick={handleCopy}
      className={`mt-2 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
        copied
          ? 'bg-green-500/10 text-green-500 border-green-500/30'
          : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copiado!' : 'Copiar versão curta'}
    </button>
  );
}

function ObjecoesView({ data }: { data: ObjecaoItem[] }) {
  const [expanded, setExpanded] = useState<number | null>(0); // first expanded by default

  const categoryColors: Record<string, string> = {
    preco:       'bg-amber-500/10  text-amber-500   border-amber-500/25',
    tempo:       'bg-blue-500/10   text-blue-400    border-blue-500/25',
    confianca:   'bg-blue-500/10  text-blue-400    border-blue-500/25',
    necessidade: 'bg-green-500/10  text-green-500   border-green-500/25',
    autoridade:  'bg-red-500/10    text-red-400     border-red-500/25',
  };

  return (
    <div className="space-y-2">
      {data.map((obj, i) => (
        <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === i ? null : i)}
            className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border shrink-0 tracking-wide ${categoryColors[obj.categoria] ?? categoryColors.preco}`}>
                {obj.categoria}
              </span>
              <span className="text-sm text-foreground truncate">{obj.objecao}</span>
            </div>
            <span className={`text-muted-foreground shrink-0 transition-transform duration-200 ${expanded === i ? 'rotate-180' : ''}`}>
              ↓
            </span>
          </button>

          <AnimatePresence initial={false}>
            {expanded === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 pt-3 space-y-3 border-t border-border">
                  <div>
                    <SectionLabel>Resposta rápida</SectionLabel>
                    <p className="text-sm text-foreground">{obj.resposta_curta}</p>
                  </div>
                  <div>
                    <SectionLabel>Resposta completa</SectionLabel>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{obj.resposta_completa}</p>
                  </div>
                  {obj.tecnica && (
                    <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-3">
                      Técnica: {obj.tecnica}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
