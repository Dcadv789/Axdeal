interface MenuItemProps {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}

export default function MenuItem({ id, label, icon: Icon, isActive, isCollapsed, onClick }: MenuItemProps) {
  return (
    <button
      key={id}
      onClick={onClick}
      className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg font-medium transition-colors duration-200 ${
        isActive
          ? 'text-white bg-blue-600 dark:bg-blue-600'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
      }`}
      title={isCollapsed ? label : undefined}
    >
      <Icon size={20} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
      <span className={`${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'} text-xs whitespace-nowrap transition-all duration-300`}>
        {label}
      </span>
    </button>
  );
}
