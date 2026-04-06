import { useState, useCallback } from 'react';
import { svpApi } from '@/lib/api-svp';
import type { RoteiroJSON, GerarRoteiroPayload, PropostaJSON, EmailJSON, ObjecaoItem, WhatsAppJSON } from '@/types/crm';

export type GeracaoEtapa = 'formulario' | 'roteiro' | 'proposta' | 'concluido';

export interface GeracaoState {
  etapa: GeracaoEtapa;
  sessaoId: string | null;
  clienteId: string | null;
  roteiro: RoteiroJSON | null;
  proposta: PropostaJSON | null;
  email: EmailJSON | null;
  objecoes: ObjecaoItem[] | null;
  whatsapp: WhatsAppJSON | null;
  loading: boolean;
  error: string | null;
}

const INITIAL_STATE: GeracaoState = {
  etapa: 'formulario',
  sessaoId: null,
  clienteId: null,
  roteiro: null,
  proposta: null,
  email: null,
  objecoes: null,
  whatsapp: null,
  loading: false,
  error: null,
};

export function useGerarRoteiro() {
  const [state, setState] = useState<GeracaoState>(INITIAL_STATE);

  const setLoading = (loading: boolean) => setState(s => ({ ...s, loading, error: null }));
  const setError = (error: string) => setState(s => ({ ...s, loading: false, error }));

  const gerarRoteiro = useCallback(async (payload: GerarRoteiroPayload): Promise<{ async: boolean; sessaoId?: string } | void> => {
    setLoading(true);
    try {
      const { data: res, httpStatus } = await svpApi.gerarRoteiroAsync(payload);

      // Async flow: 202 means generation is in background
      if (httpStatus === 202 && res.sessao_id) {
        setState(s => ({ ...s, loading: false, sessaoId: res.sessao_id }));
        return { async: true, sessaoId: res.sessao_id };
      }

      if (!res.sessao_id) {
        setError('Erro interno: sessão não foi salva. Tente novamente.');
        return;
      }
      if (!res.roteiro) {
        setError('Roteiro não foi gerado. Tente novamente.');
        return;
      }
      setState(s => ({
        ...s,
        loading: false,
        etapa: 'roteiro',
        sessaoId: res.sessao_id,
        clienteId: res.cliente_id ?? null,
        roteiro: res.roteiro,
      }));
      return { async: false, sessaoId: res.sessao_id };
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar roteiro');
    }
  }, []);

  const aprovarRoteiro = useCallback(async (): Promise<boolean> => {
    if (!state.sessaoId) {
      setError('Sessão inválida. Gere o roteiro novamente.');
      return false;
    }
    setLoading(true);
    try {
      console.log('Aprovando sessao:', state.sessaoId);
      await svpApi.aprovarRoteiro({ sessao_id: state.sessaoId, aprovado: true });
      setState(s => ({ ...s, loading: false }));
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao aprovar roteiro');
      return false;
    }
  }, [state.sessaoId]);

  const rejeitarRoteiro = useCallback(async (payload: GerarRoteiroPayload): Promise<{ async: boolean; sessaoId?: string } | void> => {
    if (!state.sessaoId) return;
    setLoading(true);
    try {
      await svpApi.aprovarRoteiro({ sessao_id: state.sessaoId, aprovado: false });
      const { data: res, httpStatus } = await svpApi.gerarRoteiroAsync(payload);

      if (httpStatus === 202 && res.sessao_id) {
        setState(s => ({ ...s, loading: false, sessaoId: res.sessao_id }));
        return { async: true, sessaoId: res.sessao_id };
      }

      setState(s => ({
        ...s,
        loading: false,
        etapa: 'roteiro',
        sessaoId: res.sessao_id,
        clienteId: res.cliente_id ?? null,
        roteiro: res.roteiro,
      }));
      return { async: false, sessaoId: res.sessao_id };
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao regenerar roteiro');
    }
  }, [state.sessaoId]);

  const gerarProposta = useCallback(async () => {
    if (!state.sessaoId) {
      setError('Sessão inválida. Reinicie o fluxo.');
      return;
    }
    setLoading(true);
    try {
      const res = await svpApi.gerarProposta(state.sessaoId);
      setState(s => ({
        ...s,
        loading: false,
        etapa: 'proposta',
        proposta: res.proposta,
        email: res.email,
        objecoes: res.objecoes,
        whatsapp: res.whatsapp ?? null,
      }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar proposta');
    }
  }, [state.sessaoId]);

  const reiniciar = useCallback(() => setState(INITIAL_STATE), []);

  return { state, gerarRoteiro, aprovarRoteiro, rejeitarRoteiro, gerarProposta, reiniciar };
}
