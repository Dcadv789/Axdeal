import { Search } from 'lucide-react';
import type { KeyboardEvent } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar...',
  className,
  onKeyDown,
}: SearchBarProps) {
  return (
    <div className={`relative ${className || ''}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="w-full pl-10 pr-4 py-2.5 border border-blue-200 dark:border-blue-500/35 rounded-lg focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm"
      />
    </div>
  );
}
