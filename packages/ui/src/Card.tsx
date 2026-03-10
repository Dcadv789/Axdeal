import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Card({ children, padding = 'md', className = '' }: CardProps) {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={`bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-[#E5E7EB] dark:border-[#262626] ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}
