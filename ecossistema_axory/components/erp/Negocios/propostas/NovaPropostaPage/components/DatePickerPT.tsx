import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from 'lucide-react';

interface DatePickerPTProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function DatePickerPT({ value, onChange, disabled, className = '' }: DatePickerPTProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(`${value}T00:00:00`) : null);
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'S\u00e1b'];
  const meses = [
    'Janeiro',
    'Fevereiro',
    'Mar\u00e7o',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  useEffect(() => {
    if (!value) return;
    const novaData = new Date(`${value}T00:00:00`);
    setSelectedDate(novaData);
    setCurrentMonth(novaData);
  }, [value]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const atualizarPosicaoDropdown = () => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const popupWidth = 288; // w-72
    const popupHeight = popupRef.current?.offsetHeight || 352;
    const gap = 2;
    const viewportMargin = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const leftMin = viewportMargin;
    const leftMax = Math.max(viewportMargin, viewportWidth - popupWidth - viewportMargin);
    const left = Math.min(leftMax, Math.max(leftMin, rect.left));

    const espacoAbaixo = viewportHeight - rect.bottom - viewportMargin;
    const espacoAcima = rect.top - viewportMargin;

    let abrirAcima =
      espacoAbaixo < popupHeight + gap &&
      (espacoAcima >= popupHeight + gap || espacoAcima > espacoAbaixo);

    let top = abrirAcima ? rect.top - popupHeight - gap : rect.bottom + gap;

    if (!abrirAcima && top + popupHeight > viewportHeight - viewportMargin && espacoAcima > espacoAbaixo) {
      abrirAcima = true;
      top = rect.top - popupHeight - gap;
    }

    if (top < viewportMargin) {
      top = viewportMargin;
    }

    setDropdownPosition({
      top,
      left,
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clicouDentroContainer = containerRef.current?.contains(target);
      const clicouDentroPopup = popupRef.current?.contains(target);
      if (!clicouDentroContainer && !clicouDentroPopup) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      atualizarPosicaoDropdown();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', atualizarPosicaoDropdown);
      window.addEventListener('scroll', atualizarPosicaoDropdown, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', atualizarPosicaoDropdown);
      window.removeEventListener('scroll', atualizarPosicaoDropdown, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const raf = window.requestAnimationFrame(() => {
      atualizarPosicaoDropdown();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isOpen, currentMonth]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Array<number | null> = [];

    for (let i = 0; i < startingDayOfWeek; i += 1) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i += 1) {
      days.push(i);
    }

    return days;
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(newDate);
    onChange(newDate.toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const days = getDaysInMonth(currentMonth);
  const today = new Date();

  const isToday = (day: number | null) => {
    if (!day) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (day: number | null) => {
    if (!day || !selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={formatDisplayDate(selectedDate)}
          readOnly
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          disabled={disabled}
          className={`w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 dark:border-[#262626] dark:bg-neutral-900 dark:text-gray-100 dark:disabled:bg-neutral-800 cursor-pointer ${className}`}
          placeholder="dd/mm/aaaa"
        />
        <Calendar className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 transform text-gray-400" size={16} />
      </div>

      {mounted &&
        isOpen &&
        !disabled &&
        dropdownPosition &&
        createPortal(
          <div
            ref={popupRef}
            className="fixed w-72 rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-xl dark:border-[#262626] dark:bg-neutral-900"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              zIndex: 2147482000,
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="rounded p-1 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:outline-none dark:hover:bg-neutral-800"
              >
                <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {meses[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="rounded p-1 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:outline-none dark:hover:bg-neutral-800"
              >
                <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1">
              {diasSemana.map((dia) => (
                <div key={dia} className="py-1 text-center text-xs font-medium text-gray-600 dark:text-gray-400">
                  {dia}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                const isHoverable = day !== null && !isSelected(day);
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => day && handleDateClick(day)}
                    disabled={!day}
                    className={`
                      h-9 w-9 rounded text-sm transition-all duration-200 focus:outline-none focus-visible:outline-none
                      ${!day ? 'cursor-default text-transparent' : 'cursor-pointer'}
                      ${isHoverable ? 'hover:scale-110 hover:bg-blue-100 hover:font-semibold hover:shadow-md dark:hover:bg-blue-800/50' : ''}
                      ${isToday(day) && !isSelected(day) ? 'bg-blue-50 font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                      ${isSelected(day) ? 'scale-105 bg-blue-600 text-white shadow-md hover:bg-blue-700' : 'text-gray-900 dark:text-gray-100'}
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
