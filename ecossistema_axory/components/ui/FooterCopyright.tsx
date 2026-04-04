interface FooterCopyrightProps {
  className?: string;
  /** Tamanho do texto: 'sidebar' (compacto), 'sidebarCollapsed', ou 'default' */
  variant?: 'sidebar' | 'sidebarCollapsed' | 'default';
}

export default function FooterCopyright({ className = '', variant = 'default' }: FooterCopyrightProps) {
  const year = new Date().getFullYear();
  const isSidebar = variant === 'sidebar' || variant === 'sidebarCollapsed';

  if (isSidebar) {
    return (
      <div className={`relative h-4 overflow-hidden ${className}`}>
        <p
          className={`absolute inset-0 text-[10px] px-2 text-center text-gray-500 dark:text-gray-400 whitespace-nowrap transition-opacity duration-200 ${
            variant === 'sidebar' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          &copy; {year} Axory Capital Group
        </p>
        <p
          className={`absolute inset-0 text-[9px] px-1 leading-tight text-center text-gray-500 dark:text-gray-400 whitespace-nowrap transition-opacity duration-200 ${
            variant === 'sidebarCollapsed' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          &copy; Axory
        </p>
      </div>
    );
  }

  return (
    <p className={`text-xs text-center text-gray-500 dark:text-gray-400 ${className}`}>
      &copy; {year} Axory Capital Group
    </p>
  );
}
