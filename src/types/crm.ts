export type ClienteStatus =
  | 'novo'
  | 'em_contato'
  | 'proposta_enviada'
  | 'negociacao'
  | 'ganho'
  | 'perdido';

export type ClienteTemperatura = 'frio' | 'morno' | 'ativo' | 'em_risco';

export type InteracaoCanal =
  | 'whatsapp'
  | 'email'
  | 'ligacao'
  | 'reuniao'
  | 'nota'
  | 'roteiro'
  | 'proposta'
  | 'transcricao';

export type SessaoResultado =
  | 'converteu'
  | 'nao_converteu'
  | 'em_andamento'
  | 'cancelado';

export type DealEtapa =
  | 'prospeccao'
  | 'qualificacao'
  | 'proposta'
  | 'negociacao'
  | 'fechado_ganho'
  | 'fechado_perdido';

// ── Cliente ──────────────────────────────────────
export interface Cliente {
  id: string;
  usuario_id: string;
  nome: string;
  empresa?: string;
  whatsapp?: string;
  email?: string;
  linkedin_url?: string;
  instagram_url?: string;
  como_conhecemos?: 'indicacao' | 'evento' | 'linkedin' | 'instagram' | 'abordagem_fria' | 'outros';
  indicado_por?: string;
  tags?: string[];
  status: ClienteStatus;
  temperatura: ClienteTemperatura;
  temperatura_atualizada_em?: string;
  ultimo_contato_em?: string;
  notas?: string;
  criado_em: string;
  atualizado_em: string;
  // campo computado retornado pelo crm-listar
  ultima_sessao?: SessaoResumo | null;
}

// ── Sessão de Venda ───────────────────────────────
export interface SessaoResumo {
  id: string;
  produto?: string;
  resultado?: SessaoResultado;
  criado_em: string;
  roteiro_aprovado?: boolean | null;
  proposta_gerada_em?: string;
}

export interface SessaoVenda {
  id: string;
  usuario_id: string;
  cliente_id?: string;
  nicho?: string;
  produto?: string;
  preco?: number;
  contexto?: 'b2b' | 'b2c';
  dados_formulario?: Record<string, unknown>;
  // Etapa 1 — Roteiro
  roteiro_json?: RoteiroJSON | null;
  roteiro_gerado_em?: string;
  roteiro_aprovado?: boolean | null;
  roteiro_aprovado_em?: string;
  // Etapa 2 — Proposta
  proposta_json?: PropostaJSON | null;
  proposta_gerada_em?: string;
  email_json?: EmailJSON | null;
  email_gerado_em?: string;
  objecoes_json?: ObjecaoItem[] | null;
  objecoes_geradas_em?: string;
  // CRM
  resultado?: SessaoResultado;
  notas_pos_reuniao?: string;
  tokens_roteiro?: number;
  tokens_proposta?: number;
  criado_em: string;
  atualizado_em: string;
}

// ── Estruturas do Roteiro ─────────────────────────
export interface RoteiroSecao {
  objetivo: string;
  script?: string;
  perguntas?: string[];
  tempo_min: number;
}

export interface RoteiroObjecao {
  objecao: string;
  resposta: string;
}

export interface RoteiroFechamento extends RoteiroSecao {
  proximo_passo: string;
}

export interface RoteiroJSON {
  roteiro_reuniao: {
    abertura: RoteiroSecao;
    descoberta: RoteiroSecao & { perguntas: string[] };
    apresentacao_solucao: RoteiroSecao;
    tratamento_objecoes: {
      objecoes_previstas: RoteiroObjecao[];
      tempo_min: number;
    };
    fechamento: RoteiroFechamento;
  };
  tempo_total_min: number;
  resumo_estrategico: string;
  score: number;
  score_breakdown: {
    personalizacao: number;
    clareza_proposta: number;
    urgencia_cta: number;
    tom_adequado: number;
  };
}

// ── Estruturas da Proposta ────────────────────────
export interface PropostaJSON {
  titulo: string;
  introducao: string;
  diagnostico: string;
  solucao: string;
  beneficios: string[];
  investimento: string;
  garantia: string;
  proximo_passo: string;
  validade: string;
}

export interface EmailJSON {
  assunto: string;
  corpo: string;
  cta: string;
  ps: string;
}

export interface ObjecaoItem {
  objecao: string;
  tipo: 'preco' | 'urgencia' | 'concorrencia' | 'confianca' | 'necessidade';
  resposta_curta: string;
  resposta_completa: string;
}

// ── Interação (Timeline) ──────────────────────────
export interface Interacao {
  id: string;
  usuario_id: string;
  cliente_id: string;
  canal: InteracaoCanal;
  direcao?: 'inbound' | 'outbound' | 'interno';
  titulo?: string;
  conteudo?: string;
  resumo_ia?: string;
  duracao_minutos?: number;
  resultado?: string;
  proxima_acao_sugerida?: string;
  metadata?: Record<string, unknown>;
  criado_em: string;
}

// ── Deal ─────────────────────────────────────────
export interface Deal {
  id: string;
  usuario_id: string;
  cliente_id: string;
  titulo: string;
  valor?: number;
  etapa: DealEtapa;
  probabilidade?: number;
  data_previsao_fechamento?: string;
  motivo_perda?: string;
  score_saude?: number;
  criado_em: string;
  atualizado_em: string;
}

// ── Payloads de Request ───────────────────────────
export interface GerarRoteiroPayload {
  nicho: string;
  produto: string;
  preco?: number;
  contexto?: 'b2b' | 'b2c';
  nome_cliente?: string;
  cliente_id?: string;
  dados_extras?: Record<string, unknown>;
}

export interface AprovarRoteiroPayload {
  sessao_id: string;
  aprovado: boolean;
}

export interface GerarPropostaPayload {
  sessao_id: string;
}

export interface AtualizarSessaoPayload {
  sessao_id: string;
  resultado?: SessaoResultado;
  notas_pos_reuniao?: string;
}

export interface AtualizarClientePayload {
  cliente_id: string;
  nome?: string;
  empresa?: string;
  whatsapp?: string;
  email?: string;
  linkedin_url?: string;
  instagram_url?: string;
  como_conhecemos?: Cliente['como_conhecemos'];
  tags?: string[];
  status?: ClienteStatus;
  temperatura?: ClienteTemperatura;
  notas?: string;
}

export interface RegistrarInteracaoPayload {
  interacao: {
    cliente_id: string;
    canal: InteracaoCanal;
    titulo?: string;
    conteudo?: string;
    direcao?: 'inbound' | 'outbound' | 'interno';
    duracao_minutos?: number;
    resultado?: string;
    metadata?: Record<string, unknown>;
  };
}

// ── Responses ─────────────────────────────────────
export interface GerarRoteiroResponse {
  ok: boolean;
  sessao_id: string;
  cliente_id: string | null;
  roteiro: RoteiroJSON;
}

export interface AprovarRoteiroResponse {
  ok: boolean;
  aprovado: boolean;
  regenerar: boolean;
  sessao_id?: string;
  mensagem: string;
}

export interface GerarPropostaResponse {
  ok: boolean;
  sessao_id: string;
  proposta: PropostaJSON;
  email: EmailJSON;
  objecoes: ObjecaoItem[];
}

export interface CrmListarResponse {
  ok: boolean;
  clientes: Cliente[];
  pagina: number;
  por_pagina: number;
}

export interface CrmDetalheResponse {
  ok: boolean;
  cliente: Cliente;
  sessoes: SessaoVenda[];
  interacoes: Interacao[];
}
