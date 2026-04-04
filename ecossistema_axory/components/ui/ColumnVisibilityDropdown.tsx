'use client';

import { Columns3 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ColumnOption<T extends string> {
  key: T;
  label: string;
  tooltip?: string;
  disabled?: boolean;
}

interface ColumnVisibilityDropdownProps<T extends string> {
  options: ColumnOption<T>[];
  values: Record<T, boolean>;
  onToggle: (key: T, checked: boolean) => void;
  buttonLabel?: string;
  className?: string;
  menuClassName?: string;
}

export default function ColumnVisibilityDropdown<T extends string>({
  options,
  values,
  onToggle,
  buttonLabel = 'Colunas',
  className = '',
  menuClassName = '',
}: ColumnVisibilityDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-gray-300 dark:hover:bg-neutral-800"
      >
        <Columns3 size={18} />
        {buttonLabel}
      </button>

      {open && (
        <div
          className={`absolute left-0 top-full mt-1 z-20 w-64 rounded-lg border border-blue-200 bg-white py-1 shadow-xl dark:border-blue-500/35 dark:bg-neutral-900 ${menuClassName}`}
        >
          {options.map((option) => (
            <label
              key={option.key}
              className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                option.disabled
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800'
              }`}
            >
              <input
                type="checkbox"
                disabled={option.disabled}
                checked={Boolean(values[option.key])}
                onChange={(event) => onToggle(option.key, event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
              {option.tooltip ? (
                <span
                  className="group/tooltip relative ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[10px] font-semibold text-gray-500 dark:border-neutral-700 dark:text-gray-400"
                  onClick={(event) => event.preventDefault()}
                >
                  i
                  <span className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-50 min-w-[220px] max-w-[300px] rounded-lg bg-slate-900 px-2.5 py-2 text-xs font-medium normal-case leading-relaxed text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover/tooltip:opacity-100 dark:bg-black">
                    {option.tooltip}
                  </span>
                </span>
              ) : null}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
