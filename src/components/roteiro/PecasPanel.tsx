import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Mail, MessageCircle, ShieldAlert, Check, Loader2,
  RotateCcw, Copy, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  { tipo: 'proposta', label: 'Proposta', icon: <FileText className="h-4 w-4" />, jsonKey: 'proposta_json' },
  { tipo: 'email', label: 'E-mail', icon: <Mail className="h-4 w-4" />, jsonKey: 'email_json' },
  { tipo: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="h-4 w-4" />, jsonKey: 'whatsapp_json' },
  { tipo: 'objecoes', label: 'Objeções', icon: <ShieldAlert className="h-4 w-4" />, jsonKey: 'objecoes_json' },
];

interface Props {
  sessao: SessaoVenda;
  onSessaoUpdate: (updated: Partial<SessaoVenda>) => void;
}

export default function PecasPanel({ sessao, onSessaoUpdate }: Props) {
  const [activeTab, setActiveTab] = useState<PecaTipo | null>(null);
  const [gerando, setGerando] = useState<PecaTipo | null>(null);
  const [erro, setErro] = useState<PecaTipo | null>(null);

  const isGerada = (tipo: PecaTipo) => {
    const config = PECAS.find(p => p.tipo === tipo)!;
    return !!(sessao as any)[config.jsonKey];
  };

  const handleGerar = useCallback(async (tipo: PecaTipo) => {
    setGerando(tipo);
    setErro(null);
    try {
      const res = await svpApi.gerarPeca(sessao.id, tipo);
      // Update sessao with the new data
      const updates: Partial<SessaoVenda> = {};
      if (tipo === 'proposta' && res.proposta) {
        updates.proposta_json = res.proposta as unknown as PropostaJSON;
        updates.proposta_gerada_em = new Date().toISOString();
      } else if (tipo === 'email' && res.email) {
        updates.email_json = res.email as unknown as EmailJSON;
        updates.email_gerada_em = new Date().toISOString();
      } else if (tipo === 'whatsapp' && res.whatsapp) {
        updates.whatsapp_json = res.whatsapp as unknown as WhatsAppJSON;
        updates.whatsapp_gerado_em = new Date().toISOString();
      } else if (tipo === 'objecoes' && res.objecoes) {
        updates.objecoes_json = res.objecoes as unknown as ObjecaoItem[];
        updates.objecoes_geradas_em = new Date().toISOString();
      }
      onSessaoUpdate(updates);
      setActiveTab(tipo);
      toast.success(`${PECAS.find(p => p.tipo === tipo)!.label} gerada com sucesso!`);
    } catch (err: any) {
      setErro(tipo);
      toast.error(`Erro ao gerar ${tipo}: ${err.message}`);
    } finally {
      setGerando(null);
    }
  }, [sessao.id, onSessaoUpdate]);

  return (
    <div className="border-t border-border bg-card">
      {/* Status bar */}
      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto">
        <Badge variant="outline" className="shrink-0 bg-green-500/10 text-green-600 border-green-500/30 gap-1">
          <Check className="h-3 w-3" /> Roteiro
        </Badge>

        {PECAS.map(peca => {
          const gerada = isGerada(peca.tipo);
          const isGerando = gerando === peca.tipo;
          const isActive = activeTab === peca.tipo;

          return (
            <button
              key={peca.tipo}
              onClick={() => {
                if (gerada) {
                  setActiveTab(isActive ? null : peca.tipo);
                } else if (!isGerando) {
                  handleGerar(peca.tipo);
                }
              }}
              disabled={isGerando}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                isGerando
                  ? 'bg-muted border-border text-muted-foreground cursor-wait'
                  : gerada
                    ? isActive
                      ? 'bg-green-500/10 text-green-600 border-green-500/30'
                      : 'bg-green-500/5 text-green-600 border-green-500/20 hover:bg-green-500/10'
                    : 'bg-primary/5 text-primary border-primary/20 hover:bg-primary/10'
              }`}
            >
              {isGerando ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : gerada ? (
                <Check className="h-3 w-3" />
              ) : (
                peca.icon
              )}
              {isGerando ? 'Gerando...' : gerada ? peca.label : `Gerar ${peca.label}`}
            </button>
          );
        })}
      </div>

      {/* Content panel */}
      <AnimatePresence mode="wait">
        {activeTab && (
          <motion.div
            key={activeTab}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto">
              <PecaContent
                tipo={activeTab}
                sessao={sessao}
                gerando={gerando === activeTab}
                erro={erro === activeTab}
                onGerar={() => handleGerar(activeTab)}
                onRegenerar={() => handleGerar(activeTab)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Piece content renderer ──
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
  const data = (sessao as any)[config.jsonKey];

  // Empty state
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground">
          {config.icon}
        </div>
        <p className="text-sm font-medium text-foreground mb-1">{config.label} não gerada ainda</p>
        <p className="text-xs text-muted-foreground mb-4">Clique para gerar com IA baseado no roteiro aprovado</p>
        {erro ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5 text-destructive text-xs">
              <AlertCircle className="h-3.5 w-3.5" /> Erro ao gerar. Tente novamente.
            </div>
            <Button size="sm" onClick={onGerar} disabled={gerando}>
              {gerando ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Gerando...</> : 'Tentar novamente'}
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={onGerar} disabled={gerando}>
            {gerando ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Gerando...</> : `Gerar ${config.label}`}
          </Button>
        )}
      </div>
    );
  }

  // Content rendered
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">{config.label}</h3>
        <Button variant="ghost" size="sm" onClick={onRegenerar} disabled={gerando} className="text-xs gap-1.5 text-muted-foreground">
          {gerando ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
          Regenerar
        </Button>
      </div>

      {tipo === 'proposta' && <PropostaView data={data as PropostaJSON} />}
      {tipo === 'email' && <EmailView data={data as EmailJSON} />}
      {tipo === 'whatsapp' && <WhatsAppView data={data as WhatsAppJSON} />}
      {tipo === 'objecoes' && <ObjecoesView data={data as ObjecaoItem[]} />}
    </div>
  );
}

// ── Content views ──

function PropostaView({ data }: { data: PropostaJSON }) {
  const copyAll = () => {
    const text = [
      data.titulo,
      data.abertura || data.introducao || '',
      `Diagnóstico:\n${data.diagnostico}`,
      `Solução:\n${data.solucao}`,
      `Benefícios:\n${data.beneficios?.join('\n') || ''}`,
      `Investimento: ${data.investimento?.valor}\n${data.investimento?.condicoes}\nGarantia: ${data.investimento?.garantia}`,
      `Próximo passo: ${data.proximo_passo}`,
      data.fechamento,
    ].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success('Proposta copiada!');
  };

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" onClick={copyAll} className="text-xs gap-1.5">
        <Copy className="h-3 w-3" /> Copiar texto
      </Button>
      <div className="space-y-3 text-sm text-foreground">
        {data.titulo && <h4 className="font-semibold">{data.titulo}</h4>}
        {(data.abertura || data.introducao) && <p className="whitespace-pre-wrap">{data.abertura || data.introducao}</p>}
        <div><span className="font-medium text-muted-foreground text-xs uppercase">Diagnóstico</span><p className="whitespace-pre-wrap mt-1">{data.diagnostico}</p></div>
        <div><span className="font-medium text-muted-foreground text-xs uppercase">Solução</span><p className="whitespace-pre-wrap mt-1">{data.solucao}</p></div>
        {data.beneficios?.length > 0 && (
          <div>
            <span className="font-medium text-muted-foreground text-xs uppercase">Benefícios</span>
            <ul className="list-disc pl-4 mt-1 space-y-1">{data.beneficios.map((b, i) => <li key={i}>{b}</li>)}</ul>
          </div>
        )}
        {data.investimento && (
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <span className="font-medium text-muted-foreground text-xs uppercase">Investimento</span>
            <p className="font-semibold">{data.investimento.valor}</p>
            <p className="text-xs text-muted-foreground">{data.investimento.condicoes}</p>
            <p className="text-xs text-muted-foreground">Garantia: {data.investimento.garantia}</p>
          </div>
        )}
        {data.proximo_passo && <div><span className="font-medium text-muted-foreground text-xs uppercase">Próximo passo</span><p className="mt-1">{data.proximo_passo}</p></div>}
        {data.fechamento && <p className="italic text-muted-foreground">{data.fechamento}</p>}
      </div>
    </div>
  );
}

function EmailView({ data }: { data: EmailJSON }) {
  const copyAll = () => {
    navigator.clipboard.writeText(`Assunto: ${data.assunto}\n\n${data.saudacao}\n\n${data.corpo}\n\n${data.cta}\n\n${data.assinatura}`);
    toast.success('E-mail copiado!');
  };

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" onClick={copyAll} className="text-xs gap-1.5">
        <Copy className="h-3 w-3" /> Copiar texto
      </Button>
      <div className="bg-muted/20 rounded-xl p-4 space-y-3 text-sm text-foreground">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground">Assunto:</span>
          <span className="font-medium">{data.assunto}</span>
        </div>
        <p>{data.saudacao}</p>
        <p className="whitespace-pre-wrap">{data.corpo}</p>
        {data.destaque_1 && <p className="bg-primary/5 px-2 py-1 rounded text-primary text-xs">{data.destaque_1}</p>}
        {data.destaque_2 && <p className="bg-primary/5 px-2 py-1 rounded text-primary text-xs">{data.destaque_2}</p>}
        <p className="font-medium">{data.cta}</p>
        <p className="text-muted-foreground text-xs">{data.assinatura}</p>
      </div>
    </div>
  );
}

function WhatsAppView({ data }: { data: WhatsAppJSON }) {
  const copyAll = () => {
    navigator.clipboard.writeText(data.mensagem_principal || `${data.abertura}\n\n${data.valor_rapido}\n\n${data.cta}`);
    toast.success('WhatsApp copiado!');
  };

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" onClick={copyAll} className="text-xs gap-1.5">
        <Copy className="h-3 w-3" /> Copiar texto
      </Button>
      <div className="space-y-3">
        <div className="bg-green-500/5 rounded-xl p-4 text-sm text-foreground space-y-2 border border-green-500/10">
          <span className="text-xs font-medium text-muted-foreground uppercase">Mensagem principal</span>
          <p className="whitespace-pre-wrap">{data.mensagem_principal || `${data.abertura}\n\n${data.valor_rapido}\n\n${data.cta}`}</p>
        </div>
        {data.versao_curta && (
          <div className="bg-muted/20 rounded-xl p-4 text-sm text-foreground space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase">Versão curta</span>
            <p className="whitespace-pre-wrap">{data.versao_curta}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ObjecoesView({ data }: { data: ObjecaoItem[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const categoryColors: Record<string, string> = {
    preco: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    tempo: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    confianca: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    necessidade: 'bg-green-500/10 text-green-600 border-green-500/20',
    autoridade: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  return (
    <div className="space-y-3">
      {data.map((obj, i) => (
        <div key={i} className="border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === i ? null : i)}
            className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border shrink-0 ${categoryColors[obj.categoria] || categoryColors.preco}`}>
                {obj.categoria}
              </span>
              <span className="text-sm text-foreground truncate">{obj.objecao}</span>
            </div>
          </button>
          <AnimatePresence>
            {expanded === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase">Resposta rápida</span>
                    <p className="text-sm text-foreground mt-1">{obj.resposta_curta}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase">Resposta completa</span>
                    <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{obj.resposta_completa}</p>
                  </div>
                  {obj.tecnica && (
                    <p className="text-xs text-muted-foreground italic">Técnica: {obj.tecnica}</p>
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
