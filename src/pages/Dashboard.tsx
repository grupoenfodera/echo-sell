import { useState } from 'react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import ModalitySelector from '@/components/ModalitySelector';
import SvpForm from '@/components/SvpForm';
import LoadingState from '@/components/LoadingState';
import ResultsDisplay from '@/components/ResultsDisplay';
import HistorySection from '@/components/HistorySection';
import type { Modality, SvpFormData, SvpResult, HistoryItem } from '@/types/svp';
import { initialFormData } from '@/types/svp';

const Dashboard = () => {
  const [modality, setModality] = useState<Modality | null>(null);
  const [formData, setFormData] = useState<SvpFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SvpResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const handleSubmit = async () => {
    if (!modality) return;
    setLoading(true);
    setResult(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Backend não configurado. Habilite o Lovable Cloud.');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/gerar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ ...formData, _modalidade: modality }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${response.status}`);
      }

      const data: SvpResult = await response.json();
      setResult(data);

      setHistory(prev => [{
        id: crypto.randomUUID(),
        modality,
        formData: { ...formData },
        result: data,
        timestamp: new Date(),
      }, ...prev].slice(0, 5));
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
      <main className="pt-[70px] pb-16 px-4 sm:px-6">
        <div className="max-w-[920px] mx-auto">
          {!loading && !result && (
            <>
              <HistorySection items={history} onSelect={handleHistoryClick} />
              <ModalitySelector selected={modality} onSelect={setModality} />
              {modality && (
                <SvpForm
                  modality={modality}
                  formData={formData}
                  onChange={setFormData}
                  onSubmit={handleSubmit}
                  loading={loading}
                />
              )}
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
