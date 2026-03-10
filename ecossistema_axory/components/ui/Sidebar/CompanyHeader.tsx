import { Briefcase, PanelLeftOpen, PanelLeftClose } from 'lucide-react';

interface CompanyHeaderProps {
  isCollapsed: boolean;
  onToggle: () => void;
  companyName: string;
}

export default function CompanyHeader({ isCollapsed, onToggle, companyName }: CompanyHeaderProps) {
  return (
    <div className={`${isCollapsed ? 'p-2 mt-6 pb-4' : 'px-4 py-8 pb-4'} flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
      {!isCollapsed && (
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <Briefcase size={20} className="text-gray-600 dark:text-gray-400 flex-shrink-0" />
          <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate uppercase">{companyName}</span>
        </div>
      )}
      <button
        onClick={onToggle}
        className="flex-shrink-0 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200"
        title={isCollapsed ? 'Expandir' : 'Colapsar'}
      >
        {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
      </button>
    </div>
  );
}
