import { useMemo, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Contrato {
  id: string;
  id_cliente: string | null;
  valor_recorrente: number;
  dia_vencimento: number;
  data_inicio: string;
  proximo_faturamento: string | null;
  status: 'ativo' | 'cancelado';
  cliente_nome: string;
}

interface Cliente {
  id: string;
  nome_razao_social: string;
}

interface NegociosContratosTabProps {
  idEmpresa: string | null;
  contratos: Contrato[];
  clientes: Cliente[];
  busca: string;
  onContratoCriado: () => Promise<void> | void;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0));
}

function formatarData(valor: string | null) {
  if (!valor) return '-';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return data.toLocaleDateString('pt-BR');
}

export default function NegociosContratosTab({
  idEmpresa,
  contratos,
  clientes,
  busca,
  onContratoCriado,
}: NegociosContratosTabProps) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [idCliente, setIdCliente] = useState('');
  const [valorRecorrente, setValorRecorrente] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('10');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [proximoFaturamento, setProximoFaturamento] = useState('');
  const [status, setStatus] = useState<'ativo' | 'cancelado'>('ativo');

  const contratosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return contratos;
    return contratos.filter((contrato) =>
      [contrato.cliente_nome, contrato.status, String(contrato.dia_vencimento)].join(' ').toLowerCase().includes(termo)
    );
  }, [busca, contratos]);

  const limparFormulario = () => {
    setIdCliente('');
    setValorRecorrente('');
    setDiaVencimento('10');
    setDataInicio(new Date().toISOString().slice(0, 10));
    setProximoFaturamento('');
    setStatus('ativo');
    setErro(null);
  };

  const salvarContrato = async () => {
    if (!idEmpresa) {
      setErro('Empresa não identificada.');
      return;
    }

    const valor = Number(valorRecorrente);
    const dia = Number(diaVencimento);

    if (!idCliente) {
      setErro('Selecione um cliente.');
      return;
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      setErro('Informe um valor recorrente válido.');
      return;
    }
    if (!Number.isFinite(dia) || dia < 1 || dia > 31) {
      setErro('Dia de vencimento deve ser entre 1 e 31.');
      return;
    }
    if (!dataInicio) {
      setErro('Informe a data de início.');
      return;
    }

    setErro(null);
    setSalvando(true);

    const payload = {
      id_empresa: idEmpresa,
      id_cliente: idCliente,
      valor_recorrente: valor,
      dia_vencimento: dia,
      data_inicio: dataInicio,
      proximo_faturamento: proximoFaturamento || null,
      status,
    };

    const { error } = await supabase.from('erp_contratos').insert(payload);
    setSalvando(false);

    if (error) {
      console.error('Erro ao salvar contrato:', error);
      setErro(error.message || 'Não foi possível salvar o contrato.');
      return;
    }

    limparFormulario();
    setMostrarFormulario(false);
    await onContratoCriado();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {contratosFiltrados.length} contrato{contratosFiltrados.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMostrarFormulario((valor) => !valor)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Novo Contrato
        </button>
      </div>

      {mostrarFormulario && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/40 dark:bg-blue-900/10 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cadastrar contrato recorrente</p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Cliente</label>
              <select
                value={idCliente}
                onChange={(e) => setIdCliente(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              >
                <option value="">Selecionar cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome_razao_social}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Valor recorrente</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={valorRecorrente}
                onChange={(e) => setValorRecorrente(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                placeholder="0,00"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Dia do vencimento</label>
              <input
                type="number"
                min="1"
                max="31"
                value={diaVencimento}
                onChange={(e) => setDiaVencimento(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Data de início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Próximo faturamento</label>
              <input
                type="date"
                value={proximoFaturamento}
                onChange={(e) => setProximoFaturamento(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ativo' | 'cancelado')}
                className="w-full rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              >
                <option value="ativo">Ativo</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {erro && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
              {erro}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                limparFormulario();
                setMostrarFormulario(false);
              }}
              className="rounded-lg border border-[#E5E7EB] dark:border-[#262626] px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void salvarContrato()}
              disabled={salvando}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {salvando && <Loader2 size={14} className="animate-spin" />}
              Salvar contrato
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] dark:border-[#262626]">
        {contratosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Nenhum contrato encontrado.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Dia venc.</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Início</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Próx. faturamento</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-900 divide-y divide-[#E5E7EB] dark:divide-[#262626]">
              {contratosFiltrados.map((contrato) => (
                <tr key={contrato.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{contrato.cliente_nome || 'Sem cliente'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{formatarMoeda(contrato.valor_recorrente)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Dia {contrato.dia_vencimento}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatarData(contrato.data_inicio)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatarData(contrato.proximo_faturamento)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        contrato.status === 'ativo'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-gray-200 text-gray-700 dark:bg-neutral-800 dark:text-gray-300'
                      }`}
                    >
                      {contrato.status === 'ativo' ? 'Ativo' : 'Cancelado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

