import { useState } from 'react';
import type { PropostaJSON, EmailJSON, ObjecaoItem, SessaoResultado } from '@/types/crm';
import RegistrarResultadoModal from '@/components/crm/RegistrarResultadoModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  FileText, MessageSquare, Search, Lightbulb, CheckCircle, DollarSign,
  Shield, ArrowRight, Clock, Copy, Check, Mail, ShieldAlert, User,
  RefreshCw, TrendingUp, ChevronDown, ChevronUp,
} from 'lucide-react';

function useCopy() {
  const [copiado, setCopiado] = useState(false);
  const copiar = async (texto: string) => {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };
  return { copiado, copiar };
}

interface PropostaResultadoProps {
  proposta: PropostaJSON;
  email: EmailJSON;
  objecoes: ObjecaoItem[];
  sessaoId: string;
  clienteId: string | null;
  nomeCliente?: string;
  onNovaGeracao: () => void;
  onVerCRM?: () => void;
}

const TIPO_BADGE: Record<ObjecaoItem['categoria'], { label: string; cls: string }> = {
  preco:       { label: 'Preço',       cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  tempo:       { label: 'Tempo',       cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  confianca:   { label: 'Confiança',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  necessidade: { label: 'Necessidade', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  autoridade:  { label: 'Autoridade',  cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
};

const SECTIONS = [
  { key: 'titulo'        as const, label: 'Título',          icon: FileText },
  { key: 'introducao'    as const, label: 'Introdução',      icon: MessageSquare },
  { key: 'diagnostico'   as const, label: 'Diagnóstico',     icon: Search },
  { key: 'solucao'       as const, label: 'Solução Proposta', icon: Lightbulb },
  { key: 'beneficios'    as const, label: 'Benefícios',      icon: CheckCircle },
  { key: 'proximo_passo' as const, label: 'Próximo Passo',   icon: ArrowRight },
  { key: 'fechamento'    as const, label: 'Fechamento',      icon: Clock },
];

export default function PropostaResultado({
  proposta, email, objecoes, sessaoId, clienteId, nomeCliente,
  onNovaGeracao, onVerCRM,
}: PropostaResultadoProps) {
  const copyProposta = useCopy();
  const copyWhatsApp = useCopy();
  const copyAssunto = useCopy();
  const [resultadoModalAberto, setResultadoModalAberto] = useState(false);
  const [resultadoRegistrado, setResultadoRegistrado] = useState<SessaoResultado | null>(null);

  const formatPropostaTexto = () => {
    return SECTIONS.map(s => {
      const val = proposta[s.key];
      if (s.key === 'beneficios' && Array.isArray(val)) {
        return `${s.label}:\n${(val as string[]).map(b => `• ${b}`).join('\n')}`;
      }
      if (typeof val === 'object' && val !== null) {
        return `${s.label}:\n${JSON.stringify(val)}`;
      }
      return `${s.label}:\n${val}`;
    }).join('\n\n');
  };

  const formatWhatsApp = () =>
    `*${email.assunto}*\n\n${email.saudacao}\n\n${email.corpo}\n\n${email.cta}\n\n${email.assinatura}`;

  return (
    <div className="max-w-[680px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Proposta Completa</h2>
          <p className="text-sm text-muted-foreground">
            {nomeCliente ? `Gerada para ${nomeCliente}` : 'Pronta para uso'}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onNovaGeracao}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Nova geração
          </Button>
          {clienteId && onVerCRM && (
            <Button variant="outline" size="sm" onClick={onVerCRM}>
              <User className="h-3.5 w-3.5 mr-1.5" /> Ver no CRM
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="proposta" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="proposta" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Proposta
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Email
          </TabsTrigger>
          <TabsTrigger value="objecoes" className="gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" /> Objeções
          </TabsTrigger>
        </TabsList>

        {/* Tab Proposta */}
        <TabsContent value="proposta">
          <Card>
            <CardContent className="pt-6 space-y-0">
              {SECTIONS.map((section, idx) => {
                const Icon = section.icon;
                const value = proposta[section.key];
                return (
                  <div key={section.key}>
                    <div className="space-y-1.5 py-4">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                          {section.label}
                        </span>
                      </div>
                      {section.key === 'beneficios' && Array.isArray(value) ? (
                        <ul className="space-y-1.5 pl-1">
                          {(value as string[]).map((b, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                              <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      ) : typeof value === 'object' && value !== null && !Array.isArray(value) ? (
                        <div className="text-sm text-foreground space-y-1">
                          {Object.entries(value as Record<string, string>).map(([k, v]) => (
                            <p key={k}><span className="font-medium capitalize">{k}:</span> {v}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-foreground">{value as string}</p>
                      )}
                    </div>
                    {idx < SECTIONS.length - 1 && <Separator />}
                  </div>
                );
              })}

              <div className="pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => copyProposta.copiar(formatPropostaTexto())}
                >
                  {copyProposta.copiado ? (
                    <><Check className="h-4 w-4 mr-2" /> Copiado!</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-2" /> Copiar Proposta Completa</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Email */}
        <TabsContent value="email">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Assunto */}
              <div className="flex items-center justify-between gap-2 bg-muted rounded-lg p-3">
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Assunto</span>
                  <p className="text-sm font-medium text-foreground">{email.assunto}</p>
                </div>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"
                  onClick={() => copyAssunto.copiar(email.assunto)}
                >
                  {copyAssunto.copiado
                    ? <Check className="h-3.5 w-3.5 text-green-500" />
                    : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>

              {/* Corpo */}
              <div className="bg-background border rounded-lg p-4">
                <p className="text-sm text-foreground whitespace-pre-wrap">{email.corpo}</p>
              </div>

              {/* CTA */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm py-1.5 px-3">
                  <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                  {email.cta}
                </Badge>
              </div>

              {/* PS */}
              <p className="text-sm text-muted-foreground italic">{email.assinatura}</p>

              {/* WhatsApp button */}
              <Button
                className="w-full text-white"
                style={{ backgroundColor: copyWhatsApp.copiado ? '#128C7E' : '#25D366' }}
                onClick={() => copyWhatsApp.copiar(formatWhatsApp())}
              >
                {copyWhatsApp.copiado ? (
                  <><Check className="h-4 w-4 mr-2" /> Copiado!</>
                ) : (
                  <>📱 Copiar para WhatsApp</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Objeções */}
        <TabsContent value="objecoes">
          <div className="space-y-3">
            {objecoes.map((obj, idx) => (
              <ObjecaoCard key={idx} objecao={obj} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Banner pós-geração */}
      {resultadoRegistrado ? (
        <div className="bg-muted/30 border rounded-lg p-4 flex items-center gap-4">
          <CheckCircle className="h-8 w-8 text-green-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Resultado registrado: {
                resultadoRegistrado === 'converteu' ? 'Converteu ✓' :
                resultadoRegistrado === 'nao_converteu' ? 'Não converteu' :
                resultadoRegistrado === 'em_andamento' ? 'Em andamento' : 'Cancelado'
              }
            </p>
            <p className="text-xs text-muted-foreground">
              Obrigado! O SVP vai usar isso para melhorar futuras gerações.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-muted/30 border rounded-lg p-4 flex items-center gap-4">
          <TrendingUp className="h-8 w-8 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Como foi a reunião?</p>
            <p className="text-xs text-muted-foreground">
              Registre o resultado para que o SVP aprenda com esta venda.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setResultadoModalAberto(true)}>
            Registrar Resultado
          </Button>
        </div>
      )}

      <RegistrarResultadoModal
        aberto={resultadoModalAberto}
        sessaoId={sessaoId}
        nomeCliente={nomeCliente}
        produto={proposta.titulo}
        onFechar={() => setResultadoModalAberto(false)}
        onRegistrado={(resultado) => {
          setResultadoRegistrado(resultado);
          setResultadoModalAberto(false);
        }}
      />
    </div>
  );
}

function ObjecaoCard({ objecao }: { objecao: ObjecaoItem }) {
  const [expandido, setExpandido] = useState(false);
  const copyObj = useCopy();
  const badge = TIPO_BADGE[objecao.tipo];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-snug flex-1">
            {objecao.objecao}
          </CardTitle>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge variant="secondary" className={`text-xs ${badge.cls}`}>
              {badge.label}
            </Badge>
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => copyObj.copiar(`Objeção: ${objecao.objecao}\nResposta: ${objecao.resposta_completa}`)}
            >
              {copyObj.copiado
                ? <Check className="h-3 w-3 text-green-500" />
                : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-muted/50 rounded-md p-3">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Resposta rápida
          </span>
          <p className="text-sm text-foreground mt-1">{objecao.resposta_curta}</p>
        </div>

        <div>
          <Button
            variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setExpandido(!expandido)}
          >
            {expandido ? (
              <>Ocultar resposta completa <ChevronUp className="h-3 w-3 ml-1" /></>
            ) : (
              <>Ver resposta completa <ChevronDown className="h-3 w-3 ml-1" /></>
            )}
          </Button>
          {expandido && (
            <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">
              {objecao.resposta_completa}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
