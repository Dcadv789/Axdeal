export interface NovoClientePageProps {
  onBack: () => void;
  onSaveSuccess?: () => void;
  onSavingChange?: (saving: boolean) => void;
  mode: 'create' | 'edit' | 'view';
  clienteId: string | null;
}

export interface ClienteFormData {
  nome: string;
  nome_contato?: string;
  email: string;
  email_secundario_cc?: string;
  telefone: string;
  telefone_contato?: string;
  whatsapp?: string;
  site?: string;
  instagram?: string;
  site_instagram?: string;
  cpf_cnpj: string;
  tipo_pessoa: 'PF' | 'PJ';
  codigo_cliente?: string;
  status?: string;
  nome_fantasia?: string;
  inscricao_estadual?: string;
  isento_ie?: boolean;
  data_nascimento_fundacao?: string;
  genero?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  id_regua_cobranca?: string;
  bloqueado?: boolean;
  classificacao_risco?: string;
  limite_credito?: string;
  tipo_chave_pix?: string;
  chave_pix?: string;
  banco_nome?: string;
  segmento?: string;
  origem?: string;
  tags?: string;
  codigo_externo?: string;
  aceita_marketing?: boolean;
  observacoes_internas?: string;
  porte?: string;
  nome_socio?: string;
  qualificacao_socio?: string;
  natureza_juridica?: string;
  opcao_pelo_simples?: string;
  opcao_pelo_mei?: string;
  [key: string]: any;
}
