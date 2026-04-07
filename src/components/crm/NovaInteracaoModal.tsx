import { useState } from 'react';
import { toast } from 'sonner';
import { svpApi } from '@/lib/api-svp';
import { supabase } from '@/integrations/supabase/client';
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
import { Loader2, FlaskConical } from 'lucide-react';
import TranscricaoResultadoCard, { type AnaliseTranscricao } from './TranscricaoResultadoCard';

const CANAL_OPTIONS: { value: InteracaoCanal; label: string; beta?: boolean }[] = [
  { value: 'ligacao',      label: 'Ligação' },
  { value: 'reuniao',      label: 'Reunião' },
  { value: 'email',        label: 'Email' },
  { value: 'whatsapp',     label: 'WhatsApp' },
  { value: 'nota',         label: 'Nota' },
  { value: 'transcricao',  label: '🧪 Transcrição IA SVP', beta: true },
];

interface NovaInteracaoModalProps {
  aberto: boolean;
  clienteId: string;
  nomeCliente?: string;
  canalInicial?: InteracaoCanal;
  onFechar: () => void;
  onCriada: (interacao: Interacao) => void;
}

export default function NovaInteracaoModal({
  aberto, clienteId, nomeCliente, canalInicial, onFechar, onCriada,
}: NovaInteracaoModalProps) {
  const [salvando, setSalvando]       = useState(false);
  const [canal, setCanal]             = useState<InteracaoCanal>(canalInicial || 'nota');
  const [titulo, setTitulo]           = useState('');
  const [conteudo, setConteudo]       = useState('');
  const [direcao, setDirecao]         = useState<'inbound' | 'outbound'>('outbound');
  const [duracao, setDuracao]         = useState('');
  const [resultado, setResultado]     = useState('');

  // Transcription-specific state
  const [analisando, setAnalisando]   = useState(false);
  const [analise, setAnalise]         = useState<AnaliseTranscricao | null>(null);

  const isTranscricao  = canal === 'transcricao';
  const showDirecao    = !isTranscricao && ['ligacao', 'whatsapp', 'email'].includes(canal);
  const showDuracao    = !isTranscricao && ['ligacao', 'reuniao'].includes(canal);
  const showResultado  = !isTranscricao && ['ligacao', 'reuniao'].includes(canal);

  const resetForm = () => {
    setCanal(canalInicial || 'nota');
    setTitulo('');
    setConteudo('');
    setDirecao('outbound');
    setDuracao('');
    setResultado('');
    setAnalise(null);
  };

  /* ── Standard interaction submit ── */
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

  /* ── Transcription analysis ── */
  const handleAnalisarTranscricao = async () => {
    const texto = conteudo.trim();
    if (texto.length < 50) {
      toast.error('A transcrição deve ter ao menos 50 caracteres.');
      return;
    }

    setAnalisando(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.');

      const { data, error } = await supabase.functions.invoke('analisar-transcricao', {
        body: {
          transcricao: texto,
          cliente_id: clienteId,
          titulo: titulo.trim() || 'Transcrição analisada pela IA SVP',
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) throw new Error(error.message ?? 'Erro na análise');
      if (!data?.ok) throw new Error(data?.error ?? 'Erro na análise');

      setAnalise(data.analise as AnaliseTranscricao);

      // Add to timeline optimistically
      const interacaoLocal: Interacao = {
        id: data.interacao_id ?? crypto.randomUUID(),
        usuario_id: '',
        cliente_id: clienteId,
        canal: 'transcricao',
        direcao: 'interno',
        titulo: titulo.trim() || 'Transcrição analisada pela IA SVP',
        conteudo: texto,
        resumo_ia: (data.analise as AnaliseTranscricao).resumo,
        resultado: (data.analise as AnaliseTranscricao).nivel_interesse,
        criado_em: new Date().toISOString(),
      };
      onCriada(interacaoLocal);

      toast.success('Transcrição analisada com sucesso!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao analisar transcrição.');
    } finally {
      setAnalisando(false);
    }
  };

  /* ── Reset to new analysis ── */
  const handleNovaAnalise = () => {
    setAnalise(null);
    setConteudo('');
    setTitulo('');
  };

  /* ── Close handler ── */
  const handleClose = () => {
    onFechar();
    resetForm();
  };

  return (
    <Dialog open={aberto} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className={isTranscricao && analise ? 'sm:max-w-[600px]' : 'sm:max-w-[480px]'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isTranscricao ? (
              <>
                Analisar Transcrição
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300">
                  <FlaskConical className="h-2.5 w-2.5" /> BETA
                </span>
              </>
            ) : 'Registrar Interação'}
          </DialogTitle>
        </DialogHeader>

        {/* ── Transcription result view ── */}
        {isTranscricao && analise ? (
          <div className="py-2 max-h-[70vh] overflow-y-auto pr-1">
            <TranscricaoResultadoCard
              analise={analise}
              clienteId={clienteId}
              nomeCliente={nomeCliente}
              onNovaTranscricao={handleNovaAnalise}
              onFechar={handleClose}
            />
          </div>
        ) : (
          <>
            <div className="space-y-4 py-2">
              {/* Canal select */}
              <div className="space-y-1.5">
                <Label>Canal *</Label>
                <Select value={canal} onValueChange={v => { setCanal(v as InteracaoCanal); setAnalise(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CANAL_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>
                        <span className="flex items-center gap-2">
                          {o.label}
                          {o.beta && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                              BETA
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Transcription-specific UI */}
              {isTranscricao ? (
                <>
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10 px-4 py-3 space-y-1">
                    <p className="text-[12px] font-semibold text-amber-700 dark:text-amber-300">
                      🧪 IA SVP — Análise de Transcrição (Beta)
                    </p>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-400 leading-relaxed">
                      Cole a transcrição da reunião. A IA vai identificar palavras exatas do cliente, objeções, nível de interesse e auditar os 6 blocos SVP — pronto para gerar o próximo roteiro.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Título (opcional)</Label>
                    <Input
                      placeholder="Ex: Reunião inicial CTF do Brasil — 19/03"
                      value={titulo}
                      onChange={e => setTitulo(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Transcrição da reunião *</Label>
                    <Textarea
                      className="min-h-48 font-mono text-[12px] leading-relaxed resize-y"
                      placeholder="Cole aqui a transcrição completa da reunião... (mínimo 50 caracteres)"
                      value={conteudo}
                      onChange={e => setConteudo(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {conteudo.length} caracteres
                      {conteudo.length > 0 && conteudo.length < 50 && (
                        <span className="text-red-500 ml-1">— mínimo 50</span>
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Standard fields */}
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
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose} disabled={salvando || analisando}>
                Cancelar
              </Button>

              {isTranscricao ? (
                <Button
                  onClick={handleAnalisarTranscricao}
                  disabled={analisando || conteudo.trim().length < 50}
                  className="gap-2"
                >
                  {analisando
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Analisando...</>
                    : <><FlaskConical className="h-4 w-4" /> Analisar com IA SVP</>
                  }
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={salvando}>
                  {salvando && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Registrar
                </Button>
              )}
            </DialogFooter>
          </>
        )}

        {/* Footer when result is showing */}
        {isTranscricao && analise && (
          <DialogFooter>
            <Button variant="ghost" onClick={handleClose}>
              Fechar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
