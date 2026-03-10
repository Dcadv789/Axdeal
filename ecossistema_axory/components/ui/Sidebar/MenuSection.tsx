import { MenuItem as MenuItemType } from '@/types';
import MenuItem from './MenuItem';

interface MenuSectionProps {
  title: string;
  items: MenuItemType[];
  activePage: string;
  isCollapsed: boolean;
  onNavigate: (page: string) => void;
  onItemClick?: (id: string) => void;
}

export default function MenuSection({ title, items, activePage, isCollapsed, onNavigate, onItemClick }: MenuSectionProps) {
  return (
    <div className={`${isCollapsed ? 'px-3 pt-1' : 'px-3 pt-1'} flex flex-col`}>
      <div className={`${isCollapsed ? 'opacity-0 h-0 mb-0' : 'opacity-100 h-auto'} text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider px-3 transition-all duration-300 overflow-hidden`}>
        {title}
      </div>
      <nav className="space-y-1">
        {items.map((item) => (
          <MenuItem
            key={item.id}
            id={item.id}
            label={item.label}
            icon={item.icon}
            isActive={activePage === item.id}
            isCollapsed={isCollapsed}
            onClick={() => onItemClick ? onItemClick(item.id) : onNavigate(item.id)}
          />
        ))}
      </nav>
    </div>
  );
}
