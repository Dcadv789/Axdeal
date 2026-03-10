import { ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}

export default function MultiSelectDropdown({
  options,
  selectedValues,
  onChange,
  placeholder
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToggle = (value: string) => {
    if (value === '') {
      onChange([]);
    } else {
      if (selectedValues.includes(value)) {
        onChange(selectedValues.filter(v => v !== value));
      } else {
        onChange([...selectedValues, value]);
      }
    }
  };

  const handleToggleAll = () => {
    if (selectedValues.length === options.filter(opt => opt.value !== '').length) {
      onChange([]);
    } else {
      onChange(options.filter(opt => opt.value !== '').map(opt => opt.value));
    }
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    }
    if (selectedValues.length === options.filter(opt => opt.value !== '').length) {
      return 'Todos';
    }
    if (selectedValues.length === 1) {
      const option = options.find(opt => opt.value === selectedValues[0]);
      return option?.label || placeholder;
    }
    return `${selectedValues.length} selecionados`;
  };

  const allOptionsSelected = selectedValues.length === options.filter(opt => opt.value !== '').length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500 dark:focus:ring-blue-400 flex items-center gap-2 min-w-[180px] justify-between"
      >
        <span className="truncate">{getDisplayText()}</span>
        <ChevronDown size={16} className={`text-gray-500 dark:text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleToggleAll}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <div className={`w-4 h-4 border-2 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                allOptionsSelected
                  ? 'bg-blue-600 border-blue-600'
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {allOptionsSelected && <Check size={12} className="text-white" />}
              </div>
              <span className="font-medium">Todos</span>
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto p-2">
            {options.filter(opt => opt.value !== '').map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleToggle(option.value)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <div className={`w-4 h-4 border-2 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
