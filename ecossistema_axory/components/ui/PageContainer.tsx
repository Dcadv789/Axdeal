import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export default function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`w-full px-4 md:px-8 lg:px-12 ${className}`}>
      {children}
    </div>
  );
}
