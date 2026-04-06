import { supabase } from '@/integrations/supabase/client';
import type {
  GerarRoteiroPayload, GerarRoteiroResponse,
  AprovarRoteiroPayload, AprovarRoteiroResponse,
  GerarPropostaResponse, CrmListarResponse,
  Cliente, SessaoVenda, Interacao
} from '@/types/crm';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function callFunction<T>(name: string, options: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok && res.status !== 202) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function callFunctionWithStatus<T>(name: string, options: RequestInit = {}): Promise<{ data: T; httpStatus: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok && res.status !== 202) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return { data, httpStatus: res.status };
}

export const svpApi = {
  gerarRoteiro: (payload: GerarRoteiroPayload) =>
    callFunction<GerarRoteiroResponse>('gerar-roteiro', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Like gerarRoteiro but returns HTTP status to detect 202 async */
  gerarRoteiroAsync: (payload: GerarRoteiroPayload) =>
    callFunctionWithStatus<GerarRoteiroResponse & { status?: string }>('gerar-roteiro', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Poll roteiro generation status */
  roteiroStatus: (sessaoId: string) =>
    callFunction<{ sessao_id: string; status: 'gerando' | 'pronto' | 'erro'; pronto: boolean; erro?: string }>(`roteiro-status?sessao_id=${sessaoId}`),

  aprovarRoteiro: (payload: AprovarRoteiroPayload) =>
    callFunction<AprovarRoteiroResponse>('aprovar-roteiro', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  gerarProposta: (sessao_id: string) =>
    callFunction<GerarPropostaResponse>('gerar-proposta', {
      method: 'POST',
      body: JSON.stringify({ sessao_id }),
    }),

  gerarPeca: (sessao_id: string, tipo: 'proposta' | 'email' | 'whatsapp' | 'objecoes') =>
    callFunction<{ ok: boolean; sessao_id: string; tipo: string; [key: string]: unknown }>('gerar-peca', {
      method: 'POST',
      body: JSON.stringify({ sessao_id, tipo }),
    }),

  listarClientes: (pagina = 1, porPagina = 20) =>
    callFunction<CrmListarResponse>(`crm-listar?pagina=${pagina}&por_pagina=${porPagina}`),

  buscarCliente: (clienteId: string) =>
    callFunction<CrmListarResponse>(`crm-listar?cliente_id=${clienteId}`),

  atualizarSessao: (sessaoId: string, resultado: string, notas?: string) =>
    callFunction<{ ok: boolean }>('crm-atualizar', {
      method: 'POST',
      body: JSON.stringify({ sessao_id: sessaoId, resultado, notas_pos_reuniao: notas }),
    }),

  atualizarCliente: (clienteId: string, campos: Partial<Cliente>) =>
    callFunction<{ ok: boolean }>('crm-atualizar', {
      method: 'POST',
      body: JSON.stringify({ cliente_id: clienteId, ...campos }),
    }),

  registrarInteracao: (interacao: Omit<Interacao, 'id' | 'usuario_id' | 'criado_em'>) =>
    callFunction<{ ok: boolean; interacao_id: string }>('crm-atualizar', {
      method: 'POST',
      body: JSON.stringify({ interacao }),
    }),
};
