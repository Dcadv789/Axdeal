'use client';

import BreadcrumbBar from '@/components/ui/BreadcrumbBar';
import TopBarProfile from '@/components/ui/TopBarProfile';

interface TopBarProps {
  breadcrumbs: { label: string; href?: string }[];
  onBreadcrumbClick?: (label: string, href: string | undefined, index: number) => boolean | void;
}

export default function TopBar({ breadcrumbs, onBreadcrumbClick }: TopBarProps) {
  return (
    <div className="sticky top-0 z-20 bg-white dark:bg-black border-b border-[#E5E7EB] dark:border-[#262626] px-4 md:px-8 lg:px-12 h-[68px] min-h-[68px] flex-shrink-0 flex items-center justify-between gap-4">
      <BreadcrumbBar breadcrumbs={breadcrumbs} onBreadcrumbClick={onBreadcrumbClick} />
      <TopBarProfile />
    </div>
  );
}
