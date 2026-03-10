import { LogOut, User } from 'lucide-react';
import { PageType, ConfigTab } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onNavigate: (page: PageType) => void;
  onNavigateWithTab?: (page: PageType, tab?: ConfigTab) => void;
  anchorPosition?: { top: number; left: number } | null;
}

const PROFILE_MENU_ITEMS = [
  { id: 'profile', label: 'Meu Perfil', icon: User },
  { id: 'logout', label: 'Sair', icon: LogOut },
];

export default function ProfileMenu({ isOpen, onClose, isCollapsed, onNavigate, onNavigateWithTab, anchorPosition }: ProfileMenuProps) {
  const { signOut } = useAuth();

  if (!isOpen || isCollapsed || !anchorPosition) return null;

  const handleItemClick = async (itemId: string) => {
    if (itemId === 'profile') {
      if (onNavigateWithTab) {
        onNavigateWithTab('configuracoes', 'perfil');
      } else {
        onNavigate('configuracoes');
      }
    } else if (itemId === 'logout') {
      await signOut();
    }
    onClose();
  };

  const style = anchorPosition
    ? { top: anchorPosition.top, left: anchorPosition.left }
    : undefined;

  return (
    <div
      id="profile-menu-portal"
      className="fixed w-56 bg-white dark:bg-black rounded-lg shadow-xl border border-[#E5E7EB] dark:border-[#262626] z-[99999]"
      style={style}
    >
      <div className="px-4 py-3 border-b border-[#E5E7EB] dark:border-[#262626]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Perfil</h3>
      </div>
      <nav className="p-2 space-y-1">
        {PROFILE_MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isLast = item.id === 'logout';
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isLast
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon size={18} className={`flex-shrink-0 ${isLast ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
