import { useState } from 'react';
import { toast } from 'sonner';
import { svpApi } from '@/lib/api-svp';
import type { Interacao, InteracaoCanal } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const CANAL_OPTIONS: { value: InteracaoCanal; label: string }[] = [
  { value: 'ligacao', label: 'Ligação' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'nota', label: 'Nota' },
];

interface NovaInteracaoModalProps {
  aberto: boolean;
  clienteId: string;
  canalInicial?: InteracaoCanal;
  onFechar: () => void;
  onCriada: (interacao: Interacao) => void;
}

export default function NovaInteracaoModal({
  aberto, clienteId, canalInicial, onFechar, onCriada,
}: NovaInteracaoModalProps) {
  const [salvando, setSalvando] = useState(false);
  const [canal, setCanal] = useState<InteracaoCanal>(canalInicial || 'nota');
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [direcao, setDirecao] = useState<'inbound' | 'outbound'>('outbound');
  const [duracao, setDuracao] = useState('');
  const [resultado, setResultado] = useState('');

  const showDirecao = ['ligacao', 'whatsapp', 'email'].includes(canal);
  const showDuracao = ['ligacao', 'reuniao'].includes(canal);
  const showResultado = ['ligacao', 'reuniao'].includes(canal);

  const resetForm = () => {
    setCanal(canalInicial || 'nota');
    setTitulo('');
    setConteudo('');
    setDirecao('outbound');
    setDuracao('');
    setResultado('');
  };

  const handleSubmit = async () => {
    setSalvando(true);
    try {
      await svpApi.registrarInteracao({
        cliente_id: clienteId,
        canal,
        titulo: titulo.trim() || undefined,
        conteudo: conteudo.trim() || undefined,
        direcao: showDirecao ? direcao : undefined,
        duracao_minutos: showDuracao && duracao ? parseInt(duracao, 10) : undefined,
        resultado: showResultado && resultado.trim() ? resultado.trim() : undefined,
      });

      // Build a local interacao object for optimistic UI
      const novaInteracao: Interacao = {
        id: crypto.randomUUID(),
        usuario_id: '',
        cliente_id: clienteId,
        canal,
        titulo: titulo.trim() || undefined,
        conteudo: conteudo.trim() || undefined,
        direcao: showDirecao ? direcao : undefined,
        duracao_minutos: showDuracao && duracao ? parseInt(duracao, 10) : undefined,
        resultado: showResultado && resultado.trim() ? resultado.trim() : undefined,
        criado_em: new Date().toISOString(),
      };

      toast.success('Interação registrada!');
      onCriada(novaInteracao);
      onFechar();
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar interação.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={v => { if (!v) { onFechar(); resetForm(); } }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Registrar Interação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Canal *</Label>
            <Select value={canal} onValueChange={v => setCanal(v as InteracaoCanal)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CANAL_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Assunto ou resumo</Label>
            <Input placeholder="Assunto ou resumo" value={titulo} onChange={e => setTitulo(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea rows={4} placeholder="Descreva o que aconteceu ou foi discutido..." value={conteudo} onChange={e => setConteudo(e.target.value)} />
          </div>

          {showDirecao && (
            <div className="space-y-1.5">
              <Label>Direção</Label>
              <RadioGroup value={direcao} onValueChange={v => setDirecao(v as 'inbound' | 'outbound')} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="inbound" id="dir-in" />
                  <Label htmlFor="dir-in" className="font-normal text-sm">Recebi</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="outbound" id="dir-out" />
                  <Label htmlFor="dir-out" className="font-normal text-sm">Enviei / Liguei</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {showDuracao && (
            <div className="space-y-1.5">
              <Label>Duração (minutos)</Label>
              <Input type="number" min={0} value={duracao} onChange={e => setDuracao(e.target.value)} />
            </div>
          )}

          {showResultado && (
            <div className="space-y-1.5">
              <Label>Resultado</Label>
              <Input placeholder="Ex: agendou demo, não atendeu, muito interesse..." value={resultado} onChange={e => setResultado(e.target.value)} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { onFechar(); resetForm(); }} disabled={salvando}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
