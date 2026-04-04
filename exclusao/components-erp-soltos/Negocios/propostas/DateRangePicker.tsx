import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DateRangePickerProps {
  dataInicio: string;
  dataFim: string;
  onChange: (inicio: string, fim: string) => void;
  buttonClassName?: string;
  className?: string;
}

const NOMES_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const NOMES_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function toISODate(data: Date): string {
  const ano = data.getFullYear();
  const mes = `${data.getMonth() + 1}`.padStart(2, '0');
  const dia = `${data.getDate()}`.padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function parseISODate(valor: string): Date | null {
  if (!valor) return null;
  const [ano, mes, dia] = valor.split('-').map(Number);
  if (!ano || !mes || !dia) return null;
  return new Date(ano, mes - 1, dia);
}

function formatarData(valor: string): string {
  if (!valor) return '';
  const data = parseISODate(valor);
  if (!data) return '';
  return data.toLocaleDateString('pt-BR');
}

function montarDiasMes(base: Date): Array<Date | null> {
  const ano = base.getFullYear();
  const mes = base.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diasNoMes = ultimoDia.getDate();
  const inicioSemana = (primeiroDia.getDay() + 6) % 7;
  const totalCelulas = 42;

  return Array.from({ length: totalCelulas }, (_, idx) => {
    const dia = idx - inicioSemana + 1;
    if (dia < 1 || dia > diasNoMes) return null;
    return new Date(ano, mes, dia);
  });
}

function mesmoDia(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function DateRangePicker({ dataInicio, dataFim, onChange, buttonClassName, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [mesBase, setMesBase] = useState(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  });
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const dataInicioObj = useMemo(() => parseISODate(dataInicio), [dataInicio]);
  const dataFimObj = useMemo(() => parseISODate(dataFim), [dataFim]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const label = useMemo(() => {
    if (dataInicio && dataFim) return `${formatarData(dataInicio)} - ${formatarData(dataFim)}`;
    if (dataInicio) return `${formatarData(dataInicio)} - ...`;
    return 'Selecionar período';
  }, [dataInicio, dataFim]);

  const selecionarDia = (dia: Date) => {
    const iso = toISODate(dia);

    if (!dataInicio || (dataInicio && dataFim)) {
      onChange(iso, '');
      return;
    }

    const inicio = parseISODate(dataInicio);
    if (!inicio) {
      onChange(iso, '');
      return;
    }

    if (dia < inicio) {
      onChange(iso, dataInicio);
    } else {
      onChange(dataInicio, iso);
    }
    setOpen(false);
  };

  return (
    <div className={`relative ${className || ''}`} ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`h-10 w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-3 flex items-center justify-between gap-3 text-sm hover:border-blue-400 dark:hover:border-blue-400/50 transition-colors ${buttonClassName || ''}`}
      >
        <span className={`${dataInicio ? 'text-slate-700 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>{label}</span>
        <CalendarDays size={15} className="text-slate-500 dark:text-slate-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-xl p-4 w-[620px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMesBase((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className="h-8 w-8 rounded-lg border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800"
              >
                <ChevronLeft size={14} className="mx-auto" />
              </button>
              <button
                type="button"
                onClick={() => setMesBase((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                className="h-8 w-8 rounded-lg border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800"
              >
                <ChevronRight size={14} className="mx-auto" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => onChange('', '')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <X size={13} />
              Limpar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[0, 1].map((offset) => {
              const mesAtual = new Date(mesBase.getFullYear(), mesBase.getMonth() + offset, 1);
              const dias = montarDiasMes(mesAtual);
              return (
                <div key={offset} className="rounded-xl border border-slate-200 dark:border-neutral-700 p-2">
                  <div className="text-center text-sm font-semibold text-slate-700 dark:text-slate-100 mb-2">
                    {NOMES_MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}
                  </div>
                  <div className="grid grid-cols-7 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    {NOMES_SEMANA.map((nome) => (
                      <div key={nome} className="h-6 flex items-center justify-center">
                        {nome}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-y-1">
                    {dias.map((dia, idx) => {
                      if (!dia) return <div key={`vazio-${idx}`} className="h-8" />;

                      const isInicio = mesmoDia(dia, dataInicioObj);
                      const isFim = mesmoDia(dia, dataFimObj);
                      const inRange =
                        dataInicioObj &&
                        dataFimObj &&
                        dia >= dataInicioObj &&
                        dia <= dataFimObj;

                      return (
                        <button
                          key={`${dia.getTime()}-${idx}`}
                          type="button"
                          onClick={() => selecionarDia(dia)}
                          className={[
                            'h-8 w-8 mx-auto rounded-lg text-xs font-medium transition-colors',
                            isInicio || isFim
                              ? 'bg-blue-600 text-white'
                              : inRange
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
                                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-neutral-800',
                          ].join(' ')}
                        >
                          {dia.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
