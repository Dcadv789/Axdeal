import { CheckCircle, TrendingUp, AlertCircle, ShoppingCart, DollarSign, FileText } from 'lucide-react';
import { useMemo } from 'react';

interface StatCard {
  title: string;
  value: number;
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
  iconBgColor: string;
  iconColor: string;
}

export default function DashboardContent() {
  const dadosValoresReceber = useMemo(() => {
    const dados = [];
    const hoje = new Date();

    for (let i = 0; i < 30; i++) {
      const data = new Date(hoje);
      data.setDate(hoje.getDate() + i);

      const valor = Math.random() * 8000 + 1000;
      dados.push({
        data: data,
        valor: valor,
        dia: data.getDate(),
        mes: data.getMonth() + 1,
      });
    }

    return dados;
  }, []);

  const valorMaximoReceber = Math.max(...dadosValoresReceber.map(d => d.valor));
  const valorTotalReceber = dadosValoresReceber.reduce((sum, d) => sum + d.valor, 0);

  const stats: StatCard[] = [
    {
      title: 'TOTAL RECEBIDO',
      value: 0,
      icon: CheckCircle,
      iconBgColor: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'TOTAL A RECEBER',
      value: 0,
      icon: TrendingUp,
      iconBgColor: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'TOTAL VENCIDO',
      value: 0,
      icon: AlertCircle,
      iconBgColor: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
    },
    {
      title: 'QUANTIDADE DE VENDAS',
      value: 0,
      icon: ShoppingCart,
      iconBgColor: 'bg-orange-100 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
  ];

  return (
    <div className="py-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-[#E5E7EB] dark:border-[#262626] p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  {stat.title}
                </h3>
                <div className={`w-9 h-9 ${stat.iconBgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} className={stat.iconColor} />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-[#E5E7EB] dark:border-[#262626] p-6">
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            🎯 Meta de Recebimento
          </h3>
          <span className="text-lg font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2.5 py-0.5 rounded-md">
            75%
          </span>
        </div>

        <div className="relative mb-3">
          <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-600 dark:to-emerald-600 rounded-full relative overflow-hidden transition-all duration-1000 ease-out"
              style={{ width: '75%' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]"
                   style={{
                     backgroundSize: '200% 100%',
                     animation: 'shimmer 2s infinite linear'
                   }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            R$ 75.000,00 de R$ 100.000,00
          </p>
          <p className="text-sm font-medium text-green-600 dark:text-green-400">
            Parabéns, está quase lá!
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-[#E5E7EB] dark:border-[#262626] p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Valores a Receber
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Próximos 30 dias
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              R$ {valorTotalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="h-80 relative">
            <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-gray-600 dark:text-gray-400 pr-2">
              <span className="text-right">R$ {(valorMaximoReceber / 1000).toFixed(1)}k</span>
              <span className="text-right">R$ {(valorMaximoReceber * 0.75 / 1000).toFixed(1)}k</span>
              <span className="text-right">R$ {(valorMaximoReceber * 0.5 / 1000).toFixed(1)}k</span>
              <span className="text-right">R$ {(valorMaximoReceber * 0.25 / 1000).toFixed(1)}k</span>
              <span className="text-right">R$ 0</span>
            </div>

            <div className="absolute left-16 right-0 top-0 bottom-8 border-l border-b border-[#E5E7EB] dark:border-[#262626]">
              <div className="absolute inset-0 flex justify-between items-end px-1 pb-1">
                {dadosValoresReceber.map((item, index) => {
                  const altura = (item.valor / valorMaximoReceber) * 100;
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
                    className="absolute left-0 right-0 border-t border-gray-200 dark:border-gray-700 border-dashed"
                    style={{ bottom: `${percent}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="absolute left-16 right-0 bottom-0 h-8 flex justify-between items-center px-1 text-xs text-gray-600 dark:text-gray-400">
              {dadosValoresReceber.map((item, index) => (
                <span key={index} className="text-center" style={{ maxWidth: '3%' }}>
                  {item.dia}/{item.mes}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-[#E5E7EB] dark:border-[#262626] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Faturas Vencidas
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Há até 30 dias
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                R$ {(2500 + 4800 + 1200 + 3500 + 6700).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { id: 1, cliente: 'João Silva', numero: 'FAT-0245', valor: 2500, diasVencido: 5 },
              { id: 2, cliente: 'Maria Santos', numero: 'FAT-0238', valor: 4800, diasVencido: 12 },
              { id: 3, cliente: 'Carlos Costa', numero: 'FAT-0230', valor: 1200, diasVencido: 18 },
              { id: 4, cliente: 'Ana Oliveira', numero: 'FAT-0225', valor: 3500, diasVencido: 25 },
              { id: 5, cliente: 'Pedro Almeida', numero: 'FAT-0220', valor: 6700, diasVencido: 30 },
            ].map((fatura) => {
              const dataVencimento = new Date();
              dataVencimento.setDate(dataVencimento.getDate() - fatura.diasVencido);
              const dataFormatada = dataVencimento.toLocaleDateString('pt-BR');

              return (
                <div
                  key={fatura.id}
                  className="p-4 rounded-lg border border-[#E5E7EB] dark:border-[#262626] hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {fatura.cliente}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {fatura.numero}
                        </p>
                        <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-[10px] font-medium">
                          {dataFormatada}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600 dark:text-red-400">
                        R$ {fatura.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {fatura.diasVencido} {fatura.diasVencido === 1 ? 'dia' : 'dias'} atrás
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="w-full mt-4 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors">
            Ver Todas as Faturas Vencidas
          </button>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-[#E5E7EB] dark:border-[#262626] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Propostas
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Propostas em aberto ou próximas de fechamento
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { id: 1, numero: 'P0015', cliente: 'Tech Solutions', valor: 25000, status: 'Visualizada', diasRestantes: 2, cor: 'blue' },
              { id: 2, numero: 'P0018', cliente: 'João Silva', valor: 5000, status: 'Enviada', diasRestantes: 5, cor: 'blue' },
              { id: 3, numero: 'P0020', cliente: 'Empresa XYZ', valor: 15000, status: 'Visualizada', diasRestantes: 1, cor: 'amber' },
              { id: 4, numero: 'P0012', cliente: 'Maria Santos', valor: 8500, status: 'Aguardando Envio', diasRestantes: 7, cor: 'gray' },
              { id: 5, numero: 'P0019', cliente: 'Carlos Costa', valor: 12000, status: 'Visualizada', diasRestantes: 3, cor: 'blue' },
            ].map((proposta) => (
              <div
                key={proposta.id}
                className="p-4 rounded-lg border border-[#E5E7EB] dark:border-[#262626] hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {proposta.numero}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        proposta.cor === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                        proposta.cor === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                        'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                      }`}>
                        {proposta.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {proposta.cliente}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      R$ {proposta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {proposta.diasRestantes} {proposta.diasRestantes === 1 ? 'dia restante' : 'dias restantes'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-4 px-4 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors">
            Ver Todas as Propostas
          </button>
        </div>
      </div>
    </div>
  );
}
