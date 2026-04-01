import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Header from '@/components/Header';
import DnaBanner from '@/components/DnaBanner';
import HistorySection from '@/components/HistorySection';
import GeracaoWizard from '@/components/geracao/GeracaoWizard';
import GeracaoLoading from '@/components/geracao/GeracaoLoading';
import RoteiroResultado from '@/components/geracao/RoteiroResultado';
import PropostaResultado from '@/components/geracao/PropostaResultado';
import type { WizardData } from '@/components/geracao/GeracaoWizard';
import type { Modality, SvpFormData, SvpResult, HistoryItem } from '@/types/svp';
import type { RoteiroJSON, PropostaJSON, EmailJSON, ObjecaoItem } from '@/types/crm';
import { svpApi } from '@/lib/api-svp';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, refreshUsuario } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [dna, setDna] = useState<{ contexto: string | null; tom_primario: string | null } | null>(null);

  // ── Novos estados de fluxo ──
  const [etapaView, setEtapaView] = useState<
    'wizard' | 'loading' | 'resultado_roteiro' | 'resultado_proposta'
  >('wizard');
  const [loadingTipo, setLoadingTipo] = useState<'roteiro' | 'proposta' | null>(null);
  const [faseLoading, setFaseLoading] = useState(0);
  const [sessaoAtual, setSessaoAtual] = useState<string | null>(null);
  const [clienteAtual, setClienteAtual] = useState<string | null>(null);
  const [dadosRoteiro, setDadosRoteiro] = useState<RoteiroJSON | null>(null);
  const [dadosProposta, setDadosProposta] = useState<{
    proposta: PropostaJSON;
    email: EmailJSON;
    objecoes: ObjecaoItem[];
  } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

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

  // ── Handler do wizard ──
  const handleWizardSubmit = async (dados: WizardData, tipo: 'roteiro' | 'proposta') => {
    setErro(null);
    setLoadingTipo(tipo);
    setFaseLoading(0);
    setEtapaView('loading');

    try {
      const payload = {
        nicho: dados.nicho,
        produto: dados.produto,
        preco: dados.preco ? parseFloat(dados.preco.replace(',', '.')) : undefined,
        contexto: dados.contexto || undefined,
        nome_cliente: dados.nome_cliente || undefined,
        dados_extras: {
          empresa: dados.empresa || undefined,
          como_conhecemos: dados.como_conhecemos || undefined,
        },
      };

      // Fase 0 → 1
      setFaseLoading(0);
      await new Promise(r => setTimeout(r, 600));
      setFaseLoading(1);

      const roteiroRes = await svpApi.gerarRoteiro(payload);
      setSessaoAtual(roteiroRes.sessao_id);
      setClienteAtual(roteiroRes.cliente_id);
      setDadosRoteiro(roteiroRes.roteiro);

      if (tipo === 'roteiro') {
        setFaseLoading(2);
        await new Promise(r => setTimeout(r, 400));
        setEtapaView('resultado_roteiro');
        refreshUsuario();
        return;
      }

      // Fluxo proposta completa
      setFaseLoading(2);
      await svpApi.aprovarRoteiro({ sessao_id: roteiroRes.sessao_id, aprovado: true });

      setFaseLoading(3);
      const propostaRes = await svpApi.gerarProposta({ sessao_id: roteiroRes.sessao_id });
      setDadosProposta({
        proposta: propostaRes.proposta,
        email: propostaRes.email,
        objecoes: propostaRes.objecoes,
      });

      await new Promise(r => setTimeout(r, 400));
      setEtapaView('resultado_proposta');
      refreshUsuario();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao gerar. Tente novamente.');
      setEtapaView('wizard');
      setLoadingTipo(null);
    }
  };

  return (
    <>
      <Header />
      <DnaBanner />
      <main className="pt-[70px] pb-16 px-4 sm:px-6">
        <div className="max-w-[920px] mx-auto">
          {etapaView === 'wizard' && (
            <>
              {erro && (
                <div className="max-w-[560px] mx-auto mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                  {erro}
                </div>
              )}
              <HistorySection items={history} onSelect={() => {}} />
              <GeracaoWizard
                onSubmit={handleWizardSubmit}
                isLoading={loadingTipo !== null}
                loadingTipo={loadingTipo}
              />
            </>
          )}

          {etapaView === 'loading' && loadingTipo && (
            <GeracaoLoading tipo={loadingTipo} faseAtual={faseLoading} />
          )}

          {etapaView === 'resultado_roteiro' && dadosRoteiro && sessaoAtual && (
            <RoteiroResultado
              roteiro={dadosRoteiro}
              sessaoId={sessaoAtual}
              onAprovado={async () => {
                setLoadingTipo('proposta');
                setFaseLoading(2);
                setEtapaView('loading');
                try {
                  const res = await svpApi.gerarProposta({ sessao_id: sessaoAtual! });
                  setDadosProposta({
                    proposta: res.proposta,
                    email: res.email,
                    objecoes: res.objecoes,
                  });
                  setFaseLoading(3);
                  await new Promise(r => setTimeout(r, 400));
                  setEtapaView('resultado_proposta');
                  refreshUsuario();
                } catch (err) {
                  setErro(err instanceof Error ? err.message : 'Erro ao gerar proposta.');
                  setEtapaView('resultado_roteiro');
                }
              }}
              onRejeitado={() => {
                setEtapaView('wizard');
                setDadosRoteiro(null);
                setSessaoAtual(null);
              }}
            />
          )}

          {etapaView === 'resultado_proposta' && dadosProposta && (
            <PropostaResultado
              proposta={dadosProposta.proposta}
              email={dadosProposta.email}
              objecoes={dadosProposta.objecoes}
              sessaoId={sessaoAtual!}
              clienteId={clienteAtual}
              onNovaGeracao={() => {
                setEtapaView('wizard');
                setDadosRoteiro(null);
                setDadosProposta(null);
                setSessaoAtual(null);
                setClienteAtual(null);
              }}
              onVerCRM={() => {
                console.log('navegar para CRM cliente:', clienteAtual);
              }}
            />
          )}
        </div>
      </main>
    </>
  );
};

export default Dashboard;
