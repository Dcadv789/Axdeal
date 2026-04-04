export type CadastrosTab = 'contatos' | 'produtos' | 'servicos';

export const CADASTROS_TAB_ROUTES: Record<CadastrosTab, string> = {
  contatos: '/erp/cadastros/contatos',
  produtos: '/erp/cadastros/produtos',
  servicos: '/erp/cadastros/servicos',
};

export const CADASTROS_TAB_LABELS: Record<CadastrosTab, string> = {
  contatos: 'Contatos',
  produtos: 'Produtos',
  servicos: 'Serviços',
};
