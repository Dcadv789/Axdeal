import { Calendar } from 'lucide-react';
import { useRef, useEffect } from 'react';
import type { PropostaFormData, Cliente } from '../types';
import type { Vendedor } from '../hooks/useVendedores';
import DatePickerPT from './DatePickerPT';

interface InformacoesBasicasProps {
  formData: PropostaFormData;
  setFormData: (data: PropostaFormData) => void;
  clienteSelecionado: Cliente | null;
  busca: string;
  atualizarBusca: (valor: string) => void;
  clientesFiltrados: Cliente[];
  mostrarSugestoes: boolean;
  setMostrarSugestoes: (mostrar: boolean) => void;
  selecionarCliente: (cliente: Cliente) => void;
  isViewMode: boolean;
  codigoVendaGerada?: string | null;
  codigoPropostaOrigem?: string | null;
  isVenda?: boolean;
  statusProposta?: string;
  vendedores: Vendedor[];
  vendedorSelecionado: string | null;
  setVendedorSelecionado: (id: string | null) => void;
}

export default function InformacoesBasicas({
  formData,
  setFormData,
  clienteSelecionado,
  busca,
  atualizarBusca,
  clientesFiltrados,
  mostrarSugestoes,
  setMostrarSugestoes,
  selecionarCliente,
  isViewMode,
  codigoVendaGerada,
  codigoPropostaOrigem,
  isVenda,
  statusProposta,
  vendedores,
  vendedorSelecionado,
  setVendedorSelecionado
}: InformacoesBasicasProps) {
  const clienteInputRef = useRef<HTMLDivElement>(null);

  // Fechar lista de sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clienteInputRef.current && !clienteInputRef.current.contains(event.target as Node)) {
        setMostrarSugestoes(false);
      }
    };

    if (mostrarSugestoes) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mostrarSugestoes, setMostrarSugestoes]);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-[#E5E7EB] dark:border-[#262626] p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Informações Básicas
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Preencha os dados principais da proposta
        </p>
      </div>

      <div className="space-y-4">
        {/* Primeira linha: Número, Título, Status */}
        <div className="flex gap-4">
          {/* Número - reduzido */}
          <div className="w-32 flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Número
            </label>
            <input
              type="text"
              value={formData.numeroProposta}
              disabled
              className="w-full px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 cursor-not-allowed"
            />
          </div>

          {/* Título - expandido */}
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Título da Proposta *
            </label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              disabled={isViewMode}
              placeholder="Ex: Consultoria Empresarial"
              className="w-full px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
            />
          </div>

          {/* Status - reduzido */}
          <div className="w-40 flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <input
              type="text"
              value={statusProposta || 'RASCUNHO'}
              disabled
              className="w-full px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Segunda linha: Cliente e Vendedor na mesma linha */}
        <div className="grid grid-cols-2 gap-4">
          {/* Cliente */}
          <div className="relative" ref={clienteInputRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cliente *
            </label>
            <input
              type="text"
              value={busca}
              onChange={(e) => atualizarBusca(e.target.value)}
              onFocus={() => busca && setMostrarSugestoes(true)}
              disabled={isViewMode}
              placeholder="Digite o nome ou CNPJ do cliente..."
              className="w-full px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
            />
            
            {mostrarSugestoes && clientesFiltrados.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-800 border border-[#E5E7EB] dark:border-[#262626] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {clientesFiltrados.map((cliente) => (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() => selecionarCliente(cliente)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors border-b border-[#E5E7EB] dark:border-[#262626] last:border-b-0"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {cliente.nome_razao_social}
                    </div>
                    {cliente.nome_fantasia && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {cliente.nome_fantasia}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {cliente.cnpj || cliente.cpf}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Vendedor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Vendedor
            </label>
            <select
              value={vendedorSelecionado || ''}
              onChange={(e) => setVendedorSelecionado(e.target.value || null)}
              disabled={isViewMode}
              className="w-full px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
            >
              <option value="">Selecione um vendedor</option>
              {vendedores.map((vendedor) => (
                <option key={vendedor.id} value={vendedor.id}>
                  {vendedor.nome_completo}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Terceira linha: Data da Proposta, Data de Validade */}
        <div className="grid grid-cols-2 gap-4">
          {/* Data da Proposta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data da Proposta *
            </label>
            <DatePickerPT
              value={formData.dataProposta}
              onChange={(value) => setFormData({ ...formData, dataProposta: value })}
              disabled={isViewMode}
            />
          </div>

          {/* Data de Validade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data de Validade *
            </label>
            <DatePickerPT
              value={formData.dataValidade}
              onChange={(value) => setFormData({ ...formData, dataValidade: value })}
              disabled={isViewMode}
            />
          </div>
        </div>

        {/* Quarta linha: Prazo de Entrega, Prazo da Garantia */}
        <div className="grid grid-cols-2 gap-4">
          {/* Prazo de Entrega */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prazo de Entrega
            </label>
            <input
              type="text"
              value={formData.prazoEntrega}
              onChange={(e) => setFormData({ ...formData, prazoEntrega: e.target.value })}
              disabled={isViewMode}
              placeholder="Ex: 7 dias"
              className="w-full px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
            />
          </div>

          {/* Prazo da Garantia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prazo da Garantia
            </label>
            <input
              type="text"
              value={formData.prazoGarantia}
              onChange={(e) => setFormData({ ...formData, prazoGarantia: e.target.value })}
              disabled={isViewMode}
              placeholder="Ex: 90 dias"
              className="w-full px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Quinta linha: Código da Venda Gerada (só aparece quando uma venda foi criada) */}
        {codigoVendaGerada && !isVenda && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Código da Venda Gerada
            </label>
            <input
              type="text"
              value={codigoVendaGerada}
              disabled
              className="w-full px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 cursor-not-allowed"
            />
          </div>
        )}

        {/* Código da Proposta de Origem (para vendas) */}
        {codigoPropostaOrigem && isVenda && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Código da Proposta de Origem
            </label>
            <input
              type="text"
              value={codigoPropostaOrigem}
              disabled
              className="w-full px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 cursor-not-allowed"
            />
          </div>
        )}
      </div>
    </div>
  );
}

