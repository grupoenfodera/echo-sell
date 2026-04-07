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
  /**
   * compact=true — usado dentro de SecaoScript / SecaoInstrucao.
   * Script blocks renderizam como <p> simples (sem borda própria).
   * Instructions renderizam como lista inline (sem card wrapper).
   */
  compact?: boolean;
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
 * Sub-headers: linha curta (5–45 chars) que termina com ":"
 * e não começa com aspas, colchetes, setas ou bullets.
 * Ex: "Compilado de entregáveis:", "Estrutura de cada fase:", "Preço com âncora:"
 *
 * EXCLUÍDAS linhas conversacionais (fala do vendedor) que contêm pronomes/verbos:
 * "Pelo que você me contou...", "Isso está gerando:", "E o que você quer chegar é:"
 */
const SUBHEADER_RE = /^(?!["""''«»\[→•*\-–—])[A-ZÀ-Úa-zà-ú].{3,45}:$/;
const CONVERSATIONAL_RE = /\b(você|eu\s|me\s|\bnós\b|isso\s|está\s|estão|foram|gerando|contou|passando|chegar|quer\s|pelo\s|hoje\s|trouxe|confirmar|passou|contar)\b/i;

/** [SILÊNCIO TOTAL] / [pausa — ...] / # pausa */
const PAUSE_RE = /^(\[(silên[çc]io|pausa)[^\]]*\]|#\s*pausa\b[^.]*)/i;

/** Qualquer [colchete] que não seja pausa → instrução */
const BRACKET_RE = /^\[.+\]$/;

/**
 * Somente → marca instrução de conduta.
 * Em-dash (—) e en-dash (–) são bullets de fala (ex: "— [problema nas palavras dele]")
 * e NÃO devem ser tratados como instrução.
 */
const ARROW_RE = /^→\s+/;

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
    .map(l => l.trim());
  // Não filtramos linhas vazias aqui — elas funcionam como
  // separadores de parágrafo no parser abaixo.
}

/**
 * Detecta se o conteúdo de um [colchete] é um placeholder de fala
 * (preenchimento com palavras do cliente), e não uma instrução de conduta.
 * Ex: [problema nas palavras dele] [desejo nas palavras dele] [meta] [consequência 1]
 *
 * Regra 1 — qualquer [palavra + número] é placeholder: [consequência 1], [problema 2]
 * Regra 2 — contém palavra-chave de preenchimento: palavras, dele, cliente, etc.
 */
function isPlaceholder(content: string): boolean {
  // [algo 1], [algo 2] — placeholder numerado (ex: consequência 1, meta 2)
  if (/\s+\d+\s*$/.test(content)) return true;
  // Contém palavras que indicam preenchimento com dados do cliente
  return /\b(palavras?|nome|situa[çc][aã]o|contexto|cliente|dele|dela|problema|desejo|meta|passo|tentativa)\b/i.test(content);
}

/** Extrai [instruções] embutidas de uma linha de texto de fala.
 *  Placeholders do tipo [palavras dele] permanecem na fala. */
function extractInlineInstructions(line: string): { speech: string; instrs: string[] } {
  const instrs: string[] = [];
  const speech = line.replace(/\[[^\]]+\]/g, (match) => {
    if (PAUSE_RE.test(match)) return match;            // pausa → fica na fala
    const content = match.replace(/^\[|\]$/g, '').trim();
    if (isPlaceholder(content)) return match;          // placeholder → fica na fala
    instrs.push(content);
    return '';                                         // instrução real → remove da fala
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
    // Remove marcadores de parágrafo no final (trailing empty lines)
    while (speechLines.length > 0 && speechLines[speechLines.length - 1] === '') speechLines.pop();
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
    // ── Linha em branco = quebra de parágrafo DENTRO da fala ──
    // NÃO gera um novo card — parágrafos consecutivos de fala
    // ficam no mesmo card, separados por \n\n (whitespace-pre-wrap).
    // Um novo card só é criado quando um elemento não-fala interrompe
    // (instrução, pausa, seção), que chama flushSpeech() explicitamente.
    if (line === '') {
      if (speechLines.length > 0 && speechLines[speechLines.length - 1] !== '') {
        speechLines.push('');  // marcador de quebra de parágrafo
      }
      flushInstrs();
      continue;
    }

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
    // Exclui linhas conversacionais (fala do vendedor) que contêm pronomes/verbos
    if (SUBHEADER_RE.test(line) && !CONVERSATIONAL_RE.test(line)) {
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

/* ── Helpers ────────────────────────────────────────────────── */

/**
 * Converte LABEL EM CAPS para "Label em Caps" (título por separador).
 * "BLOCO 1 — DESAFIOS" → "Bloco 1 — Desafios"
 * "CONFIRMAÇÃO OBRIGATÓRIA" → "Confirmação obrigatória"
 */
function toDisplayLabel(s: string): string {
  return s
    .split(/(\s*[—–]\s*)/)                      // split by em/en dash
    .map((part, i) => {
      if (/^(\s*[—–]\s*)$/.test(part)) return part; // keep the dash as-is
      const lower = part.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

/* ── Renderer ──────────────────────────────────────────────── */

export default function ScriptRenderer({ content, accentColor, compact = false }: ScriptRendererProps) {
  if (!content?.trim()) return null;

  const blocks = parse(content);
  const accent = accentColor ?? 'hsl(var(--primary))';

  return (
    <div className={compact ? 'flex flex-col gap-4' : 'flex flex-col gap-2.5'}>
      {blocks.map((b, i) => {
        switch (b.kind) {

          case 'section':
            // Separator label — muted gray, title-cased, never accent color
            return (
              <p
                key={i}
                className="text-[12px] font-medium text-muted-foreground/60 pt-2 pb-0 first:pt-0"
              >
                {toDisplayLabel(b.text)}
              </p>
            );

          case 'script':
            if (compact) {
              // Inside a SecaoScript card — render plain text, no nested border
              return (
                <div key={i}>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1" style={{ color: accent }}>
                    💬 Fale
                  </p>
                  <p className="text-[15px] text-foreground leading-[1.75] whitespace-pre-wrap">
                    {b.text}
                  </p>
                </div>
              );
            }
            return (
              <div
                key={i}
                className="rounded-lg py-4 px-5"
                style={{
                  borderLeft: `3px solid ${accent}`,
                  background: `color-mix(in srgb, ${accent} 7%, hsl(var(--card)))`,
                }}
              >
                <p className="text-[9px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: accent }}>
                  💬 Fale ao cliente
                </p>
                <p className="text-[15px] text-foreground leading-[1.75] whitespace-pre-wrap">
                  {b.text}
                </p>
              </div>
            );

          case 'instructions':
            if (compact) {
              // Inside a SecaoInstrucao card — render items inline, no nested card
              return (
                <div key={i} className="space-y-1.5">
                  {b.items.map((item, j) => (
                    <div key={j} className="flex items-start gap-2 py-0.5">
                      <span className="text-muted-foreground mt-0.5 shrink-0 text-xs leading-none">→</span>
                      <p className="text-[13px] text-muted-foreground leading-[1.6]">{item}</p>
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <div
                key={i}
                className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 space-y-1.5"
              >
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-2 flex items-center gap-1">
                  📋 Como conduzir
                </p>
                {b.items.map((item, j) => (
                  <div key={j} className="flex items-start gap-2 py-0.5">
                    <span className="text-muted-foreground mt-0.5 shrink-0 text-xs leading-none">→</span>
                    <p className="text-[13px] text-muted-foreground leading-[1.6]">{item}</p>
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

          case 'text': {
            const tParas = b.text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
            return (
              <div key={i} className="space-y-3">
                {tParas.map((para, pi) => (
                  <p key={pi} className="text-[13px] text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {para}
                  </p>
                ))}
              </div>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}
