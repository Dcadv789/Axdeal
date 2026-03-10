import { ReactNode } from 'react';

interface PageTitleProps {
  icon: ReactNode;
  title: string;
  rightContent?: ReactNode;
}

export default function PageTitle({ icon, title, rightContent }: PageTitleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {icon}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
      </div>
      {rightContent && <div className="flex items-center shrink-0">{rightContent}</div>}
    </div>
  );
}
