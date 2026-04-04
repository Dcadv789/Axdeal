import { ChevronDown, Check } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SingleSelectDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  buttonClassName?: string;
  menuClassName?: string;
  menuContentClassName?: string;
}

export default function SingleSelectDropdown({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  buttonClassName,
  menuClassName,
  menuContentClassName,
}: SingleSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const [menuMaxHeight, setMenuMaxHeight] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current || typeof window === 'undefined') return;

    const calcularPosicao = () => {
      if (!buttonRef.current) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const margemViewport = 16;
      const gap = 8;
      const espacoAbaixo = window.innerHeight - rect.bottom - margemViewport - gap;
      const espacoAcima = rect.top - margemViewport - gap;
      const abrirAcima = espacoAbaixo < 220 && espacoAcima > espacoAbaixo;
      const espacoDisponivel = Math.max(140, abrirAcima ? espacoAcima : espacoAbaixo);

      setOpenAbove(abrirAcima);
      setMenuMaxHeight(espacoDisponivel);
    };

    calcularPosicao();
    window.addEventListener('resize', calcularPosicao);
    window.addEventListener('scroll', calcularPosicao, true);

    return () => {
      window.removeEventListener('resize', calcularPosicao);
      window.removeEventListener('scroll', calcularPosicao, true);
    };
  }, [isOpen]);

  const selected = options.find((opt) => opt.value === value);
  const displayText = selected?.label || placeholder;

  return (
    <div className="relative w-full min-w-0" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setIsOpen((prev) => !prev);
        }}
        className={`w-full min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500 dark:focus:ring-blue-400 flex items-center gap-2 justify-between disabled:cursor-not-allowed disabled:opacity-60 ${buttonClassName || ''}`}
      >
        <span className={`truncate ${selected ? '' : 'text-slate-400 dark:text-slate-500'}`}>{displayText}</span>
        <ChevronDown
          size={16}
          className={`text-gray-500 dark:text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 w-full min-w-full bg-white dark:bg-neutral-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden ${openAbove ? 'bottom-full mb-2' : 'top-full mt-2'} ${menuClassName || ''}`}
        >
          <div
            className={`overflow-y-auto p-2 ${menuContentClassName || ''}`}
            style={menuMaxHeight ? { maxHeight: `${menuMaxHeight}px` } : undefined}
          >
            {options.map((option) => {
              const isSelected = value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  <span className="truncate text-left">{option.label}</span>
                  {isSelected && <Check size={14} className="shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
