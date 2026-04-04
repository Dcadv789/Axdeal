import { CREATE_NEW_ITEMS } from '@/config/createNew';

interface CreateNewMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  mode?: 'sidebar' | 'topbar';
}

export default function CreateNewMenu({ isOpen, onClose, isCollapsed, mode = 'sidebar' }: CreateNewMenuProps) {
  if (!isOpen) return null;

  const handleItemClick = (itemId: string) => {
    console.log('Creating:', itemId);
    onClose();
  };

  const positionClass = mode === 'topbar' ? 'right-0 top-full mt-2' : isCollapsed ? 'hidden' : 'left-full top-0';

  return (
    <div className={`absolute ${positionClass} w-56 bg-white dark:bg-black rounded-lg shadow-lg border border-[#E5E7EB] dark:border-[#262626] z-50`}>
      <div className="px-4 py-3 border-b border-[#E5E7EB] dark:border-[#262626]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Criar Novo</h3>
      </div>
      <nav className="p-2 space-y-1">
        {CREATE_NEW_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-150"
            >
              <Icon size={18} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
