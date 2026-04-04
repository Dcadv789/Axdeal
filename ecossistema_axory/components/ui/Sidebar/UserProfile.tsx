import { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { COMPANY_INFO } from '@/config/company';
import ProfileMenu from '../ProfileMenu';
import { PageType, ConfigTab } from '@/types';

interface UserProfileProps {
  isCollapsed: boolean;
  isMenuOpen: boolean;
  onToggleMenu: (isOpen: boolean) => void;
  onNavigate: (page: PageType) => void;
  onNavigateWithTab?: (page: PageType, tab?: ConfigTab) => void;
}

export default function UserProfile({ isCollapsed, isMenuOpen, onToggleMenu, onNavigate, onNavigateWithTab }: UserProfileProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const portalId = 'sidebar-profile-menu-portal';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inButton = menuRef.current?.contains(target);
      const inMenu = document.getElementById(portalId)?.contains(target);
      if (!inButton && !inMenu) {
        onToggleMenu(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen, onToggleMenu]);

  useLayoutEffect(() => {
    if (isMenuOpen && buttonRef.current && typeof document !== 'undefined') {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({ top: rect.top, left: rect.right + 8 });
    } else {
      setMenuPosition(null);
    }
  }, [isMenuOpen]);

  return (
    <div className="border-t border-gray-200 dark:border-neutral-800 pt-4 px-3 pb-4 mt-auto relative" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={() => onToggleMenu(!isMenuOpen)}
        className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-200 cursor-pointer`}
      >
        <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
          <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
            {COMPANY_INFO.userInitials}
          </div>
          <span className={`${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'} text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap transition-all duration-300`}>
            {COMPANY_INFO.userName}
          </span>
        </div>
        {!isCollapsed && (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={`text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`}>
            <path d="M6 5l4 3-4 3z"/>
          </svg>
        )}
      </button>
      {typeof document !== 'undefined' && isMenuOpen && menuPosition &&
        createPortal(
          <ProfileMenu
            isOpen={isMenuOpen}
            onClose={() => onToggleMenu(false)}
            isCollapsed={isCollapsed}
            portalId={portalId}
            onNavigate={onNavigate}
            onNavigateWithTab={onNavigateWithTab}
            anchorPosition={menuPosition}
          />,
          document.body
        )}
    </div>
  );
}
