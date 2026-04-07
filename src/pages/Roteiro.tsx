import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ScriptRenderer from '@/components/geracao/ScriptRenderer';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Copy, Loader2,
  ChevronDown, ChevronUp, Eye, Pencil, RotateCcw, AlertCircle,
  FileText, X, Star, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { svpApi } from '@/lib/api-svp';
import { supabase } from '@/integrations/supabase/client';
import PecasPanel from '@/components/roteiro/PecasPanel';
import type {
  SessaoVenda, BlocoRoteiro, SecaoRoteiro, SecaoEstado, RoteiroJSON, RoteiroBloco, FollowUpItem,
} from '@/types/crm';

/* ─────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────── */

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

const LEGACY_ORDER = ['abertura', 'descoberta', 'apresentacao_solucao', 'tratamento_objecoes', 'fechamento'];
const LEGACY_NAMES: Record<string, string> = {
  abertura: 'Abertura',
  descoberta: 'Diagnóstico',
  apresentacao_solucao: 'Solução',
  tratamento_objecoes: 'Objeções',
  fechamento: 'Fechamento',
};

const FASE_COLORS: Record<string, string> = {
  abertura:             '#1E3FA8',  // azul SVP profundo
  descoberta:           '#254DC7',  // azul SVP médio
  diagnostico:          '#254DC7',
  apresentacao_solucao: '#254DC7',
  solucao:              '#3B6FE8',  // azul SVP brilhante
  oferta:               '#E8A020',  // âmbar
  tratamento_objecoes:  '#E03E3E',  // vermelho
  objecoes:             '#E03E3E',
  fechamento:           '#1D9E6F',  // verde-azulado
};
const INDEX_COLORS = ['#1E3FA8', '#254DC7', '#3B6FE8', '#E8A020', '#E03E3E', '#1D9E6F'];

const FASE_DESCRICOES: Record<string, string> = {
  abertura:             'Gerar autoridade e segurança emocional antes de qualquer pergunta.',
  descoberta:           'Extrair problema, desejo e critério de compra nas palavras do cliente.',
  diagnostico:          'Extrair problema, desejo e critério de compra nas palavras do cliente.',
  apresentacao_solucao: 'Apresentar metodologia conectada ao que o cliente verbalizou.',
  solucao:              'Apresentar metodologia conectada ao que o cliente verbalizou.',
  oferta:               'Cliente entra mentalmente no projeto antes de ouvir o número.',
  tratamento_objecoes:  'Cada resposta reconhece, revela o problema oculto e constrói desejo.',
  objecoes:             'Cada resposta reconhece, revela o problema oculto e constrói desejo.',
  fechamento:           'Nunca sair sem próximo passo com data — fechou ou não fechou.',
};

function getFaseColor(bloco: string, index: number): string {
  return FASE_COLORS[bloco.toLowerCase()] ?? INDEX_COLORS[index % INDEX_COLORS.length];
}

const SCORE_LABELS: Record<string, string> = {
  clareza:           'Clareza',
  objecoes_cobertas: 'Objeções Cobertas',
  adequacao_nicho:   'Adequação ao Nicho',
  personalizacao:    'Personalização',
  urgencia:          'Urgência',
  tom:               'Tom',
};

/** Max value per score axis — used to compute percentage for color coding */
const SCORE_AXIS_MAX: Record<string, number> = {
  personalizacao:    30,
  clareza:           25,
  urgencia:          20,
  tom:               25,
  objecoes_cobertas: 20,
  adequacao_nicho:   20,
};

/* ─────────────────────────────────────────────────
   API helper
───────────────────────────────────────────────── */

async function callFn<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

/* ─────────────────────────────────────────────────
   splitDiagnosticoScript
   Separa o script de Diagnóstico em segmentos por
   BLOCO N — LABEL e CONFIRMAÇÃO OBRIGATÓRIA.
───────────────────────────────────────────────── */

function formatBlocoLabel(raw: string): string {
  // "BLOCO 1 — DESAFIOS" → "Bloco 1 — Desafios"
  // "CONFIRMAÇÃO OBRIGATÓRIA" → "Confirmação obrigatória"
  return raw
    .replace(/:$/, '')
    .trim()
    .toLowerCase()
    .split(/(\s*[—–]\s*)/)
    .map(part => /^\s*[—–]\s*$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function splitDiagnosticoScript(script: string): Array<{ label: string; conteudo: string }> {
  // Captura marcadores BLOCO N — LABEL: e CONFIRMAÇÃO OBRIGATÓRIA como delimitadores
  const BLOCO_RE = /(BLOCO\s+\d+\s*[—–-]+[^:\n]+:?|CONFIRMAÇÃO\s+OBRIGATÓRIA)/gi;
  const parts = script.split(BLOCO_RE);
  // parts = [antes, "BLOCO 1 — DESAFIOS:", conteudo1, "BLOCO 2 — ...", conteudo2, ...]
  const segments: Array<{ label: string; conteudo: string }> = [];
  for (let i = 1; i < parts.length; i += 2) {
    const content = (parts[i + 1] ?? '').trim();
    if (content) segments.push({ label: formatBlocoLabel(parts[i]), conteudo: content });
  }
  return segments;
}

/* ─────────────────────────────────────────────────
   normalizeBlocos
───────────────────────────────────────────────── */

function normalizeBlocos(roteiro: RoteiroJSON, followUp?: FollowUpItem[]): BlocoRoteiro[] {
  const rr = roteiro.roteiro_reuniao;

  if (Array.isArray(rr)) {
    if (rr.length > 0 && 'secoes' in rr[0]) return rr as unknown as BlocoRoteiro[];

    // New 6-block PASTOR format — extract all rich fields per block
    return (rr as unknown as RoteiroBloco[]).map((b, i) => {
      const sections: SecaoRoteiro[] = [];
      const bloco = (b.bloco || '').toLowerCase();
      const num   = b.numero ?? i + 1;

      // ── Generic script — acordeão ──
      if (b.script) {
        const isDiscovery = bloco === 'descoberta' || bloco === 'diagnostico';

        if (isDiscovery) {
          // Diagnóstico: divide por BLOCO 1/2/3 + CONFIRMAÇÃO
          const segmentos = splitDiagnosticoScript(b.script);
          if (segmentos.length > 1) {
            segmentos.forEach((seg, j) =>
              sections.push({ id: `${bloco}-script-${j}`, tipo: 'oferta', label: seg.label, conteudo: seg.conteudo })
            );
          } else {
            // Fallback se não encontrou BLOCOs — exibe o script inteiro
            sections.push({ id: `${bloco}-script`, tipo: 'oferta', label: 'Script de diagnóstico', conteudo: b.script });
          }
        } else {
          const scriptLabel =
            bloco === 'abertura'                                       ? 'Script de abertura'  :
            bloco === 'solucao' || bloco === 'apresentacao_solucao'    ? 'Abertura da solução' :
            'Script';
          sections.push({ id: `${bloco}-script`, tipo: 'oferta', label: scriptLabel, conteudo: b.script });
        }
      }

      // ── Perguntas-chave (diagnostico) ──
      if (Array.isArray(b.perguntas) && b.perguntas.length > 0) {
        sections.push({
          id: `${bloco}-perguntas`, tipo: 'instrucao', label: 'Perguntas-chave',
          conteudo: (b.perguntas as string[]).map(p => `• ${p}`).join('\n'),
        });
      }

      // ── Fases da solução — cada fase vira um acordeão ──
      if (Array.isArray(b.fases) && b.fases.length > 0) {
        (b.fases as { nome: string; descricao: string; ganho_cliente: string; micro_sin: string }[]).forEach((fase, j) => {
          sections.push({
            id: `${bloco}-fase-${j}`,
            tipo: 'fase',
            label: `Fase ${j + 1} — ${fase.nome}`,
            conteudo: fase.descricao ?? '',
            ganho_cliente: fase.ganho_cliente ?? '',
            micro_sin: fase.micro_sin ?? '',
          });
        });
      }

      // ── Oferta: 4 acordeões (mesmo padrão visual de Objeções) ──
      if (b.script_entregaveis) {
        sections.push({ id: `${bloco}-entregaveis`,  tipo: 'oferta', label: 'Compilado de entregáveis',         conteudo: b.script_entregaveis });
      }
      if (b.script_proximos_passos) {
        sections.push({ id: `${bloco}-proxpassos`,   tipo: 'oferta', label: 'Próximos passos — antes do preço', conteudo: b.script_proximos_passos });
      }
      if (b.script_preco) {
        sections.push({ id: `${bloco}-preco`,        tipo: 'oferta', label: 'Preço com âncora',                 conteudo: b.script_preco });
      }
      if (b.script_avanco) {
        sections.push({ id: `${bloco}-avanco`,       tipo: 'oferta', label: 'Técnica de avanço',                conteudo: b.script_avanco });
      }

      // ── Objeções (objecoes) ──
      if (Array.isArray(b.objecoes) && b.objecoes.length > 0) {
        sections.push({ id: `${bloco}-label-situacoes`, tipo: 'label', label: 'Scripts por situação', conteudo: '' });
        (b.objecoes as { situacao: string; resposta: string; instrucao?: string }[]).forEach((obj, j) => {
          const conteudo = [
            obj.resposta,
            obj.instrucao ? `\n\n📋 ${obj.instrucao}` : '',
          ].filter(Boolean).join('');
          sections.push({ id: `${bloco}-objecao-${j}`, tipo: 'objecao', label: obj.situacao, conteudo });
        });
      }

      // ── Fechamento: acordeões "Se fechou" / "Se não fechou" ──
      if (b.script_fechou) {
        sections.push({ id: `${bloco}-fechou`,    tipo: 'oferta', label: 'Se fechou',    conteudo: b.script_fechou });
      }
      if (b.script_nao_fechou) {
        sections.push({ id: `${bloco}-naofechou`, tipo: 'oferta', label: 'Se não fechou', conteudo: b.script_nao_fechou });
      }

      // ── Follow-up (apenas no bloco de fechamento) ──
      const isFechamento = bloco === 'fechamento' || bloco === 'fechamento_agendamento';
      if (isFechamento && Array.isArray(followUp) && followUp.length > 0) {
        sections.push({ id: `${bloco}-label-followup`, tipo: 'label', label: 'Mensagens de follow-up', conteudo: '' });
        followUp.forEach((fu, j) => {
          sections.push({
            id: `${bloco}-followup-${j}`,
            tipo: 'followup',
            label: `${fu.tentativa}ª tentativa — ${fu.momento}`,
            conteudo: fu.mensagem,
          });
        });
      }

      // ── Instruções de conduta + adaptações ──
      // Oferta: expandido por padrão (o vendedor precisa ver as regras do silêncio/negociação)
      // Demais fases: colapsado para não poluir
      const isOferta = bloco === 'oferta';
      if (b.instrucoes_conduta) {
        sections.push({
          id: `${bloco}-instrucoes`,
          tipo: 'instrucao',
          label: isOferta ? 'Como conduzir' : 'Instruções de Conduta',
          conteudo: b.instrucoes_conduta,
          collapsedByDefault: isOferta ? false : true,
        });
      }
      if (b.adaptacoes) {
        sections.push({ id: `${bloco}-adaptacoes`, tipo: 'instrucao', label: 'Adaptações', conteudo: b.adaptacoes, collapsedByDefault: true });
      }

      // ── Fallback ──
      if (sections.length === 0) {
        sections.push({ id: `${bloco}-${num}`, tipo: 'script', label: b.titulo, conteudo: b.nota_tecnica ?? b.tecnica ?? '' });
      }

      // ── Insight card (nota_tecnica / tecnica) no topo da fase ──
      const insight = b.nota_tecnica ?? (sections.length > 0 ? b.tecnica : undefined);
      if (insight && sections.length > 0) {
        sections.unshift({ id: `${bloco}-insight`, tipo: 'insight', label: b.titulo, conteudo: insight });
      }

      return { numero: num, bloco: b.bloco, titulo: b.titulo, tempo: b.tempo, secoes: sections };
    });
  }

  const legacy = rr as Record<string, Record<string, unknown>>;
  const orderedKeys = [
    ...LEGACY_ORDER.filter(k => k in legacy),
    ...Object.keys(legacy).filter(k => !LEGACY_ORDER.includes(k)),
  ];

  let cum = 0;
  return orderedKeys.map((key, i) => {
    const val = legacy[key];
    const dur = (val.duracao_min as number) ?? 0;
    const timeLabel = dur ? `${cum}–${cum + dur} min` : '—';
    cum += dur;

    const sections: SecaoRoteiro[] = [];
    const hasScript = Boolean(val.script);

    // Script first — primary actionable content during meeting
    if (val.script) {
      sections.push({ id: `${key}-script`, tipo: 'script', label: 'Script', conteudo: val.script as string });
    }
    // Objetivo after script — context card, collapsed by default when script is present
    if (val.objetivo) {
      sections.push({ id: `${key}-objetivo`, tipo: 'instrucao', label: 'Objetivo da fase', conteudo: val.objetivo as string, collapsedByDefault: hasScript });
    }
    if (Array.isArray(val.dicas) && val.dicas.length > 0) {
      sections.push({ id: `${key}-dicas`, tipo: 'instrucao', label: 'Dicas da fase', conteudo: (val.dicas as string[]).map(d => `• ${d}`).join('\n') });
    }
    if (Array.isArray(val.perguntas) && val.perguntas.length > 0) {
      sections.push({ id: `${key}-perguntas`, tipo: 'instrucao', label: 'Perguntas-chave', conteudo: (val.perguntas as string[]).map(p => `• ${p}`).join('\n') });
    }
    if (Array.isArray(val.pontos_chave) && val.pontos_chave.length > 0) {
      sections.push({ id: `${key}-pontos`, tipo: 'instrucao', label: 'Pontos-chave', conteudo: (val.pontos_chave as string[]).map(p => `• ${p}`).join('\n') });
    }
    if (Array.isArray(val.tecnicas) && val.tecnicas.length > 0) {
      sections.push({ id: `${key}-tecnicas`, tipo: 'instrucao', label: 'Técnicas', conteudo: (val.tecnicas as string[]).map(t => `• ${t}`).join('\n') });
    }
    if (Array.isArray(val.objecoes_previstas) && val.objecoes_previstas.length > 0) {
      (val.objecoes_previstas as { objecao: string; resposta: string }[]).forEach((obj, j) => {
        sections.push({ id: `${key}-objecao-${j}`, tipo: 'objecao', label: obj.objecao, conteudo: obj.resposta });
      });
    }
    if (sections.length === 0) {
      sections.push({ id: `${key}-script`, tipo: 'script', label: LEGACY_NAMES[key] || key, conteudo: (val.objetivo as string) || '' });
    }

    return { numero: i + 1, bloco: key, titulo: LEGACY_NAMES[key] || key, tempo: timeLabel, secoes: sections };
  });
}

/* ─────────────────────────────────────────────────
   Score helpers
───────────────────────────────────────────────── */

function getScoreColor(s: number) {
  return s < 60 ? 'text-red-500' : s < 80 ? 'text-amber-500' : 'text-green-400';
}
function getScoreBg(s: number) {
  return s < 60 ? 'bg-red-500/10 border-red-500/30' : s < 80 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-green-500/10 border-green-500/30';
}

/* ─────────────────────────────────────────────────
   SecaoInsight — card colorido com accentColor (nota_tecnica)
───────────────────────────────────────────────── */

function SecaoInsight({ secao, accentColor = '#1E3FA8' }: { secao: SecaoRoteiro; accentColor?: string }) {
  // nota_tecnica format: "Concept Title\n\nDescription text"
  // First paragraph = bold colored insight title; rest = muted description
  const parts = secao.conteudo.split(/\n\n+/);
  const insightTitle = parts[0]?.trim() || secao.label;
  const insightDesc  = parts.slice(1).join('\n\n').trim();

  return (
    <div
      className="rounded-xl flex items-start gap-3 px-4 py-3"
      style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}30` }}
    >
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
        style={{ background: accentColor, color: 'white' }}
      >
        ✦
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-semibold leading-snug" style={{ color: accentColor }}>
          {insightTitle}
        </p>
        {insightDesc && (
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {insightDesc}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   SecaoLabel — separador de seção muted cinza
───────────────────────────────────────────────── */

function SecaoLabel({ secao }: { secao: SecaoRoteiro }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 pt-1">
      {secao.label}
    </p>
  );
}

/* ─────────────────────────────────────────────────
   SecaoFase — card de fase da solução com chip Micro-sin
───────────────────────────────────────────────── */

function SecaoFase({ secao, accentColor = '#1E3FA8' }: { secao: SecaoRoteiro; accentColor?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl border border-border bg-card cursor-pointer select-none transition-colors hover:bg-muted/20"
      onClick={() => setOpen(o => !o)}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: accentColor }} />
          <span className="text-sm text-foreground truncate">{secao.label}</span>
        </div>
        {open
          ? <ChevronUp   className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-3 border-t border-border space-y-2.5"
              onClick={e => e.stopPropagation()}
            >
              {secao.conteudo && (
                <p className="text-[13px] text-foreground leading-relaxed">{secao.conteudo}</p>
              )}
              {secao.ganho_cliente && (
                <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                  <span className="font-medium">Cliente ganha:</span> {secao.ganho_cliente}
                </p>
              )}
              {secao.micro_sin && (
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium"
                  style={{
                    background: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${accentColor} 22%, transparent)`,
                    color: accentColor,
                  }}
                >
                  Micro-sin: &ldquo;{secao.micro_sin}&rdquo;
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   SecaoInstrucao — read-only, amber-tinted, compact
───────────────────────────────────────────────── */

function SecaoInstrucao({ secao, accentColor }: { secao: SecaoRoteiro; accentColor?: string }) {
  const [collapsed, setCollapsed] = useState(secao.collapsedByDefault ?? false);

  if (secao.collapsedByDefault !== undefined) {
    const ac = accentColor ?? '#8B8B88';
    return (
      <div
        className="rounded-lg border"
        style={{ borderColor: `${ac}28`, background: `${ac}08` }}
      >
        <button
          className="w-full flex items-center justify-between px-4 py-2.5 text-left"
          onClick={() => setCollapsed(c => !c)}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: ac }}
          >
            {secao.label}
          </p>
          {collapsed
            ? <ChevronDown className="h-3 w-3 shrink-0" style={{ color: `${ac}80` }} />
            : <ChevronUp   className="h-3 w-3 shrink-0" style={{ color: `${ac}80` }} />}
        </button>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 pt-2" style={{ borderTop: `1px solid ${ac}18` }}>
                <ScriptRenderer content={secao.conteudo} accentColor={accentColor} compact />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* Versão aberta */
  return (
    <div className="rounded-lg border border-border/60 bg-card px-4 py-3">
      <p
        className="text-[10px] font-semibold uppercase tracking-widest mb-3"
        style={{ color: accentColor ?? 'hsl(var(--muted-foreground))' }}
      >
        {secao.label}
      </p>
      <ScriptRenderer content={secao.conteudo} accentColor={accentColor} compact />
    </div>
  );
}

/* ─────────────────────────────────────────────────
   SecaoObjecao — accordion, click anywhere to expand
───────────────────────────────────────────────── */

function SecaoObjecao({ secao }: { secao: SecaoRoteiro }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl border border-border bg-card cursor-pointer select-none transition-colors hover:bg-muted/20"
      onClick={() => setOpen(o => !o)}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
          <span className="text-sm text-foreground truncate">{secao.label}</span>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 border-t border-border">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {secao.conteudo}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   SecaoOferta — acordeão idêntico ao de Objeções,
   mas renderiza ScriptRenderer (💬 Fale + ⏸ pausa)
───────────────────────────────────────────────── */

function SecaoOferta({ secao, accentColor = '#E8A020' }: { secao: SecaoRoteiro; accentColor?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl border border-border bg-card cursor-pointer select-none transition-colors hover:bg-muted/20"
      onClick={() => setOpen(o => !o)}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: accentColor }} />
          <span className="text-sm text-foreground truncate">{secao.label}</span>
        </div>
        {open
          ? <ChevronUp   className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-3 border-t border-border"
              onClick={e => e.stopPropagation()}
            >
              <ScriptRenderer content={secao.conteudo} accentColor={accentColor} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   SecaoFollowUp — card de follow-up com número de tentativa
───────────────────────────────────────────────── */

function SecaoFollowUp({ secao }: { secao: SecaoRoteiro }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(secao.conteudo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {secao.label}
        </p>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied
            ? <><Check className="h-3 w-3 text-green-500" /><span className="text-green-500">Copiado</span></>
            : <><Copy className="h-3 w-3" />Copiar</>
          }
        </button>
      </div>
      <div className="px-4 py-3">
        <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
          {secao.conteudo}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   SecaoScript — full card with Aprovar/Editar/Regenerar
───────────────────────────────────────────────── */

function SecaoScript({
  secao, estado, isFocused, onFocus, onAprovar, onSalvarEdicao, onRegenerar, accentColor,
}: {
  secao: SecaoRoteiro;
  estado?: SecaoEstado;
  isFocused: boolean;
  onFocus: () => void;
  accentColor?: string;
  onAprovar: () => void;
  onSalvarEdicao: (texto: string) => void;
  onRegenerar: (feedback?: string) => void;
}) {
  const [editando, setEditando]             = useState(false);
  const [textoEdit, setTextoEdit]           = useState('');
  const [showRaciocinio, setShowRaciocinio] = useState(false);
  const [showFeedback, setShowFeedback]     = useState(false);
  const [feedback, setFeedback]             = useState('');
  const [regenerando, setRegenerando]       = useState(false);

  const aprovada = estado?.aprovada ?? false;
  const editada  = estado?.editada  ?? false;
  const conteudo = editada && estado?.texto_editado ? estado.texto_editado : secao.conteudo;

  const activeColor = aprovada ? '#1D9E6F' : editada ? '#3B6FE8' : (accentColor ?? 'hsl(var(--primary))');

  const handleRegenerar = async () => {
    setRegenerando(true);
    await onRegenerar(feedback || undefined);
    setRegenerando(false);
    setShowFeedback(false);
    setFeedback('');
  };

  // Hide the label when it's the generic fallback ("Script" / "script")
  const isGenericLabel = !secao.label || secao.label.toLowerCase() === 'script';

  return (
    <div
      className="space-y-1.5 outline-none"
      onClick={onFocus}
      tabIndex={0}
      style={isFocused ? { outline: `2px solid ${activeColor}22`, outlineOffset: 6, borderRadius: 10 } : {}}
    >
      {/* Label — only for non-generic, descriptive labels */}
      {!isGenericLabel && (
        <div className="flex items-center gap-2 pl-0.5">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: activeColor }}
          >
            {secao.label}
          </span>
          {aprovada && (
            <span className="text-[9px] text-green-500 font-medium flex items-center gap-0.5">
              <Check className="h-2.5 w-2.5" /> Aprovado
            </span>
          )}
          {editada && !aprovada && (
            <span className="text-[9px] text-blue-400 font-medium flex items-center gap-0.5">
              <Pencil className="h-2.5 w-2.5" /> Editado
            </span>
          )}
        </div>
      )}

      {/* Content — ScriptRenderer default mode creates its own cards per block.
          Section labels (BLOCO 1, BLOCO 2…) become gray separators between cards.
          Instructions become their own "Como conduzir" cards.
          Single-section content → one bordered card; multi-section → multiple cards. */}
      {editando ? (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <Textarea
            value={textoEdit}
            onChange={e => setTextoEdit(e.target.value)}
            rows={8}
            className="text-sm font-mono resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{textoEdit.length} caracteres</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { onSalvarEdicao(textoEdit); setEditando(false); }}>Salvar</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditando(false)}>Cancelar</Button>
            </div>
          </div>
        </div>
      ) : (
        <ScriptRenderer content={conteudo} accentColor={activeColor} />
      )}

      {/* Raciocínio */}
      {secao.raciocinio && !editando && (
        <div className="pl-1 pt-1">
          <button
            onClick={e => { e.stopPropagation(); setShowRaciocinio(!showRaciocinio); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <Eye className="h-3 w-3" />
            {showRaciocinio ? 'Ocultar raciocínio ↑' : 'Ver raciocínio ↓'}
          </button>
          <AnimatePresence>
            {showRaciocinio && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-2 p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground whitespace-pre-wrap">{secao.raciocinio}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Feedback input for regeneration */}
      {showFeedback && (
        <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-amber-500/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-500/90 leading-snug">
              O script atual será substituído — não há como desfazer.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">O que precisa mudar? <span className="text-muted-foreground/60">(opcional)</span></p>
          <Input
            placeholder="Ex: mais direto, usar o vocabulário dele..."
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            className="text-sm"
            onKeyDown={e => e.key === 'Enter' && handleRegenerar()}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleRegenerar} disabled={regenerando} className="bg-amber-600 hover:bg-amber-500 text-white">
              {regenerando ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Regenerando...</> : 'Confirmar →'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowFeedback(false); setFeedback(''); }}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Actions — only when focused */}
      {!editando && !showFeedback && isFocused && (
        <div className="flex items-center gap-2 pl-1">
          <Button
            size="sm"
            variant={aprovada ? 'outline' : 'default'}
            onClick={e => { e.stopPropagation(); onAprovar(); }}
            className={`text-xs h-7 ${aprovada ? 'text-green-500 border-green-500/40 hover:bg-green-500/10' : ''}`}
          >
            <Check className="mr-1 h-3 w-3" />{aprovada ? 'Aprovado' : 'Aprovar'}
          </Button>
          <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setTextoEdit(conteudo); setEditando(true); }} className="text-xs h-7">
            <Pencil className="mr-1 h-3 w-3" /> Editar
          </Button>
          <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setShowFeedback(true); }} className="text-xs h-7">
            <RotateCcw className="mr-1 h-3 w-3" /> Regenerar
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   SecaoCard — router to correct sub-component
───────────────────────────────────────────────── */

function SecaoCard(props: {
  secao: SecaoRoteiro;
  estado?: SecaoEstado;
  isFocused: boolean;
  onFocus: () => void;
  onAprovar: () => void;
  onSalvarEdicao: (texto: string) => void;
  onRegenerar: (feedback?: string) => void;
  accentColor?: string;
}) {
  if (props.secao.tipo === 'label')     return <SecaoLabel     secao={props.secao} />;
  if (props.secao.tipo === 'fase')      return <SecaoFase      secao={props.secao} accentColor={props.accentColor} />;
  if (props.secao.tipo === 'insight')   return <SecaoInsight   secao={props.secao} accentColor={props.accentColor} />;
  if (props.secao.tipo === 'instrucao') return <SecaoInstrucao secao={props.secao} accentColor={props.accentColor} />;
  if (props.secao.tipo === 'objecao')   return <SecaoObjecao   secao={props.secao} />;
  if (props.secao.tipo === 'oferta')    return <SecaoOferta    secao={props.secao} accentColor={props.accentColor} />;
  if (props.secao.tipo === 'followup')  return <SecaoFollowUp  secao={props.secao} />;
  return <SecaoScript {...props} />;
}

/* ─────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────── */

export default function RoteiroPage() {
  const { sessao_id } = useParams<{ sessao_id: string }>();
  const navigate      = useNavigate();

  const [sessao, setSessao]             = useState<SessaoVenda | null>(null);
  const [blocos, setBlocos]             = useState<BlocoRoteiro[]>([]);
  const [secoesEstado, setSecoesEstado] = useState<Record<string, SecaoEstado>>({});
  const [faseAtiva, setFaseAtiva]       = useState(0);
  const [focusedSecao, setFocusedSecao] = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [pecasOpen, setPecasOpen]       = useState(false);
  const mainRef                         = useRef<HTMLElement>(null);

  // ── Avaliação de efetividade por bloco (1–5 estrelas) ──
  const [avaliacoes, setAvaliacoes]           = useState<Record<string, number>>({});

  // ── Regenerar bloco com IA ──
  const [showRegenerarBloco, setShowRegenerarBloco] = useState(false);
  const [instrucaoBloco, setInstrucaoBloco]         = useState('');
  const [regenerandoBloco, setRegenerandoBloco]     = useState(false);

  /* ── Sidebar resize ─────────────────────────────── */
  const ROTEIRO_SIDEBAR_KEY = 'svp-roteiro-sidebar-width';
  const ROTEIRO_SIDEBAR_MIN = 180;
  const ROTEIRO_SIDEBAR_MAX = 360;
  const ROTEIRO_SIDEBAR_DEFAULT = 220;

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const n = Number(localStorage.getItem(ROTEIRO_SIDEBAR_KEY));
      if (n >= ROTEIRO_SIDEBAR_MIN && n <= ROTEIRO_SIDEBAR_MAX) return n;
    } catch {}
    return ROTEIRO_SIDEBAR_DEFAULT;
  });
  const [sidebarDragging, setSidebarDragging] = useState(false);
  const dragStartX   = useRef<number>(0);
  const dragStartW   = useRef<number>(sidebarWidth);

  const handleSidebarDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartW.current = sidebarWidth;
    setSidebarDragging(true);

    const onMove = (ev: MouseEvent) => {
      const next = Math.max(ROTEIRO_SIDEBAR_MIN, Math.min(ROTEIRO_SIDEBAR_MAX, dragStartW.current + ev.clientX - dragStartX.current));
      setSidebarWidth(next);
      try { localStorage.setItem(ROTEIRO_SIDEBAR_KEY, String(next)); } catch {}
    };
    const onUp = () => {
      setSidebarDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [sidebarWidth]);

  /* Scroll + reset regenerar ao trocar de fase */
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setShowRegenerarBloco(false);
    setInstrucaoBloco('');
  }, [faseAtiva]);

  /* Load session */
  useEffect(() => {
    if (!sessao_id) return;
    setLoading(true);
    svpApi.buscarSessao(sessao_id)
      .then(res => {
        const s = res.sessoes?.[0];
        if (!s) { setError('Sessão não encontrada.'); setLoading(false); return; }
        if (!s.roteiro_json) { navigate(`/loading/${sessao_id}`, { replace: true }); return; }
        setSessao(s);
        setBlocos(normalizeBlocos(s.roteiro_json, s.follow_up_json ?? undefined));
        setSecoesEstado((s as any).secoes_estado ?? {});
        setAvaliacoes((s.dados_formulario as any)?.avaliacoes_blocos ?? {});
        setLoading(false);
      })
      .catch(err => { setError(err.message || 'Erro ao carregar sessão.'); setLoading(false); });
  }, [sessao_id]);

  /* Keyboard shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); setFaseAtiva(f => Math.min(f + 1, blocos.length - 1)); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setFaseAtiva(f => Math.max(f - 1, 0)); }
      else if ((e.key === 'a' || e.key === 'A') && focusedSecao) handleAprovar(focusedSecao);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [blocos.length, focusedSecao]);

  /* Derived values */
  const roteiro      = sessao?.roteiro_json;
  const score        = roteiro?.score ?? 0;
  const scoreBreak   = roteiro?.score_breakdown;
  const dadosForm    = sessao?.dados_formulario as Record<string, string> | undefined;
  const nomeCliente  = dadosForm?.nome_cliente  || 'Lead';
  const nicho        = sessao?.nicho || '';
  const estadoEmoc   = dadosForm?.estado_emocional || null;
  const perfilDec    = dadosForm?.perfil_decisor    || null;
  const dataSessao   = sessao?.criado_em ? new Date(sessao.criado_em).toLocaleDateString('pt-BR') : '';

  const getFaseStatus = useCallback((idx: number): 'pendente' | 'aprovado' | 'editando' => {
    const b = blocos[idx];
    if (!b) return 'pendente';
    // Only script sections count toward approval
    const scripts = b.secoes.filter(s => s.tipo === 'script');
    if (scripts.length === 0) return 'pendente';
    if (scripts.every(s => secoesEstado[s.id]?.aprovada)) return 'aprovado';
    if (scripts.some(s => secoesEstado[s.id]?.editada && !secoesEstado[s.id]?.aprovada)) return 'editando';
    return 'pendente';
  }, [blocos, secoesEstado]);

  const hasAnyPeca = sessao && (sessao.proposta_json || sessao.email_json || sessao.whatsapp_json || sessao.objecoes_json);

  /* Actions */
  const handleAprovar = useCallback(async (secaoId: string) => {
    const cur = secoesEstado[secaoId];
    const next = !cur?.aprovada;
    setSecoesEstado(prev => ({ ...prev, [secaoId]: { ...prev[secaoId], aprovada: next, editada: prev[secaoId]?.editada ?? false, atualizado_em: new Date().toISOString() } }));
    try {
      await callFn('roteiro-aprovar-secao', { sessao_id, secao_id: secaoId, aprovada: next });
    } catch {
      setSecoesEstado(prev => ({ ...prev, [secaoId]: { ...prev[secaoId], aprovada: !next } }));
      toast.error('Erro ao aprovar seção');
    }
  }, [secoesEstado, sessao_id]);

  const handleSalvarEdicao = useCallback(async (secaoId: string, texto: string) => {
    setSecoesEstado(prev => ({ ...prev, [secaoId]: { ...prev[secaoId], editada: true, texto_editado: texto, aprovada: prev[secaoId]?.aprovada ?? false, atualizado_em: new Date().toISOString() } }));
    try {
      await callFn('roteiro-editar-secao', { sessao_id, secao_id: secaoId, texto_editado: texto });
      toast.success('Edição salva');
    } catch { toast.error('Erro ao salvar edição'); }
  }, [sessao_id]);

  const handleRegenerar = useCallback(async (secaoId: string, feedback?: string) => {
    try {
      const res = await callFn<{ conteudo: string }>('roteiro-regenerar-secao', { sessao_id, secao_id: secaoId, feedback });
      setBlocos(prev => prev.map(b => ({ ...b, secoes: b.secoes.map(s => s.id === secaoId ? { ...s, conteudo: res.conteudo } : s) })));
      setSecoesEstado(prev => ({ ...prev, [secaoId]: { aprovada: false, editada: false, atualizado_em: new Date().toISOString() } }));
      toast.success('Seção regenerada');
    } catch { toast.error('Erro ao regenerar seção'); }
  }, [sessao_id]);

  const handleCopiarRoteiro = useCallback(() => {
    const text = blocos.map(b => {
      const lines = b.secoes.map(s => {
        const est = secoesEstado[s.id];
        const c = est?.editada && est.texto_editado ? est.texto_editado : s.conteudo;
        return `[${s.tipo.toUpperCase()}] ${s.label}\n${c}`;
      }).join('\n\n');
      return `━━━ FASE ${b.numero}: ${b.titulo} (${b.tempo}) ━━━\n\n${lines}`;
    }).join('\n\n\n');
    navigator.clipboard.writeText(text);
    toast.success('Roteiro copiado!');
  }, [blocos, secoesEstado]);

  /** Copy only the Script section(s) of the active phase */
  const handleCopiarFase = useCallback(() => {
    const b = blocos[faseAtiva];
    if (!b) return;
    const scripts = b.secoes.filter(s => s.tipo === 'script');
    if (scripts.length === 0) { toast.error('Nenhum script nesta fase'); return; }
    const text = scripts.map(s => {
      const est = secoesEstado[s.id];
      return est?.editada && est.texto_editado ? est.texto_editado : s.conteudo;
    }).join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success(`Script "${b.titulo}" copiado!`);
  }, [blocos, faseAtiva, secoesEstado]);

  /* ── Avaliar efetividade do bloco ── */
  const handleAvaliar = useCallback(async (blocoKey: string, nota: number) => {
    const novasAvaliacoes = { ...avaliacoes, [blocoKey]: nota };
    setAvaliacoes(novasAvaliacoes);
    try {
      const dadosAtuais = (sessao?.dados_formulario ?? {}) as Record<string, unknown>;
      await supabase.from('sessoes_venda').update({
        dados_formulario: { ...dadosAtuais, avaliacoes_blocos: novasAvaliacoes },
      }).eq('id', sessao_id!);
    } catch { toast.error('Erro ao salvar avaliação'); }
  }, [avaliacoes, sessao, sessao_id]);

  /* ── Regenerar bloco inteiro com IA ── */
  const handleRegenerarBloco = useCallback(async () => {
    if (!instrucaoBloco.trim()) return;
    setRegenerandoBloco(true);
    try {
      const res = await callFn<{ ok: boolean; bloco: RoteiroBloco }>(
        'regenerar-bloco',
        { sessao_id, bloco_index: faseAtiva, instrucao: instrucaoBloco.trim() },
      );

      // Atualiza sessão local e renormaliza os blocos
      setSessao(prev => {
        if (!prev?.roteiro_json) return prev;
        const rr = [...((prev.roteiro_json.roteiro_reuniao ?? []) as RoteiroBloco[])];
        rr[faseAtiva] = res.bloco;
        const novoRoteiro = { ...prev.roteiro_json, roteiro_reuniao: rr };
        setBlocos(normalizeBlocos(novoRoteiro as any, prev.follow_up_json ?? undefined));
        return { ...prev, roteiro_json: novoRoteiro as any };
      });

      toast.success('Bloco regenerado com sucesso!');
      setShowRegenerarBloco(false);
      setInstrucaoBloco('');
    } catch (err: any) {
      toast.error('Erro ao regenerar: ' + (err.message ?? 'tente novamente'));
    } finally {
      setRegenerandoBloco(false);
    }
  }, [instrucaoBloco, faseAtiva, sessao_id]);

  /* ── Loading / Error ── */
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando roteiro...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
        </div>
      </div>
    );
  }

  const blocoAtivo  = blocos[faseAtiva];
  const faseColor   = blocoAtivo ? getFaseColor(blocoAtivo.bloco, faseAtiva) : '#1E3FA8';
  const isLastPhase = faseAtiva === blocos.length - 1;

  /* ── Render ── */
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">

      {/* ═══ HEADER ═══ */}
      <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0 z-20">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="shrink-0 gap-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="h-5 w-px bg-border" />
        {/* Lead identity — primary context */}
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <span className="font-semibold text-[14px] text-foreground leading-tight truncate">{nomeCliente}</span>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {nicho && <span className="hidden sm:inline truncate">{nicho}</span>}
            {nicho && dataSessao && <span className="hidden md:inline">·</span>}
            {dataSessao && <span className="hidden md:inline">{dataSessao}</span>}
          </div>
        </div>
        {/* Score badge */}
        <div className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-bold shrink-0 ${getScoreBg(score)} ${getScoreColor(score)}`}>
          {score}/100
        </div>
        {/* Action buttons — grouped, consistent */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setPecasOpen(true)} className="gap-1.5 relative">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Materiais</span>
            {hasAnyPeca && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500" />}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopiarRoteiro} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Copiar roteiro</span>
          </Button>
        </div>
      </header>

      {/* ═══ BODY ═══ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR ── */}
        <aside
          className="border-r border-border bg-card shrink-0 hidden md:flex flex-col overflow-y-auto relative"
          style={{ width: sidebarWidth }}
        >

          {/* Client context */}
          <div className="p-4 border-b border-border">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Roteiro SVP</p>
            {/* Name · Nicho on same line */}
            <p className="text-sm font-semibold text-foreground leading-tight truncate">
              {nomeCliente}{nicho ? ` · ${nicho}` : ''}
            </p>
            {/* Price · emotional state on same line */}
            {(sessao?.preco || estadoEmoc) && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {sessao?.preco ? `R$${Number(sessao.preco).toLocaleString('pt-BR')}/mês` : ''}
                {sessao?.preco && estadoEmoc ? ' · ' : ''}
                {estadoEmoc ?? ''}
              </p>
            )}
            {/* Roteiro progress bar */}
            {blocos.length > 0 && (
              <div className="mt-3 h-0.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round(
                      (blocos.filter((_, i) => getFaseStatus(i) === 'aprovado').length / blocos.length) * 100
                    )}%`,
                    background: '#1D9E6F',
                  }}
                />
              </div>
            )}
          </div>

          {/* Phase list */}
          <div className="p-2 space-y-0.5 flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground px-2 py-2">Fases</p>
            {blocos.map((bloco, i) => {
              const status   = getFaseStatus(i);
              const isActive = i === faseAtiva;
              const color    = getFaseColor(bloco.bloco, i);
              return (
                <button
                  key={bloco.bloco}
                  onClick={() => setFaseAtiva(i)}
                  className="w-full text-left rounded-lg transition-all"
                  style={isActive
                    ? {
                        padding: '8px 8px 8px 6px',
                        borderTop: '1px solid hsl(var(--border))',
                        borderRight: '1px solid hsl(var(--border))',
                        borderBottom: '1px solid hsl(var(--border))',
                        borderLeft: `3px solid ${color}`,
                        background: 'hsl(var(--background))',
                      }
                    : {
                        padding: '8px',
                        border: '1px solid hsl(var(--border) / 50%)',
                        background: 'hsl(var(--card))',
                      }
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold transition-all"
                      style={{
                        background: `${color}20`,
                        color,
                        border: `1.5px solid ${color}${status === 'aprovado' ? 'cc' : '50'}`,
                      }}
                    >
                      {status === 'aprovado' ? <Check className="h-3 w-3" /> : bloco.numero}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium leading-tight line-clamp-2 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {bloco.titulo}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{bloco.tempo}</p>
                    </div>
                    {status === 'aprovado' && (
                      <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Insights */}
          {(roteiro?.maior_medo || roteiro?.decisao_style || roteiro?.tom_ideal) && (
            <div className="p-3 border-t border-border space-y-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-2">Insights</p>
              {roteiro.maior_medo && (
                <div className="px-2.5 py-2 rounded-lg bg-red-500/5 border border-red-500/15 text-xs">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-red-400/70 mb-1">Maior medo</p>
                  <p className="text-foreground/90 leading-snug text-[12px]">{roteiro.maior_medo}</p>
                </div>
              )}
              {roteiro.decisao_style && (
                <div className="px-2.5 py-2 rounded-lg bg-blue-500/5 border border-blue-500/15 text-xs">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-blue-400/70 mb-1">Estilo de decisão</p>
                  <p className="text-foreground/90 leading-snug text-[12px]">{roteiro.decisao_style}</p>
                </div>
              )}
              {roteiro.tom_ideal && (
                <div className="px-2.5 py-2 rounded-lg bg-green-500/5 border border-green-500/15 text-xs">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-green-400/70 mb-1">Tom ideal</p>
                  <p className="text-foreground/90 leading-snug text-[12px]">{roteiro.tom_ideal}</p>
                </div>
              )}
            </div>
          )}

          {/* Score breakdown */}
          {scoreBreak && (
            <div className="p-3 border-t border-border space-y-2">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-2">Score</p>
              {Object.entries(scoreBreak).map(([key, val]) => {
                const max = SCORE_AXIS_MAX[key] ?? 25;
                const cappedVal = Math.min(val as number, max);
                const pct = Math.round((cappedVal / max) * 100);
                return (
                  <div key={key} className="px-1 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{SCORE_LABELS[key] ?? key.replace(/_/g, ' ')}</span>
                      <span className={`font-mono font-semibold tabular-nums text-[11px] ${getScoreColor(pct)}`}>
                        {cappedVal}/{max}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          background: pct >= 80 ? '#4caf50' : pct >= 60 ? '#f5a623' : '#ef4444',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Phase progress — navigation-based, not approval-based */}
          <div className="p-3 border-t border-border">
            <div className="flex gap-1">
              {blocos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setFaseAtiva(i)}
                  className="flex-1 h-1.5 rounded-full transition-all"
                  style={{
                    background: i === faseAtiva
                      ? getFaseColor(blocos[i].bloco, i)
                      : getFaseStatus(i) === 'aprovado'
                      ? `${getFaseColor(blocos[i].bloco, i)}60`
                      : 'hsl(var(--border))',
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── Resize handle ─────────────────────────
              8px hit-zone on the right edge; 2px accent
              line appears on hover / while dragging.
          ──────────────────────────────────────────── */}
          <div
            onMouseDown={handleSidebarDragStart}
            title="Arrastar para redimensionar"
            style={{
              position: 'absolute',
              top: 0,
              right: -4,
              bottom: 0,
              width: 8,
              cursor: 'col-resize',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 2,
                height: '100%',
                borderRadius: 1,
                background: sidebarDragging ? 'hsl(var(--primary))' : 'transparent',
                transition: sidebarDragging ? 'none' : 'background 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'hsl(var(--primary) / 50%)';
              }}
              onMouseLeave={e => {
                if (!sidebarDragging)
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              }}
            />
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          {blocoAtivo && (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">

              {/* Mobile phase chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-3 md:hidden mb-4">
                {blocos.map((b, i) => {
                  const color = getFaseColor(b.bloco, i);
                  return (
                    <button
                      key={b.bloco}
                      onClick={() => setFaseAtiva(i)}
                      className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                      style={i === faseAtiva
                        ? { background: `${color}20`, color, borderColor: `${color}60` }
                        : { background: 'transparent', color: 'hsl(var(--muted-foreground))', borderColor: 'hsl(var(--border))' }}
                    >
                      {getFaseStatus(i) === 'aprovado' ? '✓ ' : ''}{b.titulo}
                    </button>
                  );
                })}
              </div>

              {/* Phase header */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex-1 min-w-0">
                  {/* Fase pill + title + time */}
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span
                      className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: `${faseColor}18`, color: faseColor }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: faseColor }} />
                      Fase {blocoAtivo.numero}
                    </span>
                    <h2 className="text-xl font-bold text-foreground leading-none">{blocoAtivo.titulo}</h2>
                    <span
                      className="text-xs px-2.5 py-0.5 rounded-full border font-medium text-muted-foreground"
                      style={{ borderColor: 'hsl(var(--border))' }}
                    >
                      {blocoAtivo.tempo}
                    </span>
                  </div>
                  {/* Phase description */}
                  {FASE_DESCRICOES[blocoAtivo.bloco.toLowerCase()] && (
                    <p className="text-sm text-muted-foreground leading-snug">
                      {FASE_DESCRICOES[blocoAtivo.bloco.toLowerCase()]}
                    </p>
                  )}
                </div>

                {/* Actions: copy + nav arrows */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button variant="outline" size="sm" onClick={handleCopiarFase} className="gap-1.5 text-xs">
                    <Copy className="h-3.5 w-3.5" /> Copiar fase
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={faseAtiva === 0}
                    onClick={() => setFaseAtiva(f => f - 1)}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={isLastPhase}
                    onClick={() => setFaseAtiva(f => f + 1)}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Section cards */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={faseAtiva}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-3"
                >
                  {blocoAtivo.secoes.map(secao => (
                    <SecaoCard
                      key={secao.id}
                      secao={secao}
                      estado={secoesEstado[secao.id]}
                      isFocused={focusedSecao === secao.id}
                      onFocus={() => setFocusedSecao(secao.id)}
                      onAprovar={() => handleAprovar(secao.id)}
                      onSalvarEdicao={texto => handleSalvarEdicao(secao.id, texto)}
                      onRegenerar={fb => handleRegenerar(secao.id, fb)}
                      accentColor={faseColor}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* ── Block-level actions ── */}
              <div className="mt-8 pt-5 border-t border-border space-y-4">

                {/* Avaliação de efetividade */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">Efetividade desta fase</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Sua avaliação melhora a geração futura da IA
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => {
                      const nota = avaliacoes[blocoAtivo.bloco] ?? 0;
                      return (
                        <button
                          key={star}
                          onClick={() => handleAvaliar(blocoAtivo.bloco, star === nota ? 0 : star)}
                          className="transition-transform hover:scale-110 active:scale-95"
                          title={['', 'Não funcionou', 'Fraco', 'Ok', 'Bom', 'Excelente'][star]}
                        >
                          <Star
                            className="h-6 w-6 transition-colors"
                            style={{
                              fill:   star <= nota ? faseColor : 'transparent',
                              color:  star <= nota ? faseColor : 'hsl(var(--border))',
                              strokeWidth: 1.5,
                            }}
                          />
                        </button>
                      );
                    })}
                    {(avaliacoes[blocoAtivo.bloco] ?? 0) > 0 && (
                      <span className="text-[10px] text-muted-foreground ml-1">
                        {['', 'Não funcionou', 'Fraco', 'Ok', 'Bom', 'Excelente'][avaliacoes[blocoAtivo.bloco]]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Regenerar bloco */}
                {!showRegenerarBloco ? (
                  <button
                    onClick={() => setShowRegenerarBloco(true)}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border hover:border-foreground/30 rounded-lg px-4 py-2.5 w-full justify-center"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Regenerar bloco com IA
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-border bg-card p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 shrink-0" style={{ color: faseColor }} />
                      <p className="text-sm font-medium text-foreground">
                        Regenerar: <span style={{ color: faseColor }}>{blocoAtivo.titulo}</span>
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Descreva o que quer mudar. A IA vai manter o contexto do cliente e reescrever toda a fase.
                    </p>
                    <Textarea
                      placeholder={`Ex: torne o script mais direto, inclua uma pergunta sobre urgência, adapte para um cliente mais técnico...`}
                      value={instrucaoBloco}
                      onChange={e => setInstrucaoBloco(e.target.value)}
                      rows={3}
                      className="text-sm resize-none"
                      disabled={regenerandoBloco}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleRegenerarBloco}
                        disabled={regenerandoBloco || !instrucaoBloco.trim()}
                        style={{ background: faseColor }}
                        className="text-white gap-1.5"
                      >
                        {regenerandoBloco
                          ? <><Loader2 className="h-3 w-3 animate-spin" /> Regenerando...</>
                          : <><Sparkles className="h-3 w-3" /> Regenerar</>}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setShowRegenerarBloco(false); setInstrucaoBloco(''); }}
                        disabled={regenerandoBloco}
                      >
                        Cancelar
                      </Button>
                    </div>
                    {regenerandoBloco && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Reescrevendo com contexto completo do cliente...
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer className="h-14 border-t border-border bg-card flex items-center px-4 gap-4 shrink-0 z-20">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{faseAtiva + 1}</span>
            {' '}de{' '}
            <span className="font-semibold text-foreground">{blocos.length}</span>
          </span>
          {isLastPhase && (
            <span className="text-xs text-green-500 font-medium flex items-center gap-1">
              <Check className="h-3 w-3" /> Roteiro completo
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={faseAtiva === 0} onClick={() => setFaseAtiva(f => f - 1)}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Fase anterior
          </Button>
          {!isLastPhase ? (
            <Button size="sm" onClick={() => setFaseAtiva(f => f + 1)}>
              Próxima fase <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => setPecasOpen(true)} className="gap-1.5" style={{ background: faseColor }}>
              <FileText className="h-3.5 w-3.5" /> Gerar materiais
            </Button>
          )}
        </div>
      </footer>

      {/* ═══ MATERIAIS DRAWER ═══ */}
      {pecasOpen && sessao && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setPecasOpen(false)} />
          <div className="w-full max-w-2xl bg-background border-l border-border flex flex-col shadow-2xl">
            <div className="h-14 px-4 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Materiais de venda</h3>
                <p className="text-xs text-muted-foreground">Proposta · E-mail · WhatsApp · Objeções</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPecasOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <PecasPanel
                sessao={sessao}
                onSessaoUpdate={updates => setSessao(prev => prev ? { ...prev, ...updates } : prev)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
