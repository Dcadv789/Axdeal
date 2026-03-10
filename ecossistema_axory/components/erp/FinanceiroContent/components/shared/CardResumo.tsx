import { formatarMoeda } from '../../utils/dateUtils';

interface CardResumoProps {
  titulo: string;
  valor: number;
  descricao: string;
  icone: React.ReactNode;
  corIcone: string;
}

export default function CardResumo({ titulo, valor, descricao, icone, corIcone }: CardResumoProps) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-[#E5E7EB] dark:border-[#262626] px-6 py-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            {titulo}
          </h3>
          <div className={`w-8 h-8 ${corIcone} rounded-lg flex items-center justify-center`}>
            {icone}
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {formatarMoeda(valor)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {descricao}
        </p>
      </div>
    </div>
  );
}





