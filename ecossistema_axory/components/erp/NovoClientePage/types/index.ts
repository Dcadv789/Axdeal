export interface NovoClientePageProps {
  onBack: () => void;
  mode: 'create' | 'edit' | 'view';
  clienteId: string | null;
}

export interface ClienteFormData {
  nome: string;
  email: string;
  telefone: string;
  cpf_cnpj: string;
  tipo_pessoa: 'PF' | 'PJ';
  nome_fantasia?: string;
  inscricao_estadual?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  observacoes?: string;
  [key: string]: any;
}
