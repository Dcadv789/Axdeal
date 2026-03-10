'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbBarProps {
  breadcrumbs: { label: string; href?: string }[];
  onBreadcrumbClick?: (label: string, href: string | undefined, index: number) => boolean | void;
}

export default function BreadcrumbBar({ breadcrumbs, onBreadcrumbClick }: BreadcrumbBarProps) {
  const router = useRouter();

  const handleClick = (crumb: { label: string; href?: string }, index: number) => {
    const preventDefault = onBreadcrumbClick?.(crumb.label, crumb.href, index);
    if (preventDefault === false) return;
    if (crumb.href) {
      router.push(crumb.href);
    }
  };

  const isHome = (crumb: { label: string }) => crumb.label.toLowerCase() === 'início';

  return (
    <nav className="flex items-center gap-2 text-sm min-w-0">
      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && (
            <ChevronRight size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
          )}
          <button
            type="button"
            onClick={() => handleClick(crumb, index)}
            className={`flex items-center gap-1.5 cursor-pointer transition-colors ${
              index === breadcrumbs.length - 1
                ? 'text-gray-900 dark:text-gray-100 font-medium'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {index === 0 && isHome(crumb) ? (
              <Home size={16} className="flex-shrink-0" aria-label="Início" />
            ) : (
              crumb.label
            )}
          </button>
        </div>
      ))}
    </nav>
  );
}
