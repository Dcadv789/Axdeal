import { Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';

export type PeriodType = 'custom' | 'current_month' | 'last_month' | 'current_year';

interface PeriodFilterProps {
  onPeriodChange?: (startDate: string, endDate: string, period: PeriodType) => void;
}

export default function PeriodFilter({ onPeriodChange }: PeriodFilterProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activePeriod, setActivePeriod] = useState<PeriodType>('current_month');

  useEffect(() => {
    handlePeriodClick('current_month');
  }, []);

  const handlePeriodClick = (period: PeriodType) => {
    setActivePeriod(period);
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case 'current_month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last_month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'current_year':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
      default:
        return;
    }

    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];

    setStartDate(startDateStr);
    setEndDate(endDateStr);

    if (onPeriodChange) {
      onPeriodChange(startDateStr, endDateStr, period);
    }
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartDate(value);
      if (onPeriodChange) {
        onPeriodChange(value, endDate, 'custom');
      }
    } else {
      setEndDate(value);
      if (onPeriodChange) {
        onPeriodChange(startDate, value, 'custom');
      }
    }
    setActivePeriod('custom');
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-3">
        <Calendar size={18} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange('start', e.target.value)}
            className={`px-2.5 py-1.5 border-2 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm transition-all ${
              activePeriod === 'custom'
                ? 'border-blue-600 dark:border-blue-500 shadow-sm'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          />

          <span className="text-gray-400 dark:text-gray-500 text-sm">até</span>

          <input
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange('end', e.target.value)}
            className={`px-2.5 py-1.5 border-2 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm transition-all ${
              activePeriod === 'custom'
                ? 'border-blue-600 dark:border-blue-500 shadow-sm'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => handlePeriodClick('current_month')}
          className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all border-2 ${
            activePeriod === 'current_month'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          Este Mês
        </button>
        <button
          onClick={() => handlePeriodClick('last_month')}
          className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all border-2 ${
            activePeriod === 'last_month'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          Mês Anterior
        </button>
        <button
          onClick={() => handlePeriodClick('current_year')}
          className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all border-2 ${
            activePeriod === 'current_year'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          Este Ano
        </button>
      </div>
    </div>
  );
}
