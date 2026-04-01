export type Modality = 'm1' | 'm2a' | 'm2b';

export interface SvpFormData {
  nicho: string;
  produto: string;
  nomeCliente: string;
  preco: string;
  limiteMinimo: string;
  descricao: string;
  entregaveis: string;
  formatoEntrega: string;
  perfilCliente: string;
  objecaoPrincipal: string;
  canalContato: string;
  notasT1: string;
  objecaoSurgida: string;
}

export const initialFormData: SvpFormData = {
  nicho: '', produto: '', nomeCliente: '', preco: '', limiteMinimo: '',
  descricao: '', entregaveis: '', formatoEntrega: '', perfilCliente: '',
  objecaoPrincipal: '', canalContato: '', notasT1: '', objecaoSurgida: '',
};

export interface Beat {
  titulo: string;
  tag: string;
  tag_source: 'voss' | 'belfort' | 'hybrid';
  script: string;
  por_que: string;
  tom: string;
  se_cliente_reagir: string;
}

export interface Phase {
  num: number;
  titulo: string;
  tempo: string;
  phase_color: 'voss' | 'belfort' | 'hybrid' | 'close';
  phase_goal: string;
  beats: Beat[];
}

export interface PropostaSection {
  num: number;
  titulo: string;
  tempo?: string;
  conteudo: string;
}

export interface SvpEmail {
  assunto: string;
  corpo: string;
}

export interface SvpResult {
  perfil_decisor: string;
  maior_medo: string;
  decisao: string;
  tom_ideal: string;
  roteiro: Phase[];
  proposta?: PropostaSection[];
  email: SvpEmail;
}

export interface HistoryItem {
  id: string;
  modality: Modality;
  formData: SvpFormData;
  result: SvpResult;
  timestamp: Date;
}

export const modalityLabels: Record<Modality, string> = {
  m1: 'Diagnóstico + Fechamento',
  m2a: 'Primeiro Contato',
  m2b: 'Reunião de Proposta',
};

export const modalitySubmitLabels: Record<Modality, string> = {
  m1: 'Gerar Diagnóstico SVP',
  m2a: 'Gerar Roteiro de Primeiro Contato',
  m2b: 'Gerar Roteiro de Proposta',
};
