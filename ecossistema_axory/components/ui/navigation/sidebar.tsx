'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  Briefcase,
  DollarSign,
  BarChart3,
  Users,
  Settings,
  Moon,
  HelpCircle,
  ClipboardList,
  LayoutDashboard,
  Target,
  Filter,
  Building2,
  ChevronDown,
  PanelLeftClose,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useCompany } from '@/lib/context/company-context';
import SidebarLogo from '@/components/ui/Sidebar/SidebarLogo';
import FooterCopyright from '@/components/ui/FooterCopyright';
import { PageType, ConfigTab } from '@/types';

export interface ModulePermissions {
  erp: boolean;
  crm: boolean;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
  path?: string;
}

interface SidebarSection {
  key: string;
  title: string;
  items: SidebarItem[];
  visible: boolean;
}

interface DynamicSidebarProps {
  activePage: PageType | string;
  onNavigate: (page: PageType) => void;
  onNavigateWithTab?: (page: PageType, tab?: ConfigTab) => void;
  permissions: ModulePermissions;
}

const ERP_ITEMS: SidebarItem[] = [
  { id: 'erp_dashboard', label: 'Início', icon: Home, path: '/erp/dashboard' },
  { id: 'erp_negocios', label: 'Negócios', icon: Briefcase, path: '/erp/negocios' },
  { id: 'erp_financeiro', label: 'Financeiro', icon: DollarSign, path: '/erp/financeiro' },
  { id: 'erp_resultados', label: 'Resultados', icon: BarChart3, path: '/erp/resultados' },
  { id: 'erp_contatos', label: 'Cadastros', icon: Users, path: '/erp/cadastros/contatos' },
  { id: 'erp_configuracoes', label: 'Configurações', icon: Settings, path: '/erp/configuracoes' },
];

const CRM_ITEMS: SidebarItem[] = [
  { id: 'crm_dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/crm/dashboard' },
  { id: 'crm_leads', label: 'Leads', icon: Target, path: '/crm/leads' },
  { id: 'crm_quiz', label: 'Quiz Interativo', icon: ClipboardList, path: '/crm/quiz' },
  { id: 'crm_configuracoes', label: 'Configurações CRM', icon: Filter, path: '/crm/configuracoes' },
];

const SYSTEM_ITEMS: SidebarItem[] = [
  { id: 'config', label: 'Configurações', icon: Settings, path: '/sys/configuracao' },
  { id: 'support', label: 'Suporte', icon: HelpCircle, path: '/erp/suporte' },
  { id: 'dark', label: 'Modo Escuro', icon: Moon },
];

function CompanySelector() {
  const { companies, companyId, companyName, setActiveCompany, loadingCompanies } = useCompany();
  const [open, setOpen] = useState(false);

  if (loadingCompanies) {
    return (
      <div className="mx-3 mb-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <p className="text-xs text-amber-700 dark:text-amber-400">Carregando empresas...</p>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-3 relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Building2 size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span className="text-xs font-medium text-amber-800 dark:text-amber-300 truncate">
            {companyName ?? 'Selecionar empresa'}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-amber-600 dark:text-amber-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-neutral-900 border border-[#E5E7EB] dark:border-[#262626] rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveCompany(c.id);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors ${
                c.id === companyId
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {c.nome_razao_social}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionBlock({
  title,
  items,
  activePage,
  pathname,
  isCollapsed,
  onItemClick,
  sectionKey,
  showCollapsedToggle,
  onToggleCollapse,
  showExpandedCollapseControl,
  onExpandedCollapse,
}: {
  title: string;
  items: SidebarItem[];
  activePage: string;
  pathname?: string | null;
  isCollapsed: boolean;
  onItemClick: (sectionKey: string, id: string, path?: string) => void;
  sectionKey: string;
  showCollapsedToggle?: boolean;
  onToggleCollapse?: () => void;
  showExpandedCollapseControl?: boolean;
  onExpandedCollapse?: () => void;
}) {
  const hasCollapsedToggle = isCollapsed && showCollapsedToggle && onToggleCollapse;
  const sectionOffsetClass = sectionKey === 'erp' || sectionKey === 'crm' ? 'pt-[14px]' : '';
  const expandedTitleSlotClass =
    sectionKey === 'crm' ? 'h-[30px] mb-1' : sectionKey === 'erp' ? 'h-[54px] mb-1' : 'h-[60px] mb-3';
  const titleSlotClass = expandedTitleSlotClass;
  const expandedTitleTopClass =
    sectionKey === 'erp' ? 'top-[30px]' : sectionKey === 'crm' ? 'top-[8px]' : 'top-[34px]';
  const titlePositionClass = expandedTitleTopClass;

  return (
    <div className={`px-3 flex flex-col ${sectionOffsetClass}`}>
      <div className={`relative overflow-hidden ${titleSlotClass}`}>
        {hasCollapsedToggle && (
          <button
            onClick={onToggleCollapse}
            className="absolute left-1/2 top-[2px] z-10 inline-flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors duration-200 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-300 dark:hover:bg-neutral-800"
            title="Expandir menu"
          >
            <PanelLeftClose size={20} className="rotate-180" />
          </button>
        )}
        {!isCollapsed && showExpandedCollapseControl && onExpandedCollapse && (
          <button
            type="button"
            onClick={onExpandedCollapse}
            className="absolute right-0 top-[2px] inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors duration-200 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-300 dark:hover:bg-neutral-800"
            title="Recolher menu"
            aria-label="Recolher menu lateral principal"
          >
            <PanelLeftClose size={20} />
          </button>
        )}
        <span
          className={`pointer-events-none absolute left-0 right-0 h-4 leading-4 pl-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap transition-opacity duration-200 ${titlePositionClass} ${
            isCollapsed ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {title}
        </span>
      </div>
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isLeadsAlias = item.path === '/crm/leads' && Boolean(pathname && pathname.startsWith('/leads/'));
          const isActive = item.path && pathname
            ? pathname === item.path || pathname.startsWith(item.path + '/') || isLeadsAlias
            : activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onItemClick(sectionKey, item.id, item.path)}
              className={`relative w-full overflow-hidden rounded-lg px-3 py-2.5 text-left font-medium transition-colors duration-200 ${
                isActive
                  ? 'text-white bg-blue-600 dark:bg-blue-600'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="relative flex h-6 items-center justify-start">
                <Icon
                  size={22}
                  className={`shrink-0 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}
                />
                <span
                  className={`pointer-events-none absolute left-8 overflow-hidden whitespace-nowrap text-xs transition-[max-width,opacity] duration-200 ease-out ${
                    isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[140px] opacity-100'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default function DynamicSidebar({
  activePage,
  onNavigate,
  onNavigateWithTab,
  permissions,
}: DynamicSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();
  const { isSuperAdmin } = useCompany();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const podeNavegar = (path: string): boolean => {
    if (typeof window === 'undefined') return true;
    const guard = (window as Window & { __AXORY_NAV_GUARD__?: (nextPath: string) => boolean }).__AXORY_NAV_GUARD__;
    if (typeof guard !== 'function') return true;
    return guard(path);
  };

  const sections: SidebarSection[] = [
    {
      key: 'erp',
      title: 'ERP',
      items: ERP_ITEMS,
      visible: permissions.erp,
    },
    {
      key: 'crm',
      title: 'Marketing (CRM)',
      items: CRM_ITEMS,
      visible: permissions.crm,
    },
  ];

  const handleItemClick = (sectionKey: string, id: string, path?: string) => {
    if ((sectionKey === 'crm' || sectionKey === 'erp') && path) {
      if (!podeNavegar(path)) return;
      router.push(path);
      return;
    }
    onNavigate(id as PageType);
  };

  const handleSystemItemClick = (id: string, path?: string) => {
    if (id === 'dark') {
      toggleTheme();
    } else if (path) {
      if (!podeNavegar(path)) return;
      router.push(path);
    }
  };

  const getSystemActivePage = () => {
    if (activePage === 'configuracoes') return 'config';
    if (activePage === 'suporte') return 'support';
    return activePage;
  };

  return (
    <div
      className={`${
        isCollapsed ? 'w-[70px]' : 'w-64'
      } bg-white dark:bg-black border-r border-[#E5E7EB] dark:border-[#262626] flex flex-col h-screen overflow-x-hidden transition-all duration-300 relative z-10`}
    >
      <SidebarLogo
        isCollapsed={isCollapsed}
        isDark={isDark}
        onToggleCollapse={undefined}
      />

      {isSuperAdmin && (isCollapsed ? <div className="mx-3 mb-3 h-10" /> : <CompanySelector />)}

      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4">
        {sections
          .filter((s) => s.visible)
          .map((section) => (
            <SectionBlock
              key={section.key}
              sectionKey={section.key}
              title={section.title}
              items={section.items}
              activePage={activePage}
              pathname={pathname}
              isCollapsed={isCollapsed}
              onItemClick={handleItemClick}
              showCollapsedToggle={section.key === 'erp'}
              onToggleCollapse={() => setIsCollapsed(false)}
              showExpandedCollapseControl={section.key === 'erp'}
              onExpandedCollapse={() => setIsCollapsed(true)}
            />
          ))}
      </div>

      <div className="flex flex-col pb-4">
        <SectionBlock
          sectionKey="system"
          title="Sistema"
          items={SYSTEM_ITEMS}
          activePage={getSystemActivePage()}
          pathname={pathname}
          isCollapsed={isCollapsed}
          onItemClick={(_, id, path) => handleSystemItemClick(id, path)}
        />
      </div>

      <div className="px-3 mt-auto">
        <div className="h-px w-full bg-gray-200/90 dark:bg-neutral-800/90" />
      </div>
      <div className="pt-4 px-3 pb-4">
        <FooterCopyright variant={isCollapsed ? 'sidebarCollapsed' : 'sidebar'} />
      </div>
    </div>
  );
}
