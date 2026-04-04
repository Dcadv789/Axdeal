import { Plus } from 'lucide-react';
import { useRef, useEffect } from 'react';
import CreateNewMenu from '../CreateNewMenu';

interface CreateButtonProps {
  isCollapsed: boolean;
  isMenuOpen: boolean;
  onToggleMenu: (isOpen: boolean) => void;
}

export default function CreateButton({ isCollapsed, isMenuOpen, onToggleMenu }: CreateButtonProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onToggleMenu(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen, onToggleMenu]);

  return (
    <div className="w-full relative" ref={menuRef}>
      <button
        onClick={() => onToggleMenu(!isMenuOpen)}
        className={`w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center font-medium transition-colors duration-200 shadow-sm ${
          isCollapsed ? 'h-11 px-4 justify-center' : 'h-11 px-6 gap-2 justify-center'
        }`}
      >
        <Plus className="w-4 h-4" />
        {!isCollapsed && <span className="text-xs">Novo</span>}
      </button>
      <CreateNewMenu isOpen={isMenuOpen} onClose={() => onToggleMenu(false)} isCollapsed={isCollapsed} />
    </div>
  );
}
