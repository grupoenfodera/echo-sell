import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Handshake,
  Search,
  Lightbulb,
  Shield,
  Target,
  Clock,
  Brain,
  RefreshCw,
  CheckCircle,
  Loader2,
  Presentation,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { RoteiroJSON, RoteiroEtapa, BlocoRoteiro, SecaoRoteiro } from '@/types/crm';
import { svpApi } from '@/lib/api-svp';

interface RoteiroResultadoProps {
  roteiro: RoteiroJSON;
  sessaoId: string;
  onAprovado: () => void;
  onRejeitado: () => void;
}

// Icons by bloco key
const BLOCO_ICONS: Record<string, typeof Handshake> = {
  abertura: Handshake,
  diagnostico: Search,
  descoberta: Search,
  solucao: Lightbulb,
  solucao_transformacao: Lightbulb,
  apresentacao_solucao: Lightbulb,
  oferta: Presentation,
  objecoes: Shield,
  tratamento_objecoes: Shield,
  fechamento: Target,
  fechamento_agendamento: Target,
};

const BLOCO_COLORS: Record<string, string> = {
  abertura: 'border-l-blue-400',
  diagnostico: 'border-l-purple-400',
  descoberta: 'border-l-purple-400',
  solucao: 'border-l-green-400',
  solucao_transformacao: 'border-l-green-400',
  apresentacao_solucao: 'border-l-green-400',
  oferta: 'border-l-cyan-400',
  objecoes: 'border-l-orange-400',
  tratamento_objecoes: 'border-l-orange-400',
  fechamento: 'border-l-rose-400',
  fechamento_agendamento: 'border-l-rose-400',
};

interface NormalizedBloco {
  key: string;
  label: string;
  icon: typeof Handshake;
  borderColor: string;
  tempo: string;
  secoes: { label: string; tipo: string; conteudo: string; raciocinio?: string }[];
}

function normalizeRoteiro(roteiro: RoteiroJSON): NormalizedBloco[] {
  const rr = roteiro.roteiro_reuniao;

  // New array format (BlocoRoteiro[] with secoes)
  if (Array.isArray(rr)) {
    if (rr.length > 0 && 'secoes' in rr[0]) {
      return (rr as unknown as BlocoRoteiro[]).map(b => ({
        key: b.bloco,
        label: b.titulo,
        icon: BLOCO_ICONS[b.bloco] || Lightbulb,
        borderColor: BLOCO_COLORS[b.bloco] || 'border-l-gray-400',
        tempo: b.tempo,
        secoes: b.secoes.map(s => ({
          label: s.label,
          tipo: s.tipo,
          conteudo: s.conteudo,
          raciocinio: s.raciocinio,
        })),
      }));
    }
    // Old array format (RoteiroBloco[] without secoes)
    return (rr as any[]).map((b, i) => ({
      key: b.bloco || `bloco-${i}`,
      label: b.titulo || `Fase ${i + 1}`,
      icon: BLOCO_ICONS[b.bloco] || Lightbulb,
      borderColor: BLOCO_COLORS[b.bloco] || 'border-l-gray-400',
      tempo: b.tempo || '—',
      secoes: [{
        label: b.titulo || `Fase ${i + 1}`,
        tipo: 'script',
        conteudo: b.script || '',
        raciocinio: b.nota_tecnica,
      }],
    }));
  }

  // Legacy object format
  const LEGACY_ORDER = ['abertura', 'descoberta', 'apresentacao_solucao', 'tratamento_objecoes', 'fechamento'];
  const LEGACY_NAMES: Record<string, string> = {
    abertura: 'Abertura',
    descoberta: 'Descoberta',
    apresentacao_solucao: 'Apresentação da Solução',
    tratamento_objecoes: 'Tratamento de Objeções',
    fechamento: 'Fechamento',
  };

  const legacy = rr as Record<string, RoteiroEtapa>;
  return LEGACY_ORDER.filter(k => legacy[k]).map(key => {
    const val = legacy[key];
    const parts: { label: string; tipo: string; conteudo: string }[] = [];

    if (val.objetivo) parts.push({ label: 'Objetivo', tipo: 'instrucao', conteudo: val.objetivo });
    if (val.script) parts.push({ label: LEGACY_NAMES[key], tipo: 'script', conteudo: val.script });
    if (val.perguntas?.length) parts.push({ label: 'Perguntas', tipo: 'instrucao', conteudo: val.perguntas.map((p, i) => `${i + 1}. ${p}`).join('\n') });
    if (val.objecoes_previstas?.length) {
      val.objecoes_previstas.forEach(obj => {
        parts.push({ label: `Objeção: "${obj.objecao}"`, tipo: 'objecao', conteudo: obj.resposta });
      });
    }

    return {
      key,
      label: LEGACY_NAMES[key] || key,
      icon: BLOCO_ICONS[key] || Lightbulb,
      borderColor: BLOCO_COLORS[key] || 'border-l-gray-400',
      tempo: val.duracao_min ? `${val.duracao_min} min` : '—',
      secoes: parts,
    };
  });
}

function scoreBadgeColor(value: number, max: number) {
  const pct = value / max;
  if (pct >= 0.8) return 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30';
  if (pct >= 0.6) return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30';
  return 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30';
}

const SCORE_LABELS: { key: keyof NonNullable<RoteiroJSON['score_breakdown']>; label: string; max: number }[] = [
  { key: 'clareza', label: 'Clareza', max: 40 },
  { key: 'objecoes_cobertas', label: 'Objeções', max: 30 },
  { key: 'adequacao_nicho', label: 'Adequação', max: 30 },
];

const TIPO_BADGE: Record<string, { label: string; className: string }> = {
  script: { label: 'Script', className: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
  instrucao: { label: 'Instrução', className: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  objecao: { label: 'Objeção', className: 'bg-red-500/10 text-red-500 border-red-500/30' },
};

export default function RoteiroResultado({
  roteiro,
  sessaoId,
  onAprovado,
  onRejeitado,
}: RoteiroResultadoProps) {
  const navigate = useNavigate();
  const [aprovando, setAprovando] = useState(false);
  const [rejeitando, setRejeitando] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);

  const blocos = useMemo(() => normalizeRoteiro(roteiro), [roteiro]);

  const handleAprovar = async () => {
    setAprovando(true);
    try {
      await svpApi.aprovarRoteiro({ sessao_id: sessaoId, aprovado: true });
      onAprovado();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao aprovar roteiro.');
    } finally {
      setAprovando(false);
    }
  };

  const handleRejeitar = useCallback(async () => {
    setRejeitando(true);
    setDialogAberto(false);
    try {
      // 1. Reject the current roteiro
      await svpApi.aprovarRoteiro({ sessao_id: sessaoId, aprovado: false });

      // 2. Fetch session to get dados_formulario
      const res = await svpApi.buscarCliente(sessaoId).catch(() => null);
      let sessaoData: any = null;
      if (!res) {
        // fallback: try crm-listar with sessao_id
        const listRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-listar?sessao_id=${sessaoId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${(await (await import('@/integrations/supabase/client')).supabase.auth.getSession()).data.session?.access_token}`,
            },
          }
        );
        const listData = await listRes.json();
        sessaoData = listData?.sessoes?.[0];
      }

      const form = sessaoData?.dados_formulario;
      if (!form) {
        toast.error('Não foi possível recuperar os dados da sessão.');
        setRejeitando(false);
        return;
      }

      // 3. Call gerar-roteiro with same data
      const payload = {
        nicho: form.nicho || sessaoData?.nicho,
        produto: form.produto || sessaoData?.produto,
        preco: form.preco || sessaoData?.preco,
        contextoGeracao: form.contextoGeracao || sessaoData?.contexto,
        nome_cliente: form.nome_cliente,
        cliente_id: form.cliente_id || sessaoData?.cliente_id,
        dados_extras: form.dados_extras,
      };

      const novoRoteiro = await svpApi.gerarRoteiro(payload);

      // 4. Navigate to the new session
      if (novoRoteiro.sessao_id) {
        navigate(`/roteiro/${novoRoteiro.sessao_id}`, { replace: true });
      }
      toast.success('Roteiro regenerado com sucesso!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao regenerar roteiro.');
    } finally {
      setRejeitando(false);
    }
  }, [sessaoId, navigate]);

  // Compute total time
  const tempoTotal = roteiro.tempo_total_min || blocos.reduce((sum, b) => {
    const mins = parseInt(b.tempo);
    return sum + (isNaN(mins) ? 0 : mins);
  }, 0);

  return (
    <div className="w-full max-w-[680px] mx-auto pb-24">
      {/* ── Score Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Roteiro da Reunião</h2>
            <p className="text-sm text-muted-foreground">Revise e aprove para continuar</p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-4xl font-bold text-foreground">{roteiro.score ?? '—'}</span>
            <span className="text-lg text-muted-foreground"> / 100</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {roteiro.score_breakdown && SCORE_LABELS.map(({ key, label, max }) => (
            <span
              key={key}
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${scoreBadgeColor(roteiro.score_breakdown![key] ?? 0, max)}`}
            >
              {label}: {roteiro.score_breakdown![key] ?? 0}/{max}
            </span>
          ))}
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Duração estimada: {tempoTotal} minutos
          </Badge>
        </div>
      </motion.div>

      {/* ── Bloco Cards ── */}
      <div className="space-y-4">
        {blocos.map((bloco, i) => {
          const Icon = bloco.icon;
          return (
            <motion.div
              key={bloco.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 * i }}
            >
              <Card className={`border-l-4 ${bloco.borderColor}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {bloco.label}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs gap-1">
                      <Clock className="h-3 w-3" />
                      {bloco.tempo}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bloco.secoes.map((secao, j) => {
                    const badge = TIPO_BADGE[secao.tipo] || TIPO_BADGE.script;
                    return (
                      <div key={j} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{secao.label}</span>
                          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {secao.conteudo}
                        </p>
                        {secao.raciocinio && (
                          <p className="text-xs text-muted-foreground italic mt-1">
                            💡 {secao.raciocinio}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ── Resumo Estratégico ── */}
      {roteiro.resumo_estrategico && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.5 }}
          className="mt-6"
        >
          <Card className="bg-muted/50 border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Estratégia da IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed">
                {roteiro.resumo_estrategico}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Rodapé de Ação ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background">
        <div className="max-w-[680px] mx-auto flex items-center justify-between px-4 py-3 sm:px-6">
          <AlertDialog open={dialogAberto} onOpenChange={setDialogAberto}>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" disabled={aprovando || rejeitando} className="gap-2">
                {rejeitando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Regenerar roteiro
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Regenerar roteiro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza? O roteiro atual será descartado e um novo será gerado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={rejeitando}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleRejeitar} disabled={rejeitando}>
                  {rejeitando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Sim, regenerar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={handleAprovar} disabled={aprovando || rejeitando} className="gap-2">
            {aprovando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Aprovar Roteiro
          </Button>
        </div>
      </div>
    </div>
  );
}
