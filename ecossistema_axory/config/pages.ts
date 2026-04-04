import { PageConfig, PageType } from '../types';

export const PAGE_CONFIG: Record<PageType, PageConfig> = {
  negocios: {
    title: 'Negócios',
    breadcrumbs: [
      { label: 'Início', href: '/erp/dashboard' },
      { label: 'Negócios' },
    ],
  },
  dashboard: {
    title: 'Início',
    breadcrumbs: [
      { label: 'Início', href: '/erp/dashboard' },
    ],
  },
  financeiro: {
    title: 'Financeiro',
    breadcrumbs: [
      { label: 'Início', href: '/erp/dashboard' },
      { label: 'Financeiro' },
    ],
  },
  resultados: {
    title: 'Resultados',
    breadcrumbs: [
      { label: 'Início', href: '/erp/dashboard' },
      { label: 'Resultados' },
    ],
  },
  clientes: {
    title: 'Clientes',
    breadcrumbs: [
      { label: 'Início', href: '/erp/dashboard' },
      { label: 'Clientes' },
    ],
  },
  configuracoes: {
    title: 'Configurações',
    breadcrumbs: [
      { label: 'Início', href: '/erp/dashboard' },
      { label: 'Configurações' },
    ],
  },
  suporte: {
    title: 'Central de Suporte',
    breadcrumbs: [
      { label: 'Início', href: '/erp/dashboard' },
      { label: 'Central de Suporte' },
    ],
  },
};
