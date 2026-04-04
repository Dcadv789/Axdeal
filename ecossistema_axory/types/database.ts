// ============================
// SISTEMA (sis_)
// ============================

export interface Empresa {
  id: string;
  tipo_pessoa: 'PF' | 'PJ';
  nome_razao_social: string;
  nome_fantasia: string | null;
  cpf: string | null;
  cnpj: string | null;
  inscricao_estadual: string | null;
  isento_ie: boolean | null;
  cep: string | null;
  endereco_logradouro: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
  endereco_uf: string | null;
  email_suporte: string | null;
  telefone_suporte: string | null;
  site_url: string | null;
  url_logo: string | null;
  plano_atual: string | null;
  status_conta: string | null;
  criado_em: string | null;
  id_dono: string | null;
}

export interface Configuracao {
  id: string;
  id_empresa: string;
  prefixo_proposta: string | null;
  prefixo_venda: string | null;
  prefixo_fatura: string | null;
  prefixo_produto: string | null;
  prefixo_servico: string | null;
  proximo_numero_proposta: number | null;
  proximo_numero_venda: number | null;
  proximo_numero_fatura: number | null;
  proximo_numero_produto: number | null;
  proximo_numero_servico: number | null;
  juros_mensal_padrao: number | null;
  multa_atraso_padrao: number | null;
  prazo_garantia_padrao_dias: number | null;
  prazo_garantia_padrao_tipo: string | null;
  prazo_entrega_padrao_dias: number | null;
  prazo_entrega_padrao_tipo: string | null;
  validade_proposta_dias: number | null;
  validade_proposta_tipo: string | null;
  obs_padrao_proposta: string | null;
  obs_padrao_venda: string | null;
  obs_padrao_fatura: string | null;
  instrucoes_padrao_pagamento: string | null;
  enviar_email_venda: boolean | null;
  gerar_nf_automatica: boolean | null;
  chave_pix_padrao: string | null;
  tipo_chave_pix: string | null;
  banco_nome: string | null;
  id_termo_garantia_padrao: string | null;
  id_instrucoes_pagamento_padrao: string | null;
  id_obs_proposta_padrao: string | null;
  id_nota_rodape_padrao: string | null;
  email_resposta_padrao: string | null;
  cor_primaria_sistema: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
}

export interface ReguaCobranca {
  id: string;
  id_empresa: string;
  criado_por: string | null;
  nome: string;
  descricao: string | null;
  ativa: boolean;
  padrao: boolean;
  etapas: any;
  criado_em: string | null;
  atualizado_em: string | null;
}

// ============================
// ERP (erp_)
// ============================

export interface OrdemServico {
  id: string;
  id_empresa: string;
  id_usuario: string | null;
  id_cliente: string | null;
  id_departamento?: string | null;
  id_projeto?: string | null;
  codigo: string;
  status: string;
  valor_total: number;
  data_emissao: string;
  descricao: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
}

export interface Contrato {
  id: string;
  id_empresa: string;
  id_usuario: string | null;
  id_cliente: string | null;
  id_regua_cobranca?: string | null;
  valor_recorrente: number;
  dia_vencimento: number;
  data_inicio: string;
  proximo_faturamento: string | null;
  data_proximo_reajuste?: string | null;
  indice_reajuste?: 'IGP-M' | 'IPCA' | 'Fixo (%)' | null;
  percentual_reajuste_fixo?: number | null;
  status: 'ativo' | 'cancelado';
  criado_em: string | null;
  atualizado_em: string | null;
}

export interface Parcela {
  id: string;
  id_empresa: string;
  id_pedido_venda?: string | null;
  id_proposta?: string | null;
  id_os?: string | null;
  id_departamento?: string | null;
  id_projeto?: string | null;
  id_contrato?: string | null;
  id_despesa?: string | null;
  id_conta_bancaria?: string | null;
  id_categoria?: string | null;
  numero_parcela: number;
  descricao_parcela: string | null;
  valor_original: number;
  valor_acrescimos: number | null;
  valor_desconto: number | null;
  valor_quitado_total: number | null;
  saldo_devedor: number | null;
  data_vencimento: string;
  data_quitacao_total: string | null;
  status: string | null;
  id_externo_gateway: string | null;
  link_pagamento: string | null;
  linha_digitavel: string | null;
  observacoes: string | null;
  criado_em: string | null;
  boleto_url: string | null;
  boleto_linha_digitavel: string | null;
  link_pagamento_cartao: string | null;
}

/**
 * Item de proposta (erp_itens_proposta).
 * Usado para itens vinculados a propostas comerciais.
 * Itens de venda/OS ficam em erp_itens_movimentacao.
 */
export interface ErpItemProposta {
  id: string;
  id_empresa: string;
  id_proposta: string;
  id_item_catalogo?: string | null;
  tipo_item: 'PRODUTO' | 'SERVICO';
  descricao_item: string;
  quantidade: number;
  preco_unitario: number;
  desconto_item: number;
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export interface Extrato {
  id: string;
  id_empresa: string;
  id_conta_bancaria: string;
  id_parcela: string | null;
  id_categoria: string | null;
  id_usuario: string;
  descricao: string | null;
  valor: number;
  data_pagamento: string;
  tipo_movimentacao: 'entrada' | 'saida';
  conciliado: boolean;
  criado_em: string | null;
  atualizado_em: string | null;
}

// ============================
// CRM (crm_)
// ============================

export type TipoQuestao = 'multipla_escolha' | 'multipla_selecao' | 'contato' | 'resultado' | 'informativo';

export type TemaModoQuiz = 'light' | 'dark';

export interface Quiz {
  id: string;
  id_empresa: string;
  id_pipeline?: string | null;
  titulo: string;
  slug: string;
  ativo: boolean;
  cor_primaria?: string | null;
  url_logo?: string | null;
  tema_modo?: TemaModoQuiz | null;
  tamanho_logo?: number | null;
  rotas_nomes?: Record<string, string> | null;
  score_max?: number | null;
  passos_totais?: number | null;
  criado_em: string | null;
}

export interface QuizResultado {
  id: string;
  id_quiz: string;
  nivel: 1 | 2 | 3 | 4;
  titulo: string | null;
  texto: string | null;
  botao_texto: string | null;
  botao_url: string | null;
}

export type CampoContato = 'nome' | 'email' | 'whatsapp' | 'empresa';

export interface Questao {
  id: string;
  id_quiz: string;
  titulo: string;
  subtitulo: string | null;
  tipo_questao: TipoQuestao;
  ordem: number;
  is_inicial: boolean;
  texto_disclaimer?: string | null;
  campos_contato?: CampoContato[] | null;
  id_proxima_questao_contato?: string | null;
  contato_finaliza?: boolean | null;
  id_proxima_questao_selecao?: string | null;
  criado_em: string | null;
}

export interface Opcao {
  id: string;
  id_questao: string;
  texto: string;
  valor_score: number;
  id_proxima_questao: string | null;
  rotulo: string | null;
  criado_em: string | null;
}

export interface LeadQuiz {
  id: string;
  id_quiz: string;
  nome: string;
  email: string | null;
  whatsapp: string | null;
  score_total: number;
  respostas_log?: RespostaLog[] | null;
  criado_em: string | null;
}

export interface QuizResposta {
  id: string;
  id_lead: string;
  id_pergunta: string;
  pergunta_texto: string;
  resposta_texto: string;
  opcoes_snapshot: Record<string, unknown>[] | null;
  valor_score: number;
}

export interface CrmPipeline {
  id: string;
  id_empresa: string;
  id_playbook?: string | null;
  valor_estimado_padrao?: number | null;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  criado_em: string | null;
  atualizado_em: string | null;
}

export interface CrmPlaybook {
  id: string;
  id_empresa: string;
  nome: string;
  descricao: string | null;
  configuracao: Record<string, unknown> | null;
  ativo: boolean;
  criado_em: string | null;
  atualizado_em: string | null;
}

export type CrmCustomFieldType = 'text' | 'number' | 'date' | 'select';

export interface CrmCustomFieldDefinition {
  id: string;
  id_empresa: string;
  chave: string;
  nome: string;
  tipo: CrmCustomFieldType;
  opcoes: string[] | null;
  ordem: number;
  ativo: boolean;
  criado_em: string | null;
  atualizado_em: string | null;
}

export interface CrmPipelineEtapa {
  id: string;
  id_pipeline: string;
  nome: string;
  ordem: number;
  cor: string | null;
  playbook_json?: Record<string, unknown> | null;
  checklist_json?: string[] | null;
  templates_whatsapp_json?: Record<string, unknown> | null;
  ativo: boolean;
  criado_em: string | null;
}

export interface CrmConfiguracaoEstrategica {
  id: string;
  id_empresa: string;
  playbook_json: Record<string, unknown> | null;
  criado_em: string | null;
  atualizado_em: string | null;
}

export interface CrmPipelineLead {
  id: string;
  id_pipeline: string;
  id_etapa: string | null;
  id_lead: string;
  criado_em: string | null;
  atualizado_em: string | null;
}

export interface RespostaLog {
  id_questao: string;
  id_opcao: string;
  valor_score: number;
}

export interface Lead {
  id: string;
  id_empresa: string;
  id_quiz?: string | null;
  id_responsavel?: string | null;
  nome: string;
  email: string | null;
  whatsapp: string | null;
  empresa_prospect?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  utm_id?: string | null;
  telefone: string | null;
  score_qualificacao: number;
  valor_estimado_contrato?: number | null;
  origem: string;
  status_conversao: string;
  status_negocio?: 'aberto' | 'ganho' | 'perdido' | null;
  data_fechamento?: string | null;
  motivo_perda?: string | null;
  tags: string[] | null;
  dados_extras: Record<string, any> | null;
  observacoes: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
}
