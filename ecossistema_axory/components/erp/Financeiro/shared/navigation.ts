import { ArrowDownCircle, ArrowLeftRight, ArrowUpCircle, CheckCheck, ReceiptText, type LucideIcon } from 'lucide-react';
import type { SubSidebarNavItem } from '@/components/ui/navigation/SubSidebarLayout';

export type FinanceiroSidebarMenuId = 'receber' | 'pagar' | 'extrato' | 'conciliacao_bancaria' | 'conciliacao_pdv';

export const FINANCEIRO_MENU_ROUTES: Record<FinanceiroSidebarMenuId, string> = {
  receber: '/erp/financeiro/receber',
  pagar: '/erp/financeiro/pagar',
  extrato: '/erp/financeiro/extrato',
  conciliacao_bancaria: '/erp/financeiro/conciliacao-bancaria',
  conciliacao_pdv: '/erp/financeiro/conciliacao-pdv',
};

type FinanceiroNavConfig = {
  id: FinanceiroSidebarMenuId;
  label: string;
  description: string;
  icon: LucideIcon;
};

const FINANCEIRO_NAV_CONFIG: FinanceiroNavConfig[] = [
  {
    id: 'receber',
    label: 'Contas a Receber',
    description: 'Titulos e cobrancas de entrada',
    icon: ArrowUpCircle,
  },
  {
    id: 'pagar',
    label: 'Contas a Pagar',
    description: 'Despesas e obrigacoes de saida',
    icon: ArrowDownCircle,
  },
  {
    id: 'extrato',
    label: 'Extrato',
    description: 'Movimentacoes e conciliacoes',
    icon: ReceiptText,
  },
  {
    id: 'conciliacao_bancaria',
    label: 'Conciliacao Bancaria',
    description: 'Relacionamento entre extrato e ERP',
    icon: ArrowLeftRight,
  },
  {
    id: 'conciliacao_pdv',
    label: 'Conferencia do PDV',
    description: 'Baixa dos recebimentos da frente de caixa',
    icon: CheckCheck,
  },
];

export const FINANCEIRO_SUBSIDEBAR_ITEMS: SubSidebarNavItem<FinanceiroSidebarMenuId>[] =
  FINANCEIRO_NAV_CONFIG;

export function getFinanceiroRouteByMenuId(menu: FinanceiroSidebarMenuId) {
  return FINANCEIRO_MENU_ROUTES[menu];
}
