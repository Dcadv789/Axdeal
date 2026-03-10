import { useState, useMemo, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Card } from '@axdeal/ui';

type PeriodoFiltro = 'ultimos_7' | 'ultimos_15' | 'ultimos_30' | 'ultimos_60' | 'ultimos_90';

export default function PerformanceTab() {
  const [periodoSelecionado, setPeriodoSelecionado] = useState<PeriodoFiltro>('ultimos_30');
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const dadosGrafico = useMemo(() => {
    const dados = [];
    const hoje = new Date();
    const diasPeriodo = parseInt(periodoSelecionado.split('_')[1]);

    for (let i = 0; i < 30; i++) {
      const data = new Date(hoje);
      data.setDate(hoje.getDate() - (29 - i));
      
      const valor = Math.random() * 10000 + 2000;
      dados.push({
        data: data,
        valor: valor,
        dia: data.getDate(),
        mes: data.getMonth() + 1,
      });
    }

    return dados;
  }, [periodoSelecionado]);

  const valorMaximo = Math.max(...dadosGrafico.map(d => d.valor));

  const filtros = [
    { id: 'ultimos_7' as PeriodoFiltro, label: 'Últimos 7 dias' },
    { id: 'ultimos_15' as PeriodoFiltro, label: 'Últimos 15 dias' },
    { id: 'ultimos_30' as PeriodoFiltro, label: 'Últimos 30 dias' },
    { id: 'ultimos_60' as PeriodoFiltro, label: 'Últimos 60 dias' },
    { id: 'ultimos_90' as PeriodoFiltro, label: 'Últimos 90 dias' },
  ];

  const labelSelecionada = filtros.find(f => f.id === periodoSelecionado)?.label || 'Últimos 30 dias';

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownAberto(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <Card>
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB] dark:border-[#262626]">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Calendar size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Agenda de Recebimento
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Análise temporal dos valores financeiros
            </p>
          </div>
        </div>

        <div className="relative w-fit" ref={dropdownRef}>
          <button
            onClick={() => setDropdownAberto(!dropdownAberto)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 border border-[#E5E7EB] dark:border-[#262626] transition-all"
          >
            <Calendar size={16} />
            {labelSelecionada}
            <ChevronDown size={16} className={`transition-transform ${dropdownAberto ? 'rotate-180' : ''}`} />
          </button>

          {dropdownAberto && (
            <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-[#E5E7EB] dark:border-[#262626] rounded-lg shadow-lg z-10 min-w-48">
              {filtros.map((filtro) => (
                <button
                  key={filtro.id}
                  onClick={() => {
                    setPeriodoSelecionado(filtro.id);
                    setDropdownAberto(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    periodoSelecionado === filtro.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {filtro.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="h-80 relative">
            <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-gray-600 dark:text-gray-400 pr-2">
              <span className="text-right">R$ {(valorMaximo / 1000).toFixed(1)}k</span>
              <span className="text-right">R$ {(valorMaximo * 0.75 / 1000).toFixed(1)}k</span>
              <span className="text-right">R$ {(valorMaximo * 0.5 / 1000).toFixed(1)}k</span>
              <span className="text-right">R$ {(valorMaximo * 0.25 / 1000).toFixed(1)}k</span>
              <span className="text-right">R$ 0</span>
            </div>

            <div className="absolute left-16 right-0 top-0 bottom-8 border-l border-b border-[#E5E7EB] dark:border-[#262626]">
              <div className="absolute inset-0 flex justify-between items-end px-1 pb-1">
                {dadosGrafico.map((item, index) => {
                  const altura = (item.valor / valorMaximo) * 100;
                  return (
                    <div
                      key={index}
                      className="group relative flex-1 flex items-end justify-center"
                      style={{ maxWidth: '3%' }}
                    >
                      <div
                        className="w-full bg-gradient-to-t from-blue-600 to-blue-400 dark:from-blue-500 dark:to-blue-300 rounded-t hover:opacity-80 transition-opacity cursor-pointer"
                        style={{ height: `${altura}%` }}
                      />
                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                        <div className="font-semibold">
                          {item.dia}/{item.mes}
                        </div>
                        <div>R$ {item.valor.toFixed(2)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="absolute inset-0 pointer-events-none">
                {[0, 25, 50, 75, 100].map((percent) => (
                  <div
                    key={percent}
                    className="absolute left-0 right-0 border-t border-[#E5E7EB] dark:border-[#262626] border-dashed"
                    style={{ bottom: `${percent}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="absolute left-16 right-0 bottom-0 h-8 flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
              {dadosGrafico.filter((_, i) => i % 5 === 0).map((item, index) => (
                <span key={index} className="text-center">
                  {item.dia}/{item.mes}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}





