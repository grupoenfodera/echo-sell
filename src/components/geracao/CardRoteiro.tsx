import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import type { RoteiroJSON, RoteiroEtapa } from '@/types/crm';

interface CardRoteiroProps {
  roteiro: RoteiroJSON;
  loading: boolean;
  error: string | null;
  onAprovar: () => void;
  onRejeitar: () => void;
}

function scoreBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' {
  if (score >= 70) return 'default';
  if (score >= 50) return 'secondary';
  return 'destructive';
}

function EtapaContent({ etapa, tipo }: { etapa: RoteiroEtapa; tipo: string }) {
  return (
    <div className="space-y-3 text-sm">
      <p><span className="font-medium text-foreground">Objetivo:</span> {etapa.objetivo}</p>

      {etapa.script && (
        <div className="rounded-md bg-muted p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Script sugerido</p>
          <p className="whitespace-pre-wrap">{etapa.script}</p>
        </div>
      )}

      {etapa.perguntas && etapa.perguntas.length > 0 && (
        <div>
          <p className="font-medium text-foreground mb-1">Perguntas:</p>
          <ul className="list-disc pl-5 space-y-1">
            {etapa.perguntas.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}

      {etapa.pontos_chave && etapa.pontos_chave.length > 0 && (
        <div>
          <p className="font-medium text-foreground mb-1">Pontos-chave:</p>
          <ul className="list-disc pl-5 space-y-1">
            {etapa.pontos_chave.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}

      {etapa.dicas && etapa.dicas.length > 0 && (
        <div>
          <p className="font-medium text-foreground mb-1">Dicas:</p>
          <ul className="list-disc pl-5 space-y-1">
            {etapa.dicas.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      )}

      {etapa.tecnicas && etapa.tecnicas.length > 0 && (
        <div>
          <p className="font-medium text-foreground mb-1">Técnicas:</p>
          <div className="flex flex-wrap gap-1.5">
            {etapa.tecnicas.map((t, i) => (
              <Badge key={i} variant="secondary">{t}</Badge>
            ))}
          </div>
        </div>
      )}

      {tipo === 'tratamento_objecoes' && etapa.objecoes_previstas && etapa.objecoes_previstas.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border rounded-md">
            <thead>
              <tr className="border-b bg-muted">
                <th className="text-left p-2 font-medium">Objeção</th>
                <th className="text-left p-2 font-medium">Resposta</th>
              </tr>
            </thead>
            <tbody>
              {etapa.objecoes_previstas.map((o, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-2 align-top">{o.objecao}</td>
                  <td className="p-2 align-top">{o.resposta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const ETAPAS_CONFIG = [
  { key: 'abertura', label: 'Abertura', icon: '👋' },
  { key: 'descoberta', label: 'Descoberta', icon: '🔍' },
  { key: 'apresentacao_solucao', label: 'Apresentação da Solução', icon: '💡' },
  { key: 'tratamento_objecoes', label: 'Tratamento de Objeções', icon: '🛡️' },
  { key: 'fechamento', label: 'Fechamento', icon: '🤝' },
] as const;

export function CardRoteiro({ roteiro, loading, error, onAprovar, onRejeitar }: CardRoteiroProps) {
  const r = roteiro.roteiro_reuniao;

  const renderRoteiroContent = () => {
    if (Array.isArray(r)) {
      return (
        <div className="space-y-4">
          {r.map((bloco, i) => (
            <Card key={i} className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">{bloco.numero}</span>
                  <CardTitle className="text-base flex-1">{bloco.titulo}</CardTitle>
                  <Badge variant="secondary" className="text-xs shrink-0">{bloco.tempo}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{bloco.script}</p>
                {bloco.tecnica && (
                  <div className="flex items-start gap-2 rounded-md bg-accent/50 p-2.5">
                    <Badge className="shrink-0 text-[10px] bg-primary/10 text-primary border-0">{bloco.tecnica}</Badge>
                    <p className="text-xs text-muted-foreground">{bloco.nota_tecnica}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    const etapasMap: Record<string, RoteiroEtapa> = {
      abertura: r.abertura,
      descoberta: r.descoberta,
      apresentacao_solucao: r.apresentacao_solucao,
      tratamento_objecoes: r.tratamento_objecoes,
      fechamento: r.fechamento,
    };

    return (
      <Accordion type="single" collapsible defaultValue="abertura">
        {ETAPAS_CONFIG.map(({ key, label, icon }) => {
          const etapa = etapasMap[key];
          if (!etapa) return null;
          return (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2 text-sm">
                  <span>{icon}</span>
                  <span className="font-medium">{label}</span>
                  <Badge variant="secondary" className="ml-1 text-xs">{etapa.duracao_min} min</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <EtapaContent etapa={etapa} tipo={key} />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    );
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-xl">Roteiro da Reunião</CardTitle>
          <Badge variant={scoreBadgeVariant(roteiro.score)}>
            Score {roteiro.score}/100
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground italic">{roteiro.resumo_estrategico}</p>

        {roteiro.score_breakdown && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(roteiro.score_breakdown).map(([key, val]) => (
              <Badge key={key} variant="outline" className="text-xs">{key}: {val}</Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {renderRoteiroContent()}
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        {error && (
          <Alert variant="destructive" className="w-full">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex w-full gap-3">
          <Button variant="outline" className="flex-1" onClick={onRejeitar} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerar Roteiro
          </Button>
          <Button className="flex-1" onClick={onAprovar} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Aprovar e Gerar Proposta
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
