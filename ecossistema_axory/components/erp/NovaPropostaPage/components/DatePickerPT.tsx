import { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface DatePickerPTProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function DatePickerPT({ value, onChange, disabled, className = '' }: DatePickerPTProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value + 'T00:00:00') : null);
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  useEffect(() => {
    if (value) {
      setSelectedDate(new Date(value + 'T00:00:00'));
      setCurrentMonth(new Date(value + 'T00:00:00'));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    
    // Adicionar dias vazios no início
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Adicionar dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(newDate);
    const formattedDate = newDate.toISOString().split('T')[0];
    onChange(formattedDate);
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
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-sm cursor-pointer ${className}`}
          placeholder="dd/mm/aaaa"
        />
        <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-neutral-900 border border-[#E5E7EB] dark:border-[#262626] rounded-lg shadow-xl z-50 p-4 w-72">
          {/* Cabeçalho do calendário */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {meses[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Dias da semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {diasSemana.map((dia) => (
              <div
                key={dia}
                className="text-center text-xs font-medium text-gray-600 dark:text-gray-400 py-1"
              >
                {dia}
              </div>
            ))}
          </div>

          {/* Dias do mês */}
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
                    w-9 h-9 text-sm rounded transition-all duration-200
                    ${!day ? 'cursor-default' : 'cursor-pointer'}
                    ${isHoverable ? 'hover:bg-blue-100 dark:hover:bg-blue-800/50 hover:scale-110 hover:shadow-md hover:font-semibold' : ''}
                    ${isToday(day) && !isSelected(day) ? 'font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}
                    ${isSelected(day) ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md scale-105' : 'text-gray-900 dark:text-gray-100'}
                    ${!day ? 'text-transparent' : ''}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

