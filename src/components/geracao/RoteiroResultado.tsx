import { useState } from 'react';
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
  ArrowRight,
  RefreshCw,
  CheckCircle,
  Loader2,
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
import type { RoteiroJSON } from '@/types/crm';
import { svpApi } from '@/lib/api-svp';

interface RoteiroResultadoProps {
  roteiro: RoteiroJSON;
  sessaoId: string;
  onAprovado: () => void;
  onRejeitado: () => void;
}

const SECOES = [
  { key: 'abertura', label: 'Abertura', icon: Handshake, borderColor: 'border-l-blue-400' },
  { key: 'descoberta', label: 'Descoberta', icon: Search, borderColor: 'border-l-purple-400' },
  { key: 'apresentacao_solucao', label: 'Apresentação da Solução', icon: Lightbulb, borderColor: 'border-l-green-400' },
  { key: 'tratamento_objecoes', label: 'Tratamento de Objeções', icon: Shield, borderColor: 'border-l-orange-400' },
  { key: 'fechamento', label: 'Fechamento', icon: Target, borderColor: 'border-l-rose-400' },
] as const;

type SecaoKey = typeof SECOES[number]['key'];

function scoreBadgeColor(value: number, max: number) {
  const pct = value / max;
  if (pct >= 0.8) return 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30';
  if (pct >= 0.6) return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30';
  return 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30';
}

const SCORE_LABELS: { key: keyof RoteiroJSON['score_breakdown']; label: string; max: number }[] = [
  { key: 'clareza', label: 'Clareza', max: 40 },
  { key: 'objecoes_cobertas', label: 'Objeções', max: 30 },
  { key: 'adequacao_nicho', label: 'Adequação', max: 30 },
];

export default function RoteiroResultado({
  roteiro,
  sessaoId,
  onAprovado,
  onRejeitado,
}: RoteiroResultadoProps) {
  const [aprovando, setAprovando] = useState(false);
  const [rejeitando, setRejeitando] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);

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

  const handleRejeitar = async () => {
    setRejeitando(true);
    try {
      await svpApi.aprovarRoteiro({ sessao_id: sessaoId, aprovado: false });
      setDialogAberto(false);
      onRejeitado();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao regenerar roteiro.');
    } finally {
      setRejeitando(false);
    }
  };

  const r = roteiro.roteiro_reuniao;

  const renderSecaoBody = (key: SecaoKey) => {
    const secao = r[key];
    if (key === 'tratamento_objecoes' && secao.objecoes_previstas) {
      return (
        <div className="space-y-3">
          {secao.objecoes_previstas.map((obj, i) => (
            <div key={i} className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Objeção: <span className="font-normal italic">"{obj.objecao}"</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Resposta: {obj.resposta}
              </p>
            </div>
          ))}
        </div>
      );
    }

    const secao = r[key] as { objetivo: string; script?: string; perguntas?: string[]; proximo_passo?: string };

    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{secao.objetivo}</p>
        {secao.script && (
          <p className="text-sm text-foreground leading-relaxed">{secao.script}</p>
        )}
        {secao.perguntas && secao.perguntas.length > 0 && (
          <ol className="list-decimal list-inside space-y-1.5">
            {secao.perguntas.map((p, i) => (
              <li key={i} className="text-sm text-foreground">{p}</li>
            ))}
          </ol>
        )}
        {key === 'fechamento' && secao.proximo_passo && (
          <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3">
            <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm font-medium text-foreground">{secao.proximo_passo}</p>
          </div>
        )}
      </div>
    );
  };

  const getTempoMin = (key: SecaoKey): number => {
    if (key === 'tratamento_objecoes') return r.tratamento_objecoes.tempo_min;
    return (r[key] as { tempo_min: number }).tempo_min;
  };

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
            <span className="text-4xl font-bold text-foreground">{roteiro.score}</span>
            <span className="text-lg text-muted-foreground"> / 100</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {SCORE_LABELS.map(({ key, label, max }) => (
            <span
              key={key}
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${scoreBadgeColor(roteiro.score_breakdown[key], max)}`}
            >
              {label}: {roteiro.score_breakdown[key]}/{max}
            </span>
          ))}
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Duração estimada: {roteiro.tempo_total_min} minutos
          </Badge>
        </div>
      </motion.div>

      {/* ── Seção Cards ── */}
      <div className="space-y-4">
        {SECOES.map(({ key, label, icon: Icon, borderColor }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 * i }}
          >
            <Card className={`border-l-4 ${borderColor}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {label}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Clock className="h-3 w-3" />
                    {getTempoMin(key)} min
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>{renderSecaoBody(key)}</CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Resumo Estratégico ── */}
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
