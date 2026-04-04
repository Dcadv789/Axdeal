import { ClipboardList, FileText, Monitor, ReceiptText, ShoppingCart, type LucideIcon } from 'lucide-react';
import type { SubSidebarNavItem } from '@/components/ui/navigation/SubSidebarLayout';
import type { NegociosTab } from '@/components/erp/Negocios/propostas/PropostasContent';

export type NegociosSidebarMenuId = NegociosTab | 'contratos' | 'pdv';

export const NEGOCIOS_TAB_ROUTES: Record<NegociosSidebarMenuId, string> = {
  propostas: '/erp/negocios/propostas',
  pedidos_venda: '/erp/negocios/pedidos_venda',
  ordens_servico: '/erp/negocios/ordens_servico',
  contratos: '/erp/negocios/contratos',
  pdv: '/erp/negocios/pdv',
};

export const NEGOCIOS_TAB_LABELS: Record<NegociosSidebarMenuId, string> = {
  propostas: 'Propostas',
  pedidos_venda: 'Pedidos de Vendas',
  ordens_servico: 'Ordens de Servico',
  contratos: 'Contratos',
  pdv: 'Frente de Caixa (PDV)',
};

type NegociosNavConfig = {
  id: NegociosSidebarMenuId;
  label: string;
  description: string;
  icon: LucideIcon;
};

const NEGOCIOS_NAV_CONFIG: NegociosNavConfig[] = [
  {
    id: 'propostas',
    label: 'Propostas',
    description: 'Gestao de propostas comerciais',
    icon: FileText,
  },
  {
    id: 'pedidos_venda',
    label: 'Pedidos de Venda',
    description: 'Pedidos convertidos e acompanhamento',
    icon: ShoppingCart,
  },
  {
    id: 'ordens_servico',
    label: 'Ordens de Servico',
    description: 'Execucao e status de servicos',
    icon: ClipboardList,
  },
  {
    id: 'contratos',
    label: 'Contratos',
    description: 'Contratos recorrentes e faturamento',
    icon: ReceiptText,
  },
  {
    id: 'pdv',
    label: 'Frente de Caixa (PDV)',
    description: 'Abertura do caixa e historico das ultimas vendas',
    icon: Monitor,
  },
];

export const NEGOCIOS_SUBSIDEBAR_ITEMS: SubSidebarNavItem<NegociosSidebarMenuId>[] = NEGOCIOS_NAV_CONFIG;

export function getNegociosRouteByMenuId(menu: NegociosSidebarMenuId) {
  return NEGOCIOS_TAB_ROUTES[menu];
}
