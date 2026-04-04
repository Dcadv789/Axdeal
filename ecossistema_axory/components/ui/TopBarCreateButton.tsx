'use client';

import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import CreateNewMenu from '@/components/ui/CreateNewMenu';

interface TopBarCreateButtonProps {
  collapsed?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export default function TopBarCreateButton({ collapsed = false, fullWidth = false, className = '' }: TopBarCreateButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', onClickOutside);
      return () => document.removeEventListener('mousedown', onClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${collapsed ? 'h-10' : 'h-10'} rounded-lg bg-[#1F7A3D] hover:bg-[#186433] text-white text-sm font-semibold transition-colors duration-200 shadow-sm inline-flex items-center ${
          fullWidth ? 'w-full' : ''
        } ${collapsed ? 'justify-center px-0' : 'gap-2 px-4 justify-start'}`}
      >
        <Plus size={16} />
        <span className={`transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>Novo</span>
      </button>
      <CreateNewMenu isOpen={isOpen} onClose={() => setIsOpen(false)} isCollapsed={false} mode="topbar" />
    </div>
  );
}
