'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  Briefcase,
  DollarSign,
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
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useCompany } from '@/lib/context/company-context';
import SidebarLogo from '@/components/ui/Sidebar/SidebarLogo';
import CreateButton from '@/components/ui/Sidebar/CreateButton';
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
  { id: 'erp_clientes', label: 'Clientes', icon: Users, path: '/erp/clientes' },
];

const CRM_ITEMS: SidebarItem[] = [
  { id: 'crm_dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/crm/dashboard' },
  { id: 'crm_leads', label: 'Leads', icon: Target, path: '/crm/leads' },
  { id: 'crm_quiz', label: 'Quiz Interativo', icon: ClipboardList, path: '/crm/quiz' },
  { id: 'crm_configuracoes', label: 'Configurações CRM', icon: Filter, path: '/crm/configuracoes' },
];

const SYSTEM_ITEMS: SidebarItem[] = [
  { id: 'config', label: 'Configurações', icon: Settings, path: '/erp/configuracoes' },
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
          <Building2 size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span className="text-xs font-medium text-amber-800 dark:text-amber-300 truncate">
            {companyName ?? 'Selecionar empresa'}
          </span>
        </div>
        <ChevronDown
          size={14}
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
}: {
  title: string;
  items: SidebarItem[];
  activePage: string;
  pathname?: string | null;
  isCollapsed: boolean;
  onItemClick: (sectionKey: string, id: string, path?: string) => void;
  sectionKey: string;
}) {
  return (
    <div className="px-3 pt-1 flex flex-col">
      <div
        className={`${
          isCollapsed ? 'opacity-0 h-0 mb-0' : 'opacity-100 h-auto'
        } text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider px-3 transition-all duration-300 overflow-hidden`}
      >
        {title}
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
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center' : 'gap-3'
              } px-3 py-2.5 rounded-lg font-medium transition-colors duration-200 ${
                isActive
                  ? 'text-white bg-blue-600 dark:bg-blue-600'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                size={20}
                className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}
              />
              <span
                className={`${
                  isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'
                } text-xs whitespace-nowrap transition-all duration-300`}
              >
                {item.label}
              </span>
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
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  const sections: SidebarSection[] = [
    {
      key: 'erp',
      title: 'Financeiro (ERP)',
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
      router.push(path);
      return;
    }
    onNavigate(id as PageType);
  };

  const handleSystemItemClick = (id: string, path?: string) => {
    if (id === 'dark') {
      toggleTheme();
    } else if (path) {
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
        isCollapsed ? 'w-[88px]' : 'w-64'
      } bg-white dark:bg-black border-r border-[#E5E7EB] dark:border-[#262626] flex flex-col h-screen transition-all duration-300 relative z-10`}
    >
      <SidebarLogo
        isCollapsed={isCollapsed}
        isDark={isDark}
        onToggleCollapse={!isCollapsed ? () => setIsCollapsed(!isCollapsed) : undefined}
      />

      {/* Collapse toggle - quando colapsado: sozinho e centralizado */}
      {isCollapsed && (
        <div className="px-3 py-2 flex justify-center">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            title="Expandir menu"
          >
            <PanelLeft size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      )}

      {/* Botão Novo - largura total quando expandido, mais margem em cima */}
      <div className={`${isCollapsed ? 'p-2 pb-4' : 'px-3 pt-4 pb-4'}`}>
        <CreateButton
          isCollapsed={isCollapsed}
          isMenuOpen={isCreateMenuOpen}
          onToggleMenu={setIsCreateMenuOpen}
        />
      </div>

      {/* Super Admin company selector */}
      {isSuperAdmin && !isCollapsed && <CompanySelector />}

      {/* Module sections - Financeiro e Marketing */}
      <div className="flex-1 overflow-y-auto space-y-4">
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
            />
          ))}
      </div>

      {/* System section - pb-4 para espaçamento igual ao dos botões de navegação */}
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

      <div className="pt-4 px-3 pb-4 mt-auto">
        <FooterCopyright variant={isCollapsed ? 'sidebarCollapsed' : 'sidebar'} />
      </div>
    </div>
  );
}
