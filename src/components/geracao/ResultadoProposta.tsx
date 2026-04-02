import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle, Copy, RefreshCw, ChevronDown, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { PropostaJSON, EmailJSON, ObjecaoItem, WhatsAppJSON } from '@/types/crm';

interface ResultadoPropostaProps {
  proposta: PropostaJSON;
  email: EmailJSON;
  objecoes: ObjecaoItem[];
  whatsapp?: WhatsAppJSON | null;
  sessaoId: string;
  onRegistrarResultado: (resultado: string, notas: string) => void;
  onNovaGeracao: () => void;
}

const CATEGORIA_STYLES: Record<string, string> = {
  preco: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  tempo: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  confianca: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  necessidade: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  autoridade: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

function copiarTexto(texto: string) {
  navigator.clipboard.writeText(texto);
  toast.success('Copiado para a área de transferência!');
}

function PropostaTab({ proposta }: { proposta: PropostaJSON }) {
  const textoCompleto = [
    proposta.titulo,
    '',
    proposta.introducao,
    '',
    'Diagnóstico:',
    proposta.diagnostico,
    '',
    'Solução:',
    proposta.solucao,
    '',
    'Benefícios:',
    ...proposta.beneficios.map(b => `• ${b}`),
    '',
    'Investimento:',
    `Valor: ${proposta.investimento.valor}`,
    `Condições: ${proposta.investimento.condicoes}`,
    `Garantia: ${proposta.investimento.garantia}`,
    '',
    'Próximo Passo:',
    proposta.proximo_passo,
    '',
    proposta.fechamento,
  ].join('\n');

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => copiarTexto(textoCompleto)}>
          <Copy className="mr-2 h-3.5 w-3.5" />
          Copiar Proposta
        </Button>
      </div>

      <h3 className="text-lg font-semibold text-foreground">{proposta.titulo}</h3>

      <Section title="Introdução">{proposta.introducao}</Section>
      <Section title="Diagnóstico">{proposta.diagnostico}</Section>
      <Section title="Solução">{proposta.solucao}</Section>

      <div>
        <p className="font-semibold text-foreground mb-1">Benefícios</p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          {proposta.beneficios.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Investimento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><span className="font-medium">Valor:</span> {proposta.investimento.valor}</p>
          <p><span className="font-medium">Condições:</span> {proposta.investimento.condicoes}</p>
          <p><span className="font-medium">Garantia:</span> {proposta.investimento.garantia}</p>
        </CardContent>
      </Card>

      <Section title="Próximo Passo">{proposta.proximo_passo}</Section>
      <Section title="Fechamento">{proposta.fechamento}</Section>
    </div>
  );
}

function EmailTab({ email }: { email: EmailJSON }) {
  const textoEmail = [
    `Assunto: ${email.assunto}`,
    '',
    email.saudacao,
    '',
    email.corpo,
    '',
    email.cta,
    '',
    email.assinatura,
  ].join('\n');

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => copiarTexto(textoEmail)}>
          <Copy className="mr-2 h-3.5 w-3.5" />
          Copiar Email
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary">Assunto:</Badge>
        <span className="font-semibold text-foreground">{email.assunto}</span>
      </div>

      <Section title="Saudação">{email.saudacao}</Section>

      <div>
        <p className="font-semibold text-foreground mb-1">Corpo</p>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{email.corpo}</p>
      </div>

      <Section title="CTA">{email.cta}</Section>
      <Section title="Assinatura">{email.assinatura}</Section>
    </div>
  );
}

function ObjecoesTab({ objecoes }: { objecoes: ObjecaoItem[] }) {
  return (
    <div className="space-y-3">
      {objecoes.map((o, i) => (
        <Card key={i}>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <p className="font-semibold text-foreground">{o.objecao}</p>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORIA_STYLES[o.categoria] ?? CATEGORIA_STYLES.autoridade}`}>
                {o.categoria}
              </span>
            </div>
            <p className="text-sm italic text-muted-foreground">{o.resposta_curta}</p>
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="px-0 text-xs">
                  <ChevronDown className="mr-1 h-3.5 w-3.5" />
                  Ver resposta completa
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{o.resposta_completa}</p>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-foreground mb-1">{title}</p>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export function ResultadoProposta({ proposta, email, objecoes, sessaoId, onRegistrarResultado, onNovaGeracao }: ResultadoPropostaProps) {
  const [resultado, setResultado] = useState('');
  const [notas, setNotas] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <h2 className="text-xl font-semibold">Proposta Gerada ✨</h2>
        </div>
        <Button variant="secondary" onClick={onNovaGeracao}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Nova Geração
        </Button>
      </div>

      <Tabs defaultValue="proposta">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="proposta">📄 Proposta</TabsTrigger>
          <TabsTrigger value="email">✉️ Email</TabsTrigger>
          <TabsTrigger value="objecoes">🛡️ Objeções</TabsTrigger>
        </TabsList>
        <TabsContent value="proposta" className="mt-4">
          <PropostaTab proposta={proposta} />
        </TabsContent>
        <TabsContent value="email" className="mt-4">
          <EmailTab email={email} />
        </TabsContent>
        <TabsContent value="objecoes" className="mt-4">
          <ObjecoesTab objecoes={objecoes} />
        </TabsContent>
      </Tabs>

      <Separator />

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
            placeholder="O que funcionou? O que poderia melhorar? Detalhes do fechamento..."
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
