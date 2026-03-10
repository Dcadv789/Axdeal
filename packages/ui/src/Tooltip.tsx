import { ReactNode, useState } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute z-50 w-64 px-3 py-2 text-xs text-white bg-gray-900 dark:bg-gray-800 rounded-lg shadow-lg left-full ml-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45" />
          {content}
        </div>
      )}
    </div>
  );
}
