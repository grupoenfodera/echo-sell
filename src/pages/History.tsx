import { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Eye, X, Copy, Check, User, FileText, Mail, Shield, MessageSquare, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

/* ── Types ── */
type HistorySource = 'geracoes' | 'sessoes_venda';

type Gen = {
  id: string;
  source: HistorySource;
  modalidade: string;
  contexto_geracao: string | null;
  nicho: string | null;
  produto: string | null;
  nome_cliente: string | null;
  criado_em: string | null;
  resultado_json: Json | null;
  // sessoes_venda fields
  roteiro_json?: Json | null;
  proposta_json?: Json | null;
  email_json?: Json | null;
  objecoes_json?: Json | null;
  whatsapp_json?: Json | null;
  resultado?: string | null;
  preco?: number | null;
};

interface Beat {
  titulo: string;
  tag: string;
  tag_source?: string;
  script: string;
  por_que: string;
  tom: string;
  se_cliente_reagir: string;
}

interface Phase {
  num: number;
  titulo: string;
  tempo: string;
  phase_color?: string;
  phase_goal: string;
  beats: Beat[];
}

interface PropostaSection {
  num: number;
  titulo: string;
  tempo?: string;
  conteudo: string;
}

interface SvpEmail {
  assunto: string;
  corpo: string;
}

interface SvpResult {
  perfil_decisor: string;
  maior_medo: string;
  decisao: string;
  tom_ideal: string;
  roteiro: Phase[];
  proposta?: PropostaSection[];
  email: SvpEmail;
}

const modalityLabels: Record<string, string> = {
  m1: 'Diagnóstico Completo',
  m2a: 'Primeiro Contato',
  m2b: 'Reunião de Proposta',
  sessao: 'Sessão de Venda',
};

/* ── Helpers ── */
function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function renderHighlights(text: string) {
  const parts: { text: string; color?: string }[] = [];
  let remaining = text;
  const regex = /\[HL([123])\](.*?)\[\/HL\1\]/gs;
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    if (match.index! > lastIndex) {
      parts.push({ text: remaining.slice(lastIndex - (text.length - remaining.length), match.index! - (text.length - remaining.length)) });
    }
    const colorMap: Record<string, string> = { '1': 'bg-primary/20 text-primary', '2': 'bg-amber-500/20 text-amber-700 dark:text-amber-400', '3': 'bg-green-500/20 text-green-700 dark:text-green-400' };
    parts.push({ text: match[2], color: colorMap[match[1]] });
    lastIndex = match.index! + match[0].length;
  }
  // Simpler approach: use split
  return renderHighlightsSimple(text);
}

function renderHighlightsSimple(text: string) {
  // Replace [HL1]...[/HL1] etc with spans
  let result = text;
  result = result.replace(/\[HL1\](.*?)\[\/HL1\]/gs, '<mark class="bg-primary/20 text-primary px-1 rounded">$1</mark>');
  result = result.replace(/\[HL2\](.*?)\[\/HL2\]/gs, '<mark class="bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1 rounded">$1</mark>');
  result = result.replace(/\[HL3\](.*?)\[\/HL3\]/gs, '<mark class="bg-green-500/20 text-green-700 dark:text-green-400 px-1 rounded">$1</mark>');
  return result;
}

function formatScript(text: string) {
  let result = text;
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/\[pausa\]/gi, '<span class="text-muted-foreground italic">[pausa]</span>');
  return result;
}

/* ── Main Component ── */
const History = () => {
  const { usuario } = useAuth();
  const { toast } = useToast();
  const [gens, setGens] = useState<Gen[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGen, setSelectedGen] = useState<Gen | null>(null);

  useEffect(() => {
    if (!usuario?.id) return;
    setLoading(true);

    Promise.all([
      supabase
        .from('geracoes')
        .select('id, modalidade, contexto_geracao, nicho, produto, nome_cliente, criado_em, resultado_json')
        .eq('usuario_id', usuario.id)
        .order('criado_em', { ascending: false }),
      supabase
        .from('sessoes_venda')
        .select('id, nicho, produto, contexto, criado_em, roteiro_json, proposta_json, email_json, objecoes_json, whatsapp_json, resultado, preco, dados_formulario')
        .eq('usuario_id', usuario.id)
        .order('criado_em', { ascending: false }),
    ]).then(([geracoesRes, sessoesRes]) => {
      const geracoes: Gen[] = ((geracoesRes.data as any[]) || []).map(g => ({
        ...g,
        source: 'geracoes' as HistorySource,
      }));

      const sessoes: Gen[] = ((sessoesRes.data as any[]) || []).map(s => ({
        id: s.id,
        source: 'sessoes_venda' as HistorySource,
        modalidade: 'sessao',
        contexto_geracao: s.contexto || (s.dados_formulario as any)?.contextoGeracao || null,
        nicho: s.nicho,
        produto: s.produto,
        nome_cliente: (s.dados_formulario as any)?.nome_cliente || null,
        criado_em: s.criado_em,
        resultado_json: null,
        roteiro_json: s.roteiro_json,
        proposta_json: s.proposta_json,
        email_json: s.email_json,
        objecoes_json: s.objecoes_json,
        whatsapp_json: s.whatsapp_json,
        resultado: s.resultado,
        preco: s.preco,
      }));

      // Merge and sort by date descending
      const merged = [...geracoes, ...sessoes].sort((a, b) => {
        const da = a.criado_em ? new Date(a.criado_em).getTime() : 0;
        const db = b.criado_em ? new Date(b.criado_em).getTime() : 0;
        return db - da;
      });

      setGens(merged);
      setLoading(false);
    });
  }, [usuario?.id]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'Conteúdo copiado para a área de transferência.' });
  }, [toast]);

  const result = useMemo(() => {
    if (!selectedGen) return null;
    if (selectedGen.source === 'sessoes_venda') return null; // handled separately
    if (!selectedGen.resultado_json) return null;
    try {
      return selectedGen.resultado_json as unknown as SvpResult;
    } catch {
      return null;
    }
  }, [selectedGen]);

  const isSessao = selectedGen?.source === 'sessoes_venda';

  // Filter objection beats
  const objectionBeats = useMemo(() => {
    if (!result?.roteiro) return [];
    const all: (Beat & { phaseName: string })[] = [];
    for (const phase of result.roteiro) {
      for (const beat of phase.beats) {
        if (/obje[çc][ãa]o|resist/i.test(beat.tag)) {
          all.push({ ...beat, phaseName: phase.titulo });
        }
      }
    }
    return all;
  }, [result]);

  return (
    <>
      <Header />
      <main className="pt-[70px] pb-16 px-4 sm:px-6">
        <div className="max-w-[920px] mx-auto">
          <h1 className="font-heading mb-6 text-2xl font-bold text-primary-hover">Histórico de Gerações</h1>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : gens.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-20 font-body">Nenhuma geração encontrada.</p>
          ) : (
            <div className="space-y-3">
              {gens.map(g => (
                <div
                  key={g.id}
                  className="bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    {/* Left info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-xs font-ui text-muted-foreground">{formatDate(g.criado_em)}</span>
                        <Badge variant="secondary" className="text-[10px] font-ui uppercase tracking-wide">
                          {modalityLabels[g.modalidade] || g.modalidade}
                        </Badge>
                        {g.contexto_geracao && (
                          <Badge variant="outline" className="text-[10px] font-ui uppercase tracking-wide">
                            {g.contexto_geracao.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-ui text-foreground">
                        {g.nicho && <span className="font-medium">{g.nicho}</span>}
                        {g.nicho && g.produto && <span className="text-muted-foreground">·</span>}
                        {g.produto && <span className="text-muted-foreground truncate max-w-[250px]">{g.produto}</span>}
                      </div>
                      {g.nome_cliente && (
                        <p className="text-xs text-muted-foreground font-ui mt-1 flex items-center gap-1">
                          <User className="h-3 w-3" /> {g.nome_cliente}
                        </p>
                      )}
                    </div>

                    {/* Action */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg gap-1.5 shrink-0 self-start sm:self-center"
                      onClick={() => setSelectedGen(g)}
                    >
                      <Eye className="h-3.5 w-3.5" /> Ver proposta completa
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Drawer / Modal ── */}
      {selectedGen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setSelectedGen(null)}>
          <div
            onClick={e => e.stopPropagation()}
            className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:fade-in duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border shrink-0">
              <div>
                <h2 className="font-heading text-lg text-foreground">Proposta Completa</h2>
                <p className="text-xs text-muted-foreground font-ui mt-0.5">
                  {modalityLabels[selectedGen.modalidade] || selectedGen.modalidade} · {formatDate(selectedGen.criado_em)}
                </p>
              </div>
              <button onClick={() => setSelectedGen(null)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {isSessao ? (
                <SessaoDrawerContent gen={selectedGen} copyToClipboard={copyToClipboard} />
              ) : !result ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground font-ui">Conteúdo não disponível para esta geração.</p>
                </div>
              ) : (
                <Tabs defaultValue="perfil" className="w-full">
                  <TabsList className="w-full flex overflow-x-auto gap-0.5 bg-muted/50 rounded-lg p-1 mb-4">
                    <TabsTrigger value="perfil" className="text-xs font-ui flex-1 min-w-fit gap-1"><User className="h-3 w-3" /> Perfil</TabsTrigger>
                    <TabsTrigger value="roteiro" className="text-xs font-ui flex-1 min-w-fit gap-1"><MessageSquare className="h-3 w-3" /> Roteiro</TabsTrigger>
                    {result.proposta && result.proposta.length > 0 && (
                      <TabsTrigger value="proposta" className="text-xs font-ui flex-1 min-w-fit gap-1"><FileText className="h-3 w-3" /> Proposta</TabsTrigger>
                    )}
                    <TabsTrigger value="email" className="text-xs font-ui flex-1 min-w-fit gap-1"><Mail className="h-3 w-3" /> E-mail</TabsTrigger>
                    {objectionBeats.length > 0 && (
                      <TabsTrigger value="objecoes" className="text-xs font-ui flex-1 min-w-fit gap-1"><Shield className="h-3 w-3" /> Objeções</TabsTrigger>
                    )}
                  </TabsList>

                  {/* Tab: Perfil do Decisor */}
                  <TabsContent value="perfil">
                    <div className="space-y-4">
                      {[
                        { label: 'Perfil do Decisor', value: result.perfil_decisor },
                        { label: 'Maior Medo', value: result.maior_medo },
                        { label: 'Decisão', value: result.decisao },
                        { label: 'Tom Ideal', value: result.tom_ideal },
                      ].map(item => (
                        <div key={item.label} className="bg-muted/30 rounded-lg p-4">
                          <h4 className="text-xs font-ui font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{item.label}</h4>
                          <p className="text-sm font-body text-foreground whitespace-pre-wrap">{item.value}</p>
                        </div>
                      ))}
                      <CopyButton onClick={() => copyToClipboard(
                        `Perfil: ${result.perfil_decisor}\nMaior medo: ${result.maior_medo}\nDecisão: ${result.decisao}\nTom ideal: ${result.tom_ideal}`
                      )} />
                    </div>
                  </TabsContent>

                  {/* Tab: Roteiro */}
                  <TabsContent value="roteiro">
                    <div className="space-y-6">
                      {result.roteiro.map((phase, pi) => (
                        <div key={pi} className="border border-border rounded-xl overflow-hidden">
                          <div className="bg-muted/40 px-4 py-3 border-b border-border">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-heading text-foreground font-semibold">Fase {phase.num}: {phase.titulo}</span>
                              <Badge variant="outline" className="text-[10px] font-ui">{phase.tempo}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-ui mt-1">{phase.phase_goal}</p>
                          </div>
                          <div className="divide-y divide-border">
                            {phase.beats.map((beat, bi) => (
                              <div key={bi} className="p-4 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-ui font-medium text-foreground">{beat.titulo}</span>
                                  <Badge variant="secondary" className="text-[10px] font-ui">{beat.tag}</Badge>
                                </div>
                                <div className="text-sm font-body text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: formatScript(beat.script) }} />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                                  <div className="bg-muted/30 rounded-lg p-2.5">
                                    <span className="text-[10px] font-ui text-muted-foreground uppercase block mb-0.5">Por quê</span>
                                    <span className="text-xs font-body text-foreground">{beat.por_que}</span>
                                  </div>
                                  <div className="bg-muted/30 rounded-lg p-2.5">
                                    <span className="text-[10px] font-ui text-muted-foreground uppercase block mb-0.5">Tom</span>
                                    <span className="text-xs font-body text-foreground">{beat.tom}</span>
                                  </div>
                                  <div className="bg-muted/30 rounded-lg p-2.5">
                                    <span className="text-[10px] font-ui text-muted-foreground uppercase block mb-0.5">Se reagir</span>
                                    <span className="text-xs font-body text-foreground">{beat.se_cliente_reagir}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <CopyButton onClick={() => {
                        const text = result.roteiro.map(p =>
                          `Fase ${p.num}: ${p.titulo} (${p.tempo})\n${p.phase_goal}\n\n` +
                          p.beats.map(b => `${b.titulo} [${b.tag}]\n${b.script}\nPor quê: ${b.por_que}\nTom: ${b.tom}\nSe reagir: ${b.se_cliente_reagir}`).join('\n\n')
                        ).join('\n\n---\n\n');
                        copyToClipboard(text);
                      }} />
                    </div>
                  </TabsContent>

                  {/* Tab: Proposta */}
                  {result.proposta && result.proposta.length > 0 && (
                    <TabsContent value="proposta">
                      <div className="space-y-4">
                        {result.proposta.map((sec, i) => (
                          <div key={i} className="bg-muted/30 rounded-lg p-4">
                            <h4 className="text-sm font-heading text-foreground font-semibold mb-2">
                              {sec.num}. {sec.titulo}
                              {sec.tempo && <span className="text-xs text-muted-foreground font-ui ml-2">({sec.tempo})</span>}
                            </h4>
                            <p className="text-sm font-body text-foreground whitespace-pre-wrap">{sec.conteudo}</p>
                          </div>
                        ))}
                        <CopyButton onClick={() => {
                          const text = result.proposta!.map(s => `${s.num}. ${s.titulo}\n${s.conteudo}`).join('\n\n');
                          copyToClipboard(text);
                        }} />
                      </div>
                    </TabsContent>
                  )}

                  {/* Tab: Email */}
                  <TabsContent value="email">
                    <div className="space-y-4">
                      <div className="bg-muted/30 rounded-lg p-4">
                        <h4 className="text-xs font-ui font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Assunto</h4>
                        <p className="text-sm font-body text-foreground font-medium">{result.email?.assunto}</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-4">
                        <h4 className="text-xs font-ui font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Corpo</h4>
                        <div
                          className="text-sm font-body text-foreground whitespace-pre-wrap leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: renderHighlightsSimple(result.email?.corpo || '') }}
                        />
                      </div>
                      <CopyButton onClick={() => copyToClipboard(`Assunto: ${result.email?.assunto}\n\n${result.email?.corpo}`)} />
                    </div>
                  </TabsContent>

                  {/* Tab: Objeções */}
                  {objectionBeats.length > 0 && (
                    <TabsContent value="objecoes">
                      <div className="space-y-3">
                        {objectionBeats.map((beat, i) => (
                          <div key={i} className="border border-destructive/20 bg-destructive/5 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="h-3.5 w-3.5 text-destructive" />
                              <span className="text-sm font-ui font-medium text-foreground">{beat.titulo}</span>
                              <Badge variant="outline" className="text-[10px] font-ui border-destructive/30 text-destructive">{beat.tag}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-ui mb-2">Fase: {beat.phaseName}</p>
                            <div className="text-sm font-body text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: formatScript(beat.script) }} />
                            <div className="bg-muted/30 rounded-lg p-2.5 mt-3">
                              <span className="text-[10px] font-ui text-muted-foreground uppercase block mb-0.5">Se o cliente reagir</span>
                              <span className="text-xs font-body text-foreground">{beat.se_cliente_reagir}</span>
                            </div>
                          </div>
                        ))}
                        <CopyButton onClick={() => {
                          const text = objectionBeats.map(b => `${b.titulo} [${b.tag}]\n${b.script}\nSe reagir: ${b.se_cliente_reagir}`).join('\n\n');
                          copyToClipboard(text);
                        }} />
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ── Sessão Drawer Content ── */
function SessaoDrawerContent({ gen, copyToClipboard }: { gen: Gen; copyToClipboard: (t: string) => void }) {
  const roteiro = gen.roteiro_json as any;
  const proposta = gen.proposta_json as any;
  const email = gen.email_json as any;
  const objecoes = (gen.objecoes_json as any[]) || [];
  const whatsapp = gen.whatsapp_json as any;

  const hasRoteiro = !!roteiro;
  const hasProposta = !!proposta;
  const hasEmail = !!email;
  const hasObjecoes = objecoes.length > 0;
  const hasWhatsapp = !!whatsapp;

  if (!hasRoteiro && !hasProposta && !hasEmail) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Conteúdo não disponível para esta sessão.</p>
      </div>
    );
  }

  // Build context info
  const produtoNome = (() => {
    const txt = gen.produto || '';
    const firstLine = txt.split('\n')[0].trim();
    return firstLine.length > 80 ? firstLine.slice(0, 80) + '…' : firstLine;
  })();
  const titulo = [produtoNome, gen.preco ? `R$${Number(gen.preco).toLocaleString('pt-BR')}` : null].filter(Boolean).join(' · ');
  const subtitulo = gen.nicho ? `— ${gen.nicho}` : '';
  const resumo = roteiro?.resumo_estrategico;
  const perfilDecisor = roteiro?.perfil_decisor || (gen as any).dados_formulario?.perfil_decisor;

  // Insight chips
  const insightChips = [
    { label: 'MAIOR MEDO', value: roteiro?.maior_medo },
    { label: 'DECISÃO', value: roteiro?.decisao_style || roteiro?.decisao },
    { label: 'TOM IDEAL', value: roteiro?.tom_ideal },
  ].filter(c => c.value);

  // Normalize roteiro blocks (handle both array and legacy object)
  const roteiroBlocks: any[] = (() => {
    if (!roteiro?.roteiro_reuniao) return [];
    if (Array.isArray(roteiro.roteiro_reuniao)) return roteiro.roteiro_reuniao;
    // Legacy object format
    const r = roteiro.roteiro_reuniao;
    const legacyOrder = [
      { key: 'abertura', label: 'Abertura', num: 1 },
      { key: 'descoberta', label: 'Descoberta', num: 2 },
      { key: 'apresentacao_solucao', label: 'Apresentação da Solução', num: 3 },
      { key: 'tratamento_objecoes', label: 'Tratamento de Objeções', num: 4 },
      { key: 'fechamento', label: 'Fechamento', num: 5 },
    ];
    return legacyOrder
      .filter(e => r[e.key])
      .map(e => ({
        numero: e.num,
        titulo: e.label,
        tempo: `${r[e.key].duracao_min} min`,
        script: r[e.key].script || r[e.key].objetivo || '',
        tecnica: r[e.key].tecnicas?.[0] || '',
        nota_tecnica: '',
        perguntas: r[e.key].perguntas,
        pontos_chave: r[e.key].pontos_chave,
        dicas: r[e.key].dicas,
      }));
  })();

  const defaultTab = hasRoteiro && roteiroBlocks.length > 0 ? 'roteiro' : hasProposta ? 'proposta' : 'email';

  return (
    <div className="space-y-5">
      {/* Context Card */}
      {(titulo || perfilDecisor || resumo) && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-2">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                {titulo} {subtitulo && <span className="font-normal text-muted-foreground">{subtitulo}</span>}
              </h3>
              {perfilDecisor && (
                <p className="text-sm text-foreground leading-relaxed">
                  <span className="text-primary font-semibold">Perfil do decisor:</span> {perfilDecisor}
                </p>
              )}
              {resumo && !perfilDecisor && (
                <p className="text-sm text-muted-foreground leading-relaxed">{resumo}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Insight Chips */}
      {insightChips.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {insightChips.map(chip => (
            <div key={chip.label} className="border border-border rounded-lg p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">{chip.label}</p>
              <p className="text-sm text-foreground leading-snug">{chip.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="bg-transparent border-0 p-0 h-auto gap-2 mb-4 justify-start">
          {hasRoteiro && roteiroBlocks.length > 0 && (
            <TabsTrigger value="roteiro" className="rounded-lg border border-border bg-card data-[state=active]:bg-muted data-[state=active]:border-foreground/20 text-sm px-4 py-2 shadow-none">
              Roteiro da reunião
            </TabsTrigger>
          )}
          {hasProposta && (
            <TabsTrigger value="proposta" className="rounded-lg border border-border bg-card data-[state=active]:bg-muted data-[state=active]:border-foreground/20 text-sm px-4 py-2 shadow-none">
              Proposta
            </TabsTrigger>
          )}
          {hasEmail && (
            <TabsTrigger value="email" className="rounded-lg border border-border bg-card data-[state=active]:bg-muted data-[state=active]:border-foreground/20 text-sm px-4 py-2 shadow-none">
              E-mail
            </TabsTrigger>
          )}
          {hasWhatsapp && (
            <TabsTrigger value="whatsapp" className="rounded-lg border border-border bg-card data-[state=active]:bg-muted data-[state=active]:border-foreground/20 text-sm px-4 py-2 shadow-none">
              WhatsApp
            </TabsTrigger>
          )}
          {hasObjecoes && (
            <TabsTrigger value="objecoes" className="rounded-lg border border-border bg-card data-[state=active]:bg-muted data-[state=active]:border-foreground/20 text-sm px-4 py-2 shadow-none">
              Objeções
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Tab: Roteiro ── */}
        {hasRoteiro && roteiroBlocks.length > 0 && (
          <TabsContent value="roteiro">
            <div className="space-y-0 divide-y divide-border border border-border rounded-xl overflow-hidden">
              {roteiroBlocks.map((bloco: any, i: number) => {
                // Extract displayable text: prefer secoes (new format), fallback to flat script
                const scriptText = bloco.script
                  || (bloco.secoes?.map((s: any) => s.conteudo).filter(Boolean).join('\n\n'))
                  || '';

                return (
                  <div key={i} className="p-5 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
                          {bloco.numero}
                        </span>
                        <h4 className="text-sm font-semibold text-foreground leading-snug">{bloco.titulo}</h4>
                      </div>
                      <span className="text-xs text-primary font-medium shrink-0">{bloco.tempo}</span>
                    </div>

                    {/* Secoes (new format) */}
                    {bloco.secoes?.length > 0 ? (
                      <div className="pl-10 space-y-3">
                        {bloco.secoes.map((secao: any, si: number) => (
                          <div key={si} className="space-y-1">
                            {secao.label && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{secao.label}</span>
                                {secao.tipo && (
                                  <Badge variant="outline" className="text-[10px]">{secao.tipo}</Badge>
                                )}
                              </div>
                            )}
                            {secao.conteudo && (
                              <div
                                className="text-sm text-foreground whitespace-pre-wrap leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: formatScript(secao.conteudo) }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : scriptText ? (
                      <div className="pl-10 space-y-2">
                        <div
                          className="text-sm text-foreground whitespace-pre-wrap leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: formatScript(scriptText) }}
                        />
                      </div>
                    ) : null}

                    {/* Perguntas (legacy) */}
                    {bloco.perguntas?.length > 0 && (
                      <div className="pl-10 space-y-1">
                        {bloco.perguntas.map((p: string, pi: number) => (
                          <p key={pi} className="text-sm text-foreground">P{pi + 1}: "{p}"</p>
                        ))}
                      </div>
                    )}

                    {/* Pontos-chave (legacy) */}
                    {bloco.pontos_chave?.length > 0 && (
                      <div className="pl-10">
                        <ul className="list-disc pl-4 space-y-1">
                          {bloco.pontos_chave.map((p: string, pi: number) => (
                            <li key={pi} className="text-sm text-foreground">{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Technique badge */}
                    {bloco.tecnica && (
                      <div className="pl-10 flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                        <Badge variant="secondary" className="shrink-0 text-[10px] rounded-md">
                          {bloco.tecnica}
                        </Badge>
                        {bloco.nota_tecnica && (
                          <p className="text-xs text-muted-foreground leading-relaxed">{bloco.nota_tecnica}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Alerta terceiro */}
            {roteiro.alerta_terceiro && (
              <div className="mt-4 flex items-start gap-2 border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800 rounded-lg p-3">
                <span className="text-sm">⚠️</span>
                <p className="text-sm text-foreground">{roteiro.alerta_terceiro}</p>
              </div>
            )}

            <CopyButton onClick={() => {
              const text = roteiroBlocks.map((b: any) => `${b.numero}. ${b.titulo} (${b.tempo})\n${b.script}`).join('\n\n');
              copyToClipboard(text);
            }} />
          </TabsContent>
        )}

        {/* ── Tab: Proposta ── */}
        {hasProposta && (
          <TabsContent value="proposta">
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Estrutura da proposta</h3>
              </div>
              <div className="p-5 space-y-5 text-sm text-foreground">
                {/* Build numbered sections from proposta fields */}
                {(() => {
                  const sections: { num: number; title: string; content: string | undefined }[] = [
                    { num: 1, title: 'ABERTURA', content: proposta.abertura || proposta.introducao },
                    { num: 2, title: 'O CENÁRIO ATUAL', content: proposta.diagnostico },
                    { num: 3, title: 'O QUE ENTREGAMOS', content: proposta.solucao },
                  ];

                  // Add beneficios as part of section 3 or separate
                  const beneficiosText = proposta.beneficios?.map((b: string) => `→ ${b}`).join('\n');

                  const extraSections: { num: number; title: string; content: string | undefined }[] = [];
                  if (proposta.investimento) {
                    const inv = proposta.investimento;
                    const parts = [inv.valor, inv.condicoes, inv.garantia ? `Garantia: ${inv.garantia}` : ''].filter(Boolean);
                    extraSections.push({ num: sections.length + (beneficiosText ? 2 : 1), title: 'INVESTIMENTO', content: parts.join('\n') });
                  }
                  if (proposta.fechamento) {
                    extraSections.push({ num: sections.length + (beneficiosText ? 2 : 1) + extraSections.length + 1, title: 'FECHAMENTO', content: proposta.fechamento });
                  }

                  return (
                    <>
                      {sections.filter(s => s.content).map(s => (
                        <div key={s.num}>
                          <p className="font-semibold mb-1">{s.num}. {s.title}</p>
                          <p className="whitespace-pre-wrap leading-relaxed">{s.content}</p>
                        </div>
                      ))}
                      {beneficiosText && (
                        <div>
                          <p className="font-semibold mb-1">{sections.filter(s => s.content).length + 1}. BENEFÍCIOS</p>
                          <p className="whitespace-pre-wrap leading-relaxed">{beneficiosText}</p>
                        </div>
                      )}
                      {extraSections.map(s => (
                        <div key={s.num}>
                          <p className="font-semibold mb-1">{s.num}. {s.title}</p>
                          <p className="whitespace-pre-wrap leading-relaxed">{s.content}</p>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
            <CopyButton onClick={() => {
              const text = [proposta.titulo, proposta.abertura || proposta.introducao, proposta.diagnostico, proposta.solucao, proposta.beneficios?.map((b: string) => `→ ${b}`).join('\n'), proposta.investimento?.valor, proposta.fechamento].filter(Boolean).join('\n\n');
              copyToClipboard(text);
            }} />
          </TabsContent>
        )}

        {/* ── Tab: Email ── */}
        {hasEmail && (
          <TabsContent value="email">
            <div className="border border-border rounded-xl overflow-hidden">
              {/* Header */}
              <div className="px-5 py-3 border-b border-border bg-muted/30 space-y-1 text-sm">
                <div className="flex gap-3">
                  <span className="text-muted-foreground w-14 shrink-0">Assunto</span>
                  <span className="font-semibold text-foreground">{email.assunto}</span>
                </div>
                {email.para && (
                  <div className="flex gap-3">
                    <span className="text-muted-foreground w-14 shrink-0">Para</span>
                    <span className="text-foreground">{email.para}</span>
                  </div>
                )}
              </div>
              {/* Body */}
              <div className="p-5 space-y-4 text-sm text-foreground leading-relaxed">
                {email.saudacao && <p>{email.saudacao}</p>}
                {email.corpo && (
                  <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: renderHighlightsSimple(email.corpo) }} />
                )}
                {email.destaque_1 && (
                  <div className="bg-primary/10 rounded-md px-3 py-2">
                    <p>{email.destaque_1}</p>
                  </div>
                )}
                {email.destaque_2 && (
                  <div className="bg-orange-100 dark:bg-orange-900/20 rounded-md px-3 py-2">
                    <p>{email.destaque_2}</p>
                  </div>
                )}
                {email.cta && (
                  <div className="bg-primary/10 rounded-md px-3 py-2 inline-block">
                    <p>{email.cta}</p>
                  </div>
                )}
                {email.assinatura && <p className="text-muted-foreground">{email.assinatura}</p>}
              </div>
            </div>
            <CopyButton onClick={() => copyToClipboard(`Assunto: ${email.assunto}\n\n${email.saudacao}\n\n${email.corpo}\n\n${email.cta}\n\n${email.assinatura}`)} />
          </TabsContent>
        )}

        {/* ── Tab: WhatsApp ── */}
        {hasWhatsapp && (
          <TabsContent value="whatsapp">
            <div className="space-y-4">
              <div className="border border-border rounded-xl p-5">
                <h4 className="text-sm font-semibold text-foreground mb-1">Mensagem principal</h4>
                <p className="text-xs text-muted-foreground mb-3">Cole diretamente no WhatsApp</p>
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{whatsapp.mensagem_principal}</div>
                <div className="mt-3">
                  <CopyButton onClick={() => copyToClipboard(whatsapp.mensagem_principal)} />
                </div>
              </div>
              <div className="border border-border rounded-xl p-5">
                <h4 className="text-sm font-semibold text-foreground mb-1">Versão curta</h4>
                <p className="text-xs text-muted-foreground mb-3">Para quando ele não respondeu</p>
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{whatsapp.versao_curta}</div>
                <div className="mt-3">
                  <CopyButton onClick={() => copyToClipboard(whatsapp.versao_curta)} />
                </div>
              </div>
            </div>
          </TabsContent>
        )}

        {/* ── Tab: Objeções ── */}
        {hasObjecoes && (
          <TabsContent value="objecoes">
            <div className="space-y-3">
              {objecoes.map((o: any, i: number) => (
                <div key={i} className="border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">"{o.objecao}"</p>
                    {o.categoria && <Badge variant="secondary" className="text-[10px] shrink-0">{o.categoria}</Badge>}
                  </div>
                  {o.tecnica && <p className="text-xs text-muted-foreground">Técnica: <span className="font-medium">{o.tecnica}</span></p>}
                  <p className="text-sm italic text-muted-foreground">{o.resposta_curta}</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{o.resposta_completa}</p>
                  {o.se_terceiro && (
                    <div className="bg-muted/50 rounded-lg p-3 mt-1">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Se terceiro presente:</p>
                      <p className="text-sm text-foreground">{o.se_terceiro}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/* ── Copy Button ── */
const CopyButton = ({ onClick }: { onClick: () => void }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex justify-end pt-2">
      <Button
        variant="outline"
        size="sm"
        className="rounded-lg gap-1.5 text-xs"
        onClick={() => {
          onClick();
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? 'Copiado' : 'Copiar'}
      </Button>
    </div>
  );
};

export default History;
