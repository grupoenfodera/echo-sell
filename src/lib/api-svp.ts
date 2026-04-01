import { supabase } from '@/integrations/supabase/client';
import type {
  GerarRoteiroPayload,   GerarRoteiroResponse,
  AprovarRoteiroPayload, AprovarRoteiroResponse,
  GerarPropostaResponse,
  CrmListarResponse,
} from '@/types/crm';

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function getAuthHeader(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Usuário não autenticado');
  return `Bearer ${token}`;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const auth = await getAuthHeader();
  const res = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `Erro ${res.status}`);
  return data as T;
}

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const auth = await getAuthHeader();
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await fetch(`${BASE}/${path}${qs}`, {
    headers: {
      Authorization: auth,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `Erro ${res.status}`);
  return data as T;
}

// ── Geração ───────────────────────────────────────
export const svpApi = {
  gerarRoteiro: (payload: GerarRoteiroPayload) =>
    post<GerarRoteiroResponse>('gerar-roteiro', payload),

  aprovarRoteiro: (payload: AprovarRoteiroPayload) =>
    post<AprovarRoteiroResponse>('aprovar-roteiro', payload),

  gerarProposta: (payload: { sessao_id: string }) =>
    post<GerarPropostaResponse>('gerar-proposta', payload),

  // ── CRM ─────────────────────────────────────────
  listarClientes: (pagina = 1, porPagina = 20) =>
    get<CrmListarResponse>('crm-listar', {
      pagina: String(pagina),
      por_pagina: String(porPagina),
    }),

  buscarCliente: (clienteId: string) =>
    get<CrmListarResponse>('crm-listar', { cliente_id: clienteId }),

  atualizarSessao: (payload: { sessao_id: string; resultado?: string; notas_pos_reuniao?: string }) =>
    post<{ ok: boolean }>('crm-atualizar', payload),

  atualizarCliente: (payload: { cliente_id: string } & Record<string, unknown>) =>
    post<{ ok: boolean }>('crm-atualizar', payload),

  registrarInteracao: (payload: { interacao: Record<string, unknown> }) =>
    post<{ ok: boolean }>('crm-atualizar', payload),
};
