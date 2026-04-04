import { Home, Briefcase, Plus, DollarSign, Users } from 'lucide-react';
import { PageType } from '@/types';
import { CREATE_NEW_ITEMS } from '@/config/createNew';
import MobileBottomSheet from './MobileBottomSheet';
import { useState } from 'react';

interface MobileBottomNavProps {
  activePage: PageType;
  onNavigate: (page: PageType) => void;
}

export default function MobileBottomNav({ activePage, onNavigate }: MobileBottomNavProps) {
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard' as PageType, icon: Home, label: 'Início' },
    { id: 'negocios' as PageType, icon: Briefcase, label: 'Negócios' },
    { id: 'novo', icon: Plus, label: 'Novo' },
    { id: 'financeiro' as PageType, icon: DollarSign, label: 'Financeiro' },
    { id: 'clientes' as PageType, icon: Users, label: 'Cadastros' },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-[#E5E7EB] dark:border-[#262626] safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            const isNewButton = item.id === 'novo';

            if (isNewButton) {
              return (
                <button
                  key={item.id}
                  onClick={() => setIsCreateMenuOpen(true)}
                  className="flex-1 flex flex-col items-center justify-center"
                >
                  <div className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors -mt-2">
                    <Icon size={24} />
                  </div>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as PageType)}
                className="flex-1 flex flex-col items-center gap-1 py-2 transition-colors"
              >
                <Icon
                  size={22}
                  className={`transition-colors ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-500'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                />
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-500'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <MobileBottomSheet
        isOpen={isCreateMenuOpen}
        onClose={() => setIsCreateMenuOpen(false)}
        title="Criar Novo"
      >
        <nav className="border border-[#E5E7EB] dark:border-[#262626] rounded-lg overflow-hidden divide-y divide-[#E5E7EB] dark:divide-[#262626]">
          {CREATE_NEW_ITEMS.map((createItem) => {
            const CreateIcon = createItem.icon;
            return (
              <button
                key={createItem.id}
                onClick={() => {
                  console.log('Creating:', createItem.id);
                  setIsCreateMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-150"
              >
                <CreateIcon size={20} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span>{createItem.label}</span>
              </button>
            );
          })}
        </nav>
      </MobileBottomSheet>
    </>
  );
}
