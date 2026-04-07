/**
 * ScriptRenderer — renderiza texto de script SVP PASTOR com hierarquia visual.
 *
 * Parseia o texto de saída da IA e separa em:
 *  ┌─────────────────────────────────────────────────────────┐
 *  │ section-label  → BLOCO X / CONFIRMAÇÃO / subtítulos    │
 *  │ script-card    → texto de fala (em aspas ou texto livre)│
 *  │ instr-card     → [instruções em colchetes] + → bullets │
 *  │ pause-chip     → [pausa] / [SILÊNCIO TOTAL]            │
 *  └─────────────────────────────────────────────────────────┘
 */

import React from 'react';

export interface ScriptRendererProps {
  content: string;
  /** Cor hex da fase — usada na borda do script-card. */
  accentColor?: string;
}

/* ── Types ─────────────────────────────────────────────────── */

type Block =
  | { kind: 'section';     text: string }
  | { kind: 'script';      text: string }
  | { kind: 'instructions'; items: string[] }
  | { kind: 'pause';       text: string }
  | { kind: 'text';        text: string };

/* ── Helpers ────────────────────────────────────────────────── */

/** Detecta marcadores de seção explícitos: BLOCO 1 — LABEL: / CONFIRMAÇÃO / INSTRUÇÃO DE CONDUTA */
const SECTION_RE = /^(BLOCO\s+\d+\s*[—–\-]+\s*[^:\n]+:?|CONFIRMAÇÃO\s+OBRIGATÓRIA|INSTRUÇÃO\s+DE\s+CONDUTA|VERIFICAÇÃO\s+OBRIGATÓRIA)(:?\s*)/i;

/**
 * Sub-headers: qualquer linha curta (5–70 chars) que termina com ":"
 * e não começa com aspas, colchetes, setas ou bullets.
 * Ex: "Compilado de entregáveis:", "Estrutura de cada fase:", "Preço com âncora:"
 */
const SUBHEADER_RE = /^(?!["""''«»\[→•*\-–—])[A-ZÀ-Úa-zà-ú].{3,68}:$/;

/** [SILÊNCIO TOTAL] / [pausa — ...] / # pausa */
const PAUSE_RE = /^(\[(silên[çc]io|pausa)[^\]]*\]|#\s*pausa\b[^.]*)/i;

/** Qualquer [colchete] que não seja pausa → instrução */
const BRACKET_RE = /^\[.+\]$/;

/** → ou - → item de instrução */
const ARROW_RE = /^[→\-–—]\s+/;

/**
 * Divide o texto bruto em linhas lógicas.
 * Também separa marcadores BLOCO inline (sem \n antes deles).
 */
function splitToLines(raw: string): string[] {
  // Inject \n before known section markers so they become their own lines
  const normalized = raw
    // BLOCO N — LABEL: question text → split after colon so question becomes its own line
    .replace(/(BLOCO\s+\d+\s*[—–\-]+\s*[^:\n]+):\s*/gi, '\n$1:\n')
    // BLOCO without colon — still inject newline before it
    .replace(/(BLOCO\s+\d+\s*[—–\-]+)/gi, '\n$1')
    .replace(/(CONFIRMAÇÃO\s+OBRIGATÓRIA)/gi, '\n$1')
    .replace(/(INSTRUÇÃO\s+DE\s+CONDUTA)/gi, '\n$1')
    .replace(/(VERIFICAÇÃO\s+OBRIGATÓRIA)/gi, '\n$1')
    // Break before [SILÊNCIO / [pausa and # pausa
    .replace(/(\[(silên[çc]io|pausa)[^\]]*\])/gi, '\n$1\n')
    .replace(/(#\s*pausa\b[^.\n]*)/gi, '\n$1\n');

  return normalized
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
}

/** Extrai [instruções] embutidas de uma linha de texto de fala */
function extractInlineInstructions(line: string): { speech: string; instrs: string[] } {
  const instrs: string[] = [];
  const speech = line.replace(/\[[^\]]+\]/g, (match) => {
    if (!PAUSE_RE.test(match)) instrs.push(match.replace(/^\[|\]$/g, '').trim());
    return '';
  }).replace(/\s{2,}/g, ' ').trim();
  return { speech, instrs };
}

/* ── Parser ────────────────────────────────────────────────── */

/** Normaliza variações de digitação/encoding antes do parse */
function normalizeContent(raw: string): string {
  return raw
    // Corrige erro de encoding/typo da IA: SILENÇO → SILÊNCIO
    .replace(/SILEN[CÇ]O/gi, 'SILÊNCIO')
    // Remove tokens de template não preenchidos: {placeholder}, {nome}, etc.
    // Garante que o texto em torno não fique com espaço duplo
    .replace(/\s*\{[a-zA-ZÀ-ú_0-9]+\}/g, '')
    // Limpa espaços duplos resultantes
    .replace(/  +/g, ' ')
    .trim();
}

function parse(content: string): Block[] {
  const lines = splitToLines(normalizeContent(content));
  const blocks: Block[] = [];

  let speechLines: string[] = [];
  let instrItems: string[] = [];

  const flushSpeech = () => {
    if (speechLines.length === 0) return;
    blocks.push({ kind: 'script', text: speechLines.join('\n') });
    speechLines = [];
  };

  const flushInstrs = () => {
    if (instrItems.length === 0) return;
    blocks.push({ kind: 'instructions', items: [...instrItems] });
    instrItems = [];
  };

  for (const line of lines) {
    // ── Seção ──────────────────────────────────────────
    if (SECTION_RE.test(line)) {
      flushSpeech();
      flushInstrs();
      // Label = everything before the first : or up to end, cleaned
      const label = line.replace(/:?\s*$/, '').replace(/_/g, ' ');
      blocks.push({ kind: 'section', text: label });
      continue;
    }

    // ── Sub-header (linha curta terminando em ":") ────
    if (SUBHEADER_RE.test(line)) {
      flushSpeech();
      flushInstrs();
      blocks.push({ kind: 'section', text: line.replace(/:$/, '').trim() });
      continue;
    }

    // ── Pause chip ─────────────────────────────────────
    if (PAUSE_RE.test(line)) {
      flushSpeech();
      flushInstrs();
      const pauseText = line
        .replace(/^\[|\]$/g, '')   // strip [ ]
        .replace(/^#\s*/,   '')    // strip leading #
        .trim();
      blocks.push({ kind: 'pause', text: pauseText });
      continue;
    }

    // ── Instrução em colchetes ─────────────────────────
    if (BRACKET_RE.test(line) && !PAUSE_RE.test(line)) {
      flushSpeech();
      instrItems.push(line.replace(/^\[|\]$/g, '').trim());
      continue;
    }

    // ── Item com seta / traço ──────────────────────────
    if (ARROW_RE.test(line)) {
      flushSpeech();
      instrItems.push(line.replace(ARROW_RE, '').trim());
      continue;
    }

    // ── Texto de fala / script ─────────────────────────
    // Pode conter [instruções inline] — extrai e separa
    const { speech, instrs } = extractInlineInstructions(line);
    if (instrs.length > 0) {
      if (speech) speechLines.push(speech);
      else         flushSpeech();
      instrs.forEach(i => instrItems.push(i));
    } else {
      flushInstrs();
      if (speech) speechLines.push(speech);
    }
  }

  flushSpeech();
  flushInstrs();

  return blocks;
}

/* ── Renderer ──────────────────────────────────────────────── */

export default function ScriptRenderer({ content, accentColor }: ScriptRendererProps) {
  if (!content?.trim()) return null;

  const blocks = parse(content);
  const accent = accentColor ?? 'hsl(var(--primary))';

  return (
    <div className="flex flex-col gap-2.5">
      {blocks.map((b, i) => {
        switch (b.kind) {

          case 'section':
            return (
              <p
                key={i}
                className="text-[10px] font-semibold uppercase tracking-widest mt-1 first:mt-0"
                style={{ color: accent, opacity: 0.85 }}
              >
                {b.text}
              </p>
            );

          case 'script':
            return (
              <div
                key={i}
                className="rounded-r-lg py-3 px-4"
                style={{
                  borderLeft: `3px solid ${accent}`,
                  background: `color-mix(in srgb, ${accent} 7%, hsl(var(--card)))`,
                }}
              >
                <p className="text-sm text-foreground leading-[1.75] whitespace-pre-wrap">
                  {b.text}
                </p>
              </div>
            );

          case 'instructions':
            return (
              <div
                key={i}
                className="rounded-lg border border-border/60 bg-card px-4 py-3 space-y-1.5"
              >
                <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Como conduzir
                </p>
                {b.items.map((item, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-0.5 shrink-0 text-xs leading-none">→</span>
                    <p className="text-[13px] text-muted-foreground leading-snug">{item}</p>
                  </div>
                ))}
              </div>
            );

          case 'pause':
            return (
              <div key={i} className="py-0.5 flex">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
                  style={{
                    background: `color-mix(in srgb, ${accent} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${accent} 25%, transparent)`,
                    color: accent,
                  }}
                >
                  ⏸ {b.text}
                </span>
              </div>
            );

          case 'text':
            return (
              <p key={i} className="text-[13px] text-foreground/80 leading-relaxed">
                {b.text}
              </p>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
