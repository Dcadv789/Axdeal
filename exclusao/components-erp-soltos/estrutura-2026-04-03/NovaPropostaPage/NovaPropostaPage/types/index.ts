// ==================== INTERFACES PRINCIPAIS ====================

export interface NovaPropostaPageProps {
  onBack: () => void;
  onSavedSuccess?: () => void;
  mode?: 'create' | 'edit' | 'view' | 'copy';
  propostaId?: string | null;
  vendaId?: string | null;
  osId?: string | null;
  tipo?: 'proposta' | 'venda' | 'os';
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
  /** UUID do item no catálogo (erp_catalogo). null quando item não veio do catálogo. */
  id_item_catalogo?: string | null;
  custoAquisicao?: number | null;
}

export interface Parcela {
  id: string;
  numero: number;
  valor: string;
  vencimento: string;
  formaPagamento: string;
  idFormaPagamento?: string | null;
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
  custo_aquisicao?: number | null;
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
  descricao: string;
  referencia: string;
  clienteBusca: string;
  id_departamento: string | null;
  id_projeto: string | null;
  dataProposta: string;
  dataValidade: string;
  dataInicio: string;
  dataFim: string;
  prazoEntrega: string;
  prazoGarantia: string;
  observacoes: string;
  observacoesInternas: string;
  custoExtraOS: string;
  campos_adicionais: Record<string, string | number | null>;
}

export interface PropostaImpostos {
  percentualIss: string;
  percentualIcms: string;
  percentualPis: string;
  percentualCofins: string;
  percentualIrpjCsllRetido: string;
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
export type PropostaMode = 'create' | 'edit' | 'view' | 'copy';
export type PropostaTipo = 'proposta' | 'venda' | 'os';

// ==================== ESTADOS E SUGESTÕES ====================

export interface ItemSugestoesState {
  [key: string]: CatalogoItem[];
}

export interface MostrarSugestoesState {
  [key: string]: boolean;
}
