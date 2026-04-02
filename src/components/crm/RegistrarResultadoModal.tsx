import { useState } from 'react';
import { toast } from 'sonner';
import { svpApi } from '@/lib/api-svp';
import type { SessaoResultado } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Trophy, TrendingDown, Clock, Ban, Loader2, CheckCircle } from 'lucide-react';

const RESULTADO_OPTIONS: {
  value: SessaoResultado;
  icon: typeof Trophy;
  title: string;
  subtitle: string;
  selectedBorder: string;
  selectedBg: string;
  iconColor: string;
}[] = [
  {
    value: 'converteu', icon: Trophy, title: 'Converteu! 🎉', subtitle: 'Fechou negócio',
    selectedBorder: 'border-green-500', selectedBg: 'bg-green-50 dark:bg-green-900/20', iconColor: 'text-green-600',
  },
  {
    value: 'nao_converteu', icon: TrendingDown, title: 'Não converteu', subtitle: 'Não fechou desta vez',
    selectedBorder: 'border-red-500', selectedBg: 'bg-red-50 dark:bg-red-900/20', iconColor: 'text-red-600',
  },
  {
    value: 'em_andamento', icon: Clock, title: 'Em andamento', subtitle: 'Aguardando resposta',
    selectedBorder: 'border-yellow-500', selectedBg: 'bg-yellow-50 dark:bg-yellow-900/20', iconColor: 'text-yellow-600',
  },
  {
    value: 'cancelado', icon: Ban, title: 'Cancelado', subtitle: 'Reunião não aconteceu',
    selectedBorder: 'border-muted-foreground', selectedBg: 'bg-muted/50', iconColor: 'text-muted-foreground',
  },
];

const PLACEHOLDERS: Record<SessaoResultado, string> = {
  converteu: 'Ex: Cliente adorou o ROI apresentado. Assinou plano Pro. Próximo passo: onboarding na sexta.',
  nao_converteu: 'Ex: Preço acima do orçamento. Voltar em 3 meses quando renovar contrato atual.',
  em_andamento: 'Ex: Muito interesse mas precisa de aprovação do sócio. Follow-up na quinta-feira.',
  cancelado: 'Ex: Reagendou para próximo mês. Novo contato em 15/05.',
};

const TOAST_MSG: Record<SessaoResultado, string> = {
  converteu: '🎉 Parabéns! Conversão registrada.',
  nao_converteu: 'Registrado. Use as notas para calibrar a próxima abordagem.',
  em_andamento: 'Acompanhamento registrado. Boa sorte no follow-up!',
  cancelado: 'Cancelamento registrado.',
};

interface RegistrarResultadoModalProps {
  aberto: boolean;
  sessaoId: string;
  nomeCliente?: string;
  produto?: string;
  onFechar: () => void;
  onRegistrado: (resultado: SessaoResultado, notas: string) => void;
}

export default function RegistrarResultadoModal({
  aberto, sessaoId, nomeCliente, produto, onFechar, onRegistrado,
}: RegistrarResultadoModalProps) {
  const [resultado, setResultado] = useState<SessaoResultado | null>(null);
  const [notas, setNotas] = useState('');
  const [salvando, setSalvando] = useState(false);

  const reset = () => { setResultado(null); setNotas(''); };

  const handleSubmit = async () => {
    if (!resultado) return;
    setSalvando(true);
    try {
      await svpApi.atualizarSessao(sessaoId, resultado, notas || undefined);
      toast.success(TOAST_MSG[resultado]);
      onRegistrado(resultado, notas);
      onFechar();
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar resultado.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={v => { if (!v) { onFechar(); reset(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Como foi a reunião?</DialogTitle>
          {nomeCliente && produto && (
            <DialogDescription>
              Proposta de {produto} para {nomeCliente}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          {RESULTADO_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const selected = resultado === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setResultado(opt.value)}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  selected
                    ? `${opt.selectedBorder} ${opt.selectedBg}`
                    : 'border-border hover:border-muted-foreground/40'
                }`}
              >
                <Icon className={`h-5 w-5 mb-2 ${selected ? opt.iconColor : 'text-muted-foreground'}`} />
                <p className="text-sm font-medium text-foreground">{opt.title}</p>
                <p className="text-[11px] text-muted-foreground">{opt.subtitle}</p>
              </button>
            );
          })}
        </div>

        {resultado && (
          <div className="space-y-2 animate-in fade-in-0 duration-300">
            <Label className="text-sm">Notas da reunião</Label>
            <p className="text-xs text-muted-foreground">O SVP vai usar isso para calibrar futuras gerações.</p>
            <Textarea
              rows={5}
              placeholder={PLACEHOLDERS[resultado]}
              value={notas}
              onChange={e => setNotas(e.target.value)}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => { onFechar(); reset(); }} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!resultado || salvando}>
            {salvando ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Salvando...</>
            ) : (
              'Registrar Resultado'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
