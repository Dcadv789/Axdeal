// ==================== INTERFACES PRINCIPAIS ====================

export interface NovaPropostaPageProps {
  onBack: () => void;
  mode?: 'create' | 'edit' | 'view';
  propostaId?: string | null;
  vendaId?: string | null;
  tipo?: 'proposta' | 'venda';
}

export interface PropostaItem {
  id: string;
  tipo: 'servico' | 'produto';
  codigo: string;
  nome: string;
  quantidade: number;
  valorUnitario: string;
  descontoReal: string;
  descontoPercent: string;
  valorTotal: number;
}

export interface Parcela {
  id: string;
  numero: number;
  valor: string;
  vencimento: string;
  formaPagamento: string;
  observacoes: string;
}

export interface Cliente {
  id: string;
  nome_razao_social: string;
  nome_fantasia: string | null;
  tipo_pessoa: string;
  cnpj: string | null;
  cpf: string | null;
}

export interface CatalogoItem {
  id: string;
  codigo: string | null;
  nome: string;
  tipo: string;
  preco_venda: number;
  descricao_padrao: string | null;
}

export interface CondicaoPagamento {
  id: string;
  nome: string;
  regras: Array<{ dias: number; percentual: number }>;
  editavel_na_venda: boolean | null;
}

export interface PropostaFormData {
  numeroProposta: string;
  titulo: string;
  clienteBusca: string;
  dataProposta: string;
  dataValidade: string;
  prazoEntrega: string;
  prazoGarantia: string;
  observacoes: string;
  observacoesInternas: string;
}

export interface Configuracoes {
  prefixo_proposta: string;
  proximo_numero_proposta: number;
  prefixo_venda: string;
  proximo_numero_venda: number;
  prazo_validade_proposta_padrao: number;
  prazo_garantia_servico_padrao: number;
  prazo_entrega_padrao: number;
  observacoes_padrao_proposta: string;
  observacoes_padrao_venda: string;
}

// ==================== TIPOS ====================

export type ConfigTab = 'personalizacao' | 'juridico';
export type ItemTipo = 'servico' | 'produto';
export type PropostaMode = 'create' | 'edit' | 'view';
export type PropostaTipo = 'proposta' | 'venda';

// ==================== ESTADOS E SUGESTÕES ====================

export interface ItemSugestoesState {
  [key: string]: CatalogoItem[];
}

export interface MostrarSugestoesState {
  [key: string]: boolean;
}





