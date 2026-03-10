interface FooterCopyrightProps {
  className?: string;
  /** Tamanho do texto: 'sidebar' (compacto), 'sidebarCollapsed', ou 'default' */
  variant?: 'sidebar' | 'sidebarCollapsed' | 'default';
}

export default function FooterCopyright({ className = '', variant = 'default' }: FooterCopyrightProps) {
  const year = new Date().getFullYear();
  const textClass =
    variant === 'sidebar'
      ? 'text-[10px] px-2 text-center text-gray-500 dark:text-gray-400'
      : variant === 'sidebarCollapsed'
        ? 'text-[9px] px-1 leading-tight text-center text-gray-500 dark:text-gray-400'
        : 'text-xs text-center text-gray-500 dark:text-gray-400';

  return (
    <p className={textClass}>
      © {year} Axory Capital Group
    </p>
  );
}
