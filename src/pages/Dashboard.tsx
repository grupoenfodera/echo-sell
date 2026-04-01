import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import DnaBanner from '@/components/DnaBanner';
import ModalitySelector from '@/components/ModalitySelector';
import SvpForm from '@/components/SvpForm';
import LoadingState from '@/components/LoadingState';
import ResultsDisplay from '@/components/ResultsDisplay';
import HistorySection from '@/components/HistorySection';
import GeracaoWizard from '@/components/geracao/GeracaoWizard';
import type { WizardData } from '@/components/geracao/GeracaoWizard';
import type { Modality, SvpFormData, SvpResult, HistoryItem } from '@/types/svp';
import { initialFormData } from '@/types/svp';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const { user, refreshUsuario } = useAuth();
  const [modality, setModality] = useState<Modality | null>(null);
  const [formData, setFormData] = useState<SvpFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SvpResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [dna, setDna] = useState<{ contexto: string | null; tom_primario: string | null } | null>(null);
  const [contextoGeracao, setContextoGeracao] = useState<string | null>(null);

  // Load user DNA
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('usuario_dna')
      .select('contexto, tom_primario')
      .eq('usuario_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setDna(data);
      });
  }, [user?.id]);

  // Auto-set context when DNA has fixed context
  useEffect(() => {
    if (dna?.contexto && dna.contexto !== 'ambos') {
      setContextoGeracao(dna.contexto);
    }
  }, [dna]);

  const handleSubmit = async () => {
    if (!modality) return;

    // Validate B2B/B2C selection for dual-context users
    if (dna?.contexto === 'ambos' && !contextoGeracao) {
      toast.error('Selecione o contexto desta venda (B2B ou B2C).');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('gerar', {
        body: {
          ...formData,
          _modalidade: modality,
          contexto_geracao: contextoGeracao || (dna?.contexto !== 'ambos' ? dna?.contexto : null),
        },
      });

      // Unified error check: SDK error OR edge function JSON error
      const errorMessage = error?.message || data?.error || null;
      if (errorMessage) {
        toast.error(errorMessage);
        setLoading(false);
        return;
      }

      setResult(data as SvpResult);

      setHistory(prev => [{
        id: crypto.randomUUID(),
        modality,
        formData: { ...formData },
        result: data,
        timestamp: new Date(),
      }, ...prev].slice(0, 5));

      // Refresh user data to update quota display
      refreshUsuario();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao gerar roteiro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryClick = (item: HistoryItem) => {
    setModality(item.modality);
    setFormData(item.formData);
    setResult(item.result);
  };

  const handleReset = () => {
    setResult(null);
  };

  return (
    <>
      <Header />
      <DnaBanner />
      <main className="pt-[70px] pb-16 px-4 sm:px-6">
        <div className="max-w-[920px] mx-auto">
          {!loading && !result && (
            <>
              <HistorySection items={history} onSelect={handleHistoryClick} />
              <GeracaoWizard
                onSubmit={(dados, tipo) => console.log('Wizard submitted:', dados, tipo)}
                isLoading={false}
                loadingTipo={null}
              />
            </>
          )}
          {loading && <LoadingState />}
          {result && modality && (
            <ResultsDisplay result={result} modality={modality} onReset={handleReset} />
          )}
        </div>
      </main>
    </>
  );
};

export default Dashboard;
