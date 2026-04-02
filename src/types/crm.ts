export type ClienteStatus = 'novo' | 'em_contato' | 'proposta_enviada' | 'negociacao' | 'ganho' | 'perdido';

export type ClienteTemperatura = 'frio' | 'morno' | 'ativo' | 'em_risco';

export type InteracaoCanal = 'whatsapp' | 'email' | 'ligacao' | 'reuniao' | 'nota' | 'roteiro' | 'proposta' | 'transcricao';

export type SessaoResultado = 'converteu' | 'nao_converteu' | 'em_andamento' | 'cancelado';

export type DealEtapa = 'prospeccao' | 'qualificacao' | 'proposta' | 'negociacao' | 'fechado_ganho' | 'fechado_perdido';

export interface Cliente {
  id: string;
  usuario_id: string;
  nome: string;
  empresa?: string;
  whatsapp?: string;
  email?: string;
  linkedin_url?: string;
  instagram_url?: string;
  como_conhecemos?: string;
  indicado_por?: string;
  tags?: string[];
  status: ClienteStatus;
  temperatura: ClienteTemperatura;
  ultimo_contato_em?: string;
  notas?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface RoteiroEtapa {
  duracao_min: number;
  objetivo: string;
  script?: string;
  dicas?: string[];
  perguntas?: string[];
  pontos_chave?: string[];
  tecnicas?: string[];
  objecoes_previstas?: { objecao: string; resposta: string }[];
}

export interface RoteiroBloco {
  numero: number;
  bloco: string;
  titulo: string;
  tempo: string;
  script: string;
  tecnica: string;
  nota_tecnica: string;
}

export interface RoteiroJSON {
  roteiro_reuniao: RoteiroBloco[] | {
    abertura: RoteiroEtapa;
    descoberta: RoteiroEtapa;
    apresentacao_solucao: RoteiroEtapa;
    tratamento_objecoes: RoteiroEtapa;
    fechamento: RoteiroEtapa;
  };
  tempo_total_min?: number;
  resumo_estrategico: string;
  maior_medo?: string;
  decisao_style?: string;
  tom_ideal?: string;
  alerta_terceiro?: string;
  score: number;
  score_breakdown?: Record<string, number>;
}

export interface PropostaJSON {
  titulo: string;
  abertura?: string;
  introducao?: string;
  diagnostico: string;
  solucao: string;
  beneficios: string[];
  investimento: { criterio?: string; valor: string; condicoes: string; garantia: string };
  micro_sins?: string;
  proximo_passo: string;
  fechamento: string;
}

export interface EmailJSON {
  assunto: string;
  para?: string;
  saudacao: string;
  corpo: string;
  destaque_1?: string;
  destaque_2?: string;
  cta: string;
  assinatura: string;
}

export interface WhatsAppJSON {
  mensagem_principal: string;
  abertura: string;
  valor_rapido: string;
  cta: string;
  versao_curta: string;
}

export interface ObjecaoItem {
  objecao: string;
  resposta_curta: string;
  resposta_completa: string;
  categoria: 'preco' | 'tempo' | 'confianca' | 'necessidade' | 'autoridade';
}

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

export interface SessaoVenda {
  id: string;
  usuario_id: string;
  cliente_id?: string;
  nicho?: string;
  produto?: string;
  preco?: number;
  contexto?: string;
  dados_formulario?: Record<string, unknown>;
  roteiro_json?: RoteiroJSON;
  roteiro_gerado_em?: string;
  roteiro_aprovado?: boolean | null;
  roteiro_aprovado_em?: string;
  proposta_json?: PropostaJSON;
  proposta_gerada_em?: string;
  email_json?: EmailJSON;
  email_gerado_em?: string;
  objecoes_json?: ObjecaoItem[];
  objecoes_geradas_em?: string;
  whatsapp_json?: WhatsAppJSON;
  whatsapp_gerado_em?: string;
  resultado?: SessaoResultado;
  notas_pos_reuniao?: string;
  criado_em: string;
  atualizado_em: string;
}

// Payloads de API
export interface GerarRoteiroPayload {
  nicho: string;
  produto: string;
  preco?: number;
  contextoGeracao?: 'b2b' | 'b2c';
  nome_cliente?: string;
  cliente_id?: string;
  dados_extras?: Record<string, unknown>;
}

export interface GerarRoteiroResponse {
  ok: boolean;
  sessao_id: string;
  cliente_id?: string;
  roteiro: RoteiroJSON;
}

export interface AprovarRoteiroPayload {
  sessao_id: string;
  aprovado: boolean;
}

export interface AprovarRoteiroResponse {
  ok: boolean;
  aprovado: boolean;
  regenerar?: boolean;
  mensagem: string;
}

export interface GerarPropostaResponse {
  ok: boolean;
  sessao_id: string;
  proposta: PropostaJSON;
  email: EmailJSON;
  objecoes: ObjecaoItem[];
  whatsapp: WhatsAppJSON;
}

export interface CrmListarResponse {
  clientes?: Cliente[];
  total?: number;
  pagina?: number;
  cliente?: Cliente;
  sessoes?: SessaoVenda[];
  interacoes?: Interacao[];
}
