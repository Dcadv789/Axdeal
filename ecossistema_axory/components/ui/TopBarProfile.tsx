'use client';

import { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/lib/context/company-context';
import ProfileMenu from './ProfileMenu';

const ERP_PATHS: Record<string, string> = {
  configuracoes: '/sys/configuracao',
};

function getInitials(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

export default function TopBarProfile() {
  const router = useRouter();
  const { user, memberName } = useAuth();
  const { companyName } = useCompany();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const userName = memberName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const userInitials = getInitials(userName);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const portalId = 'topbar-profile-menu-portal';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inButton = buttonRef.current?.contains(target);
      const inMenu = document.getElementById(portalId)?.contains(target);
      if (!inButton && !inMenu) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  useLayoutEffect(() => {
    if (isMenuOpen && buttonRef.current && typeof document !== 'undefined') {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({ top: rect.bottom + 8, left: rect.right - 224 });
    } else {
      setMenuPosition(null);
    }
  }, [isMenuOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-200 cursor-pointer"
      >
        <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
          {userInitials}
        </div>
        <div className="flex flex-col items-start min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
            {userName}
          </span>
          {companyName && (
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]" title={companyName}>
              {companyName}
            </span>
          )}
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={`text-gray-500 dark:text-gray-400 flex-shrink-0 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`}>
          <path d="M6 5l4 3-4 3z" />
        </svg>
      </button>
      {typeof document !== 'undefined' && isMenuOpen && menuPosition &&
        createPortal(
          <ProfileMenu
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            isCollapsed={false}
            portalId={portalId}
            onNavigate={(page) => {
              const path = ERP_PATHS[page];
              if (path) router.push(path);
            }}
            onNavigateWithTab={(page, tab) => {
              const path = page === 'configuracoes' ? `/sys/configuracao${tab ? `?tab=${tab}` : ''}` : ERP_PATHS[page];
              if (path) router.push(path);
            }}
            anchorPosition={menuPosition}
          />,
          document.body
        )}
    </>
  );
}
