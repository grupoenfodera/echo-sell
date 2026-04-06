import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGerarRoteiro } from '@/hooks/useGerarRoteiro';
import { FormularioGeracao } from '@/components/geracao/FormularioGeracao';
import { CardRoteiro } from '@/components/geracao/CardRoteiro';
import { ResultadoProposta } from '@/components/geracao/ResultadoProposta';
import { svpApi } from '@/lib/api-svp';
import { toast } from 'sonner';
import Header from '@/components/Header';
import type { GerarRoteiroPayload } from '@/types/crm';
import { Check } from 'lucide-react';

const STEPS = [
  { num: 1, label: 'Formulário' },
  { num: 2, label: 'Roteiro' },
  { num: 3, label: 'Proposta' },
] as const;

const ETAPA_INDEX: Record<string, number> = {
  formulario: 0,
  roteiro: 1,
  proposta: 2,
  concluido: 2,
};

export default function Gerar() {
  const { state, gerarRoteiro, aprovarRoteiro, rejeitarRoteiro, gerarProposta, reiniciar } = useGerarRoteiro();
  const [lastPayload, setLastPayload] = useState<GerarRoteiroPayload | null>(null);
  const navigate = useNavigate();

  const currentIndex = ETAPA_INDEX[state.etapa] ?? 0;

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [state.etapa]);

  // Redirect to roteiro page when roteiro is generated
  useEffect(() => {
    if (state.etapa === 'roteiro' && state.sessaoId) {
      navigate(`/roteiro/${state.sessaoId}`, { replace: true });
    }
  }, [state.etapa, state.sessaoId, navigate]);

  const handleFormSubmit = async (payload: GerarRoteiroPayload) => {
    setLastPayload(payload);
    const result = await gerarRoteiro(payload);
    if (result && result.async && result.sessaoId) {
      navigate(`/loading/${result.sessaoId}`, { replace: true });
    }
  };

  const handleRejeitar = async () => {
    if (!lastPayload) return;
    const result = await rejeitarRoteiro(lastPayload);
    if (result && result.async && result.sessaoId) {
      navigate(`/loading/${result.sessaoId}`, { replace: true });
    }
  };

  const handleAprovar = async () => {
    const ok = await aprovarRoteiro();
    if (ok) {
      await gerarProposta();
    }
  };

  const handleRegistrarResultado = async (resultado: string, notas: string) => {
    if (!state.sessaoId) return;
    try {
      await svpApi.atualizarSessao(state.sessaoId, resultado, notas);
      toast.success('Resultado salvo com sucesso!');
    } catch {
      toast.error('Erro ao salvar resultado');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-3xl mx-auto py-8 px-4 space-y-8">
        {/* Stepper */}
        <nav className="flex items-center justify-center gap-0">
          {STEPS.map((step, i) => {
            const isActive = i === currentIndex;
            const isCompleted = i < currentIndex;
            return (
              <div key={step.num} className="flex items-center">
                {i > 0 && (
                  <div
                    className={`h-0.5 w-10 sm:w-16 transition-colors ${
                      i <= currentIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : step.num}
                  </div>
                  <span
                    className={`text-xs whitespace-nowrap ${
                      isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {step.num} · {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Content */}
        {state.etapa === 'formulario' && (
          <FormularioGeracao
            onSubmit={handleFormSubmit}
            loading={state.loading}
            error={state.error}
          />
        )}

        {state.etapa === 'roteiro' && state.roteiro && (
          <CardRoteiro
            roteiro={state.roteiro}
            loading={state.loading}
            error={state.error}
            onAprovar={handleAprovar}
            onRejeitar={handleRejeitar}
          />
        )}

        {(state.etapa === 'proposta' || state.etapa === 'concluido') &&
          state.roteiro && state.proposta && state.email && state.objecoes && (
          <ResultadoProposta
            roteiro={state.roteiro}
            proposta={state.proposta}
            email={state.email}
            objecoes={state.objecoes}
            whatsapp={state.whatsapp}
            sessaoId={state.sessaoId!}
            produto={lastPayload?.produto}
            preco={lastPayload?.preco}
            onRegistrarResultado={handleRegistrarResultado}
            onNovaGeracao={reiniciar}
          />
        )}
      </main>
    </div>
  );
}
