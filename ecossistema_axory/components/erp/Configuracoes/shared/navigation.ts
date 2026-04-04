import { Banknote, Building2, Plug, Workflow } from 'lucide-react';
import type { SubSidebarNavItem } from '@/components/ui/navigation/SubSidebarLayout';

export type ConfiguracoesSidebarMenuId =
  | 'bancos_contas'
  | 'estrutura_financeira'
  | 'operacoes_regras'
  | 'conexoes_externas';

export const CONFIGURACOES_MENU_ROUTES: Record<ConfiguracoesSidebarMenuId, string> = {
  bancos_contas: '/erp/configuracoes?aba=bancos_contas',
  estrutura_financeira: '/erp/configuracoes?aba=estrutura_financeira',
  operacoes_regras: '/erp/configuracoes?aba=operacoes_regras',
  conexoes_externas: '/erp/configuracoes?aba=conexoes_externas',
};

export const CONFIGURACOES_SUBSIDEBAR_ITEMS: SubSidebarNavItem<ConfiguracoesSidebarMenuId>[] = [
  {
    id: 'bancos_contas',
    label: 'Bancos e Contas',
    description: 'Contas bancarias e tesouraria',
    icon: Banknote,
  },
  {
    id: 'estrutura_financeira',
    label: 'Estrutura Financeira',
    description: 'Categorias e organizacao financeira',
    icon: Building2,
  },
  {
    id: 'operacoes_regras',
    label: 'Operacoes e Regras',
    description: 'Parametros, vendas e regras operacionais',
    icon: Workflow,
  },
  {
    id: 'conexoes_externas',
    label: 'Conexoes Externas',
    description: 'Integracoes com outros sistemas',
    icon: Plug,
  },
];
