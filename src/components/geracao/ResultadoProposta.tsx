import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Copy, RefreshCw, ChevronDown, Save, ExternalLink, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { RoteiroJSON, RoteiroBloco, RoteiroEtapa, PropostaJSON, EmailJSON, ObjecaoItem, WhatsAppJSON } from '@/types/crm';

interface ResultadoPropostaProps {
  roteiro: RoteiroJSON;
  proposta: PropostaJSON;
  email: EmailJSON;
  objecoes: ObjecaoItem[];
  whatsapp?: WhatsAppJSON | null;
  sessaoId: string;
  produto?: string;
  preco?: number;
  onRegistrarResultado: (resultado: string, notas: string) => void;
  onNovaGeracao: () => void;
}

const CATEGORIA_STYLES: Record<string, string> = {
  preco: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  tempo: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  confianca: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  necessidade: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  autoridade: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

function copiarTexto(texto: string) {
  navigator.clipboard.writeText(texto);
  toast.success('Copiado!');
}

function scoreBadgeColor(score: number) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

/* ─── ABA ROTEIRO ─── */
function RoteiroTab({ roteiro }: { roteiro: RoteiroJSON }) {
  const r = roteiro.roteiro_reuniao;

  if (Array.isArray(r)) {
    return (
      <div className="space-y-4">
        {(r as RoteiroBloco[]).map((bloco, i) => (
          <Card key={i} className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                  {bloco.numero}
                </span>
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
        {roteiro.alerta_terceiro && (
          <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-300">
              {roteiro.alerta_terceiro}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  // Legacy object format
  const legacyR = r as { abertura: RoteiroEtapa; descoberta: RoteiroEtapa; apresentacao_solucao: RoteiroEtapa; tratamento_objecoes: RoteiroEtapa; fechamento: RoteiroEtapa };
  const etapas = [
    { key: 'abertura', label: '👋 Abertura', etapa: legacyR.abertura },
    { key: 'descoberta', label: '🔍 Descoberta', etapa: legacyR.descoberta },
    { key: 'apresentacao_solucao', label: '💡 Solução', etapa: legacyR.apresentacao_solucao },
    { key: 'tratamento_objecoes', label: '🛡️ Objeções', etapa: legacyR.tratamento_objecoes },
    { key: 'fechamento', label: '🤝 Fechamento', etapa: legacyR.fechamento },
  ];

  return (
    <div className="space-y-4">
      {etapas.map(({ key, label, etapa }, i) => etapa && (
        <Card key={key} className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                {i + 1}
              </span>
              <CardTitle className="text-base flex-1">{label}</CardTitle>
              <Badge variant="secondary" className="text-xs shrink-0">{etapa.duracao_min} min</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-medium text-foreground">Objetivo:</span> {etapa.objetivo}</p>
            {etapa.script && (
              <p className="whitespace-pre-wrap text-foreground leading-relaxed">{etapa.script}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── ABA PROPOSTA ─── */
function PropostaTab({ proposta }: { proposta: PropostaJSON }) {
  const sections = [
    { num: 1, title: 'Abertura', content: proposta.abertura || proposta.introducao },
    { num: 2, title: 'Cenário atual', content: proposta.diagnostico },
    { num: 3, title: 'O que entregamos', content: proposta.solucao },
  ].filter(s => s.content);

  const textoCompleto = [
    proposta.titulo,
    '',
    proposta.abertura || proposta.introducao || '',
    '',
    'Cenário atual:',
    proposta.diagnostico,
    '',
    'O que entregamos:',
    proposta.solucao,
    '',
    'Benefícios:',
    ...proposta.beneficios.map(b => `→ ${b}`),
    '',
    'Investimento:',
    proposta.investimento.criterio ? `Critério: ${proposta.investimento.criterio}` : '',
    `Valor: ${proposta.investimento.valor}`,
    `Condições: ${proposta.investimento.condicoes}`,
    `Garantia: ${proposta.investimento.garantia}`,
    '',
    'Próximo passo:',
    proposta.proximo_passo,
    '',
    proposta.fechamento,
  ].filter(Boolean).join('\n');

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold text-foreground">{proposta.titulo}</h3>

      {sections.map(s => (
        <div key={s.num}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{s.num}. {s.title}</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{s.content}</p>
        </div>
      ))}

      {proposta.beneficios?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">4. Benefícios</p>
          <ul className="space-y-1">
            {proposta.beneficios.map((b, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">→</span> {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">5. Investimento</p>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {proposta.investimento.criterio && (
            <p><span className="font-medium">Critério:</span> {proposta.investimento.criterio}</p>
          )}
          <p><span className="font-bold text-foreground text-base">{proposta.investimento.valor}</span></p>
          <p><span className="font-medium">Condições:</span> {proposta.investimento.condicoes}</p>
          <p><span className="font-medium">Garantia:</span> {proposta.investimento.garantia}</p>
        </CardContent>
      </Card>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">6. Próximo passo</p>
        <p className="text-sm text-foreground">{proposta.proximo_passo}</p>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">7. Fechamento</p>
        <p className="text-sm text-foreground italic">{proposta.fechamento}</p>
      </div>

      <Button variant="outline" size="sm" onClick={() => copiarTexto(textoCompleto)}>
        <Copy className="mr-2 h-3.5 w-3.5" />
        Copiar proposta
      </Button>
    </div>
  );
}

/* ─── ABA EMAIL ─── */
function EmailTab({ email }: { email: EmailJSON }) {
  const textoEmail = [
    `Assunto: ${email.assunto}`,
    email.para ? `Para: ${email.para}` : '',
    '',
    email.saudacao,
    '',
    email.corpo,
    '',
    email.destaque_1 ? `★ ${email.destaque_1}` : '',
    email.destaque_2 ? `★ ${email.destaque_2}` : '',
    '',
    email.cta,
    '',
    email.assinatura,
  ].filter(Boolean).join('\n');

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-1 text-sm border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="font-medium text-muted-foreground w-16">Assunto</span>
              <span className="font-semibold text-foreground">{email.assunto}</span>
            </div>
            {email.para && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground w-16">Para</span>
                <span className="text-foreground">{email.para}</span>
              </div>
            )}
          </div>

          <div className="text-sm space-y-3">
            <p className="text-foreground">{email.saudacao}</p>
            <p className="text-foreground whitespace-pre-wrap">{email.corpo}</p>

            {email.destaque_1 && (
              <div className="border-l-4 border-primary bg-primary/5 p-3 rounded-r-md">
                <p className="text-sm text-foreground">{email.destaque_1}</p>
              </div>
            )}

            {email.destaque_2 && (
              <div className="border-l-4 border-orange-400 bg-orange-50 dark:bg-orange-900/10 p-3 rounded-r-md">
                <p className="text-sm text-foreground">{email.destaque_2}</p>
              </div>
            )}

            <p className="text-foreground font-semibold">{email.cta}</p>
            <p className="text-muted-foreground">{email.assinatura}</p>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" size="sm" onClick={() => copiarTexto(textoEmail)}>
        <Copy className="mr-2 h-3.5 w-3.5" />
        Copiar e-mail
      </Button>
    </div>
  );
}

/* ─── ABA WHATSAPP ─── */
function WhatsAppTab({ whatsapp }: { whatsapp: WhatsAppJSON }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Mensagem principal</CardTitle>
          <p className="text-xs text-muted-foreground">Cole diretamente no WhatsApp</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted/50 rounded-lg p-4 text-[15px] text-foreground whitespace-pre-wrap leading-relaxed">
            {whatsapp.mensagem_principal}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => copiarTexto(whatsapp.mensagem_principal)}>
              <Copy className="mr-2 h-3.5 w-3.5" />
              Copiar mensagem
            </Button>
            <Button size="sm" className="bg-[#25D366] hover:bg-[#1da851] text-white" asChild>
              <a href={`https://wa.me/?text=${encodeURIComponent(whatsapp.mensagem_principal)}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Abrir no WhatsApp
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Versão curta</CardTitle>
          <p className="text-xs text-muted-foreground">Para quando ele não respondeu</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted/50 rounded-lg p-4 text-[15px] text-foreground whitespace-pre-wrap leading-relaxed">
            {whatsapp.versao_curta}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => copiarTexto(whatsapp.versao_curta)}>
              <Copy className="mr-2 h-3.5 w-3.5" />
              Copiar versão curta
            </Button>
            <Button size="sm" className="bg-[#25D366] hover:bg-[#1da851] text-white" asChild>
              <a href={`https://wa.me/?text=${encodeURIComponent(whatsapp.versao_curta)}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Abrir no WhatsApp
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── ABA OBJEÇÕES ─── */
function ObjecoesTab({ objecoes }: { objecoes: ObjecaoItem[] }) {
  return (
    <div className="space-y-3">
      {objecoes.map((o, i) => (
        <Card key={i}>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <p className="font-semibold text-foreground">"{o.objecao}"</p>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORIA_STYLES[o.categoria] ?? CATEGORIA_STYLES.autoridade}`}>
                {o.categoria}
              </span>
            </div>
            {o.tecnica && (
              <p className="text-xs text-muted-foreground">
                Técnica: <span className="font-medium">{o.tecnica}</span>
              </p>
            )}
            <p className="text-sm italic text-muted-foreground">Resposta rápida: "{o.resposta_curta}"</p>
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="px-0 text-xs">
                  <ChevronDown className="mr-1 h-3.5 w-3.5" />
                  Ver resposta completa
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2">
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{o.resposta_completa}</p>
                {o.se_terceiro && (
                  <div className="rounded-md bg-muted p-3 mt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Se terceiro presente:</p>
                    <p className="text-sm text-foreground">{o.se_terceiro}</p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── COMPONENTE PRINCIPAL ─── */
export function ResultadoProposta({
  roteiro,
  proposta,
  email,
  objecoes,
  whatsapp,
  sessaoId,
  produto,
  preco,
  onRegistrarResultado,
  onNovaGeracao,
}: ResultadoPropostaProps) {
  const [resultado, setResultado] = useState('');
  const [notas, setNotas] = useState('');

  const titulo = produto && preco ? `${produto} · R$ ${preco.toLocaleString('pt-BR')}` : proposta.titulo;

  const insightChips = [
    { label: 'MAIOR MEDO', value: roteiro.maior_medo },
    { label: 'DECISÃO', value: roteiro.decisao_style },
    { label: 'TOM IDEAL', value: roteiro.tom_ideal },
  ].filter(c => c.value);

  return (
    <div className="space-y-6">
      {/* 1. Card de Contexto */}
      <Card className="bg-primary text-primary-foreground border-0">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1">
              <h2 className="text-xl font-bold">{titulo}</h2>
              <p className="text-sm opacity-90">{roteiro.resumo_estrategico}</p>
            </div>
            <div className={`flex h-14 w-14 items-center justify-center rounded-full ${scoreBadgeColor(roteiro.score)} text-white text-xs font-bold leading-tight text-center shrink-0`}>
              <div>
                <div className="text-base font-bold">{roteiro.score}</div>
                <div className="text-[9px] -mt-0.5">/100</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Insight Chips */}
      {insightChips.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {insightChips.map(chip => (
            <div key={chip.label} className="flex-1 min-w-[140px] rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{chip.label}</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{chip.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 3. Header actions */}
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={onNovaGeracao}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Nova Geração
        </Button>
      </div>

      {/* 4. Tabs */}
      <Tabs defaultValue="roteiro">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="roteiro" className="text-xs sm:text-sm">📋 Roteiro</TabsTrigger>
          <TabsTrigger value="proposta" className="text-xs sm:text-sm">📄 Proposta</TabsTrigger>
          <TabsTrigger value="email" className="text-xs sm:text-sm">✉️ Email</TabsTrigger>
          <TabsTrigger value="whatsapp" className="text-xs sm:text-sm">📱 WhatsApp</TabsTrigger>
          <TabsTrigger value="objecoes" className="text-xs sm:text-sm">🛡️ Objeções</TabsTrigger>
        </TabsList>

        <TabsContent value="roteiro" className="mt-4">
          <RoteiroTab roteiro={roteiro} />
        </TabsContent>
        <TabsContent value="proposta" className="mt-4">
          <PropostaTab proposta={proposta} />
        </TabsContent>
        <TabsContent value="email" className="mt-4">
          <EmailTab email={email} />
        </TabsContent>
        <TabsContent value="whatsapp" className="mt-4">
          {whatsapp ? <WhatsAppTab whatsapp={whatsapp} /> : (
            <p className="text-sm text-muted-foreground text-center py-8">WhatsApp não disponível para esta sessão.</p>
          )}
        </TabsContent>
        <TabsContent value="objecoes" className="mt-4">
          <ObjecoesTab objecoes={objecoes} />
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Resultado */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Como foi a reunião?</h3>
        <div className="space-y-2">
          <Label htmlFor="resultado">Resultado</Label>
          <Select value={resultado} onValueChange={setResultado}>
            <SelectTrigger id="resultado">
              <SelectValue placeholder="Selecione o resultado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="converteu">✅ Fechou!</SelectItem>
              <SelectItem value="nao_converteu">❌ Não fechou</SelectItem>
              <SelectItem value="em_andamento">🔄 Em andamento</SelectItem>
              <SelectItem value="cancelado">🚫 Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notas">Notas pós-reunião</Label>
          <Textarea
            id="notas"
            placeholder="O que funcionou? O que poderia melhorar?"
            value={notas}
            onChange={e => setNotas(e.target.value)}
            rows={3}
          />
        </div>
        <Button onClick={() => onRegistrarResultado(resultado, notas)} disabled={!resultado}>
          <Save className="mr-2 h-4 w-4" />
          Salvar Resultado
        </Button>
      </div>
    </div>
  );
}