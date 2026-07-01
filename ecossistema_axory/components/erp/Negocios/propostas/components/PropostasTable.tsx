import { getStatusBadge } from '@/utils/statusBadge';
import {
  MoreVertical,
  MessageCircle,
  Mail,
  CheckCircle,
  PackagePlus,
  Undo2,
  Trash2,
  Copy,
  CopyPlus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  DollarSign,
  RotateCcw,
  Loader2,
  Check,
  X,
  FileText,
  Eye,
} from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/lib/context/company-context';

interface Proposta {
  id: string;
  codigo: string;
  cliente_nome: string;
  status: string;
  valor_total_final: number;
  data_emissao: string;
  introducao?: string;
  estoque_lancado?: boolean | null;
  conta_lancada?: boolean | null;
  id_cliente?: string | null;
}

type SortColumn = 'codigo' | 'cliente_nome' | 'status' | 'valor_total_final' | 'data' | null;
type SortDirection = 'asc' | 'desc' | null;
export type NegociosTableColumnKey =
  | 'select'
  | 'codigo'
  | 'data'
  | 'cliente'
  | 'status'
  | 'conta_lancada'
  | 'estoque_lancado'
  | 'valor'
  | 'acoes';

interface PropostasTableProps {
  propostas: Proposta[];
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  isVendas?: boolean;
  tableType?: 'propostas' | 'pedidos_venda' | 'ordens_servico';
  onEditarProposta?: (id: string) => void;
  onCopiarProposta?: (id: string) => void;
  onExcluirDocumento?: (proposta: Proposta) => void;
  onAprovarProposta?: (id: string) => void;
  onAlterarStatus?: (proposta: Proposta) => void;
  onAcaoEstoque?: (proposta: Proposta, tableType: 'pedidos_venda' | 'ordens_servico') => void;
  onVerCliente?: (clienteId: string) => void;
  permiteEdicaoStatus?: boolean;
  visibleColumns?: Record<NegociosTableColumnKey, boolean>;
}

interface MenuPosition {
  top: number;
  right: number;
}

export default function PropostasTable({
  propostas,
  sortColumn,
  sortDirection,
  onSort,
  isVendas = false,
  tableType,
  onEditarProposta,
  onCopiarProposta,
  onExcluirDocumento,
  onAprovarProposta,
  onAlterarStatus,
  onAcaoEstoque,
  onVerCliente,
  permiteEdicaoStatus = false,
  visibleColumns,
}: PropostasTableProps) {
  const { companyId } = useCompany();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, right: 0 });
  const [hasParcelasMap, setHasParcelasMap] = useState<Record<string, boolean | null>>({});
  const [loadingFinanceiro, setLoadingFinanceiro] = useState<string | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const resolvedTableType = tableType ?? (isVendas ? 'pedidos_venda' : 'propostas');
  const isPedidosVenda = resolvedTableType === 'pedidos_venda';
  const isOrdemServico = resolvedTableType === 'ordens_servico';
  const permiteAprovacaoManual = Boolean(onAprovarProposta);
  const mostraAcaoFinanceira = (isPedidosVenda || isOrdemServico) && companyId;
  const tableVisibilityId = useId().replace(/:/g, '');
  const visibilityClassName = `negocios-table-${tableVisibilityId}`;
  const hiddenColumnsCss = useMemo(() => {
    if (!visibleColumns) return '';
    const baseIndexByKey: Record<NegociosTableColumnKey, number> = isPedidosVenda || isOrdemServico
      ? {
          select: 1,
          codigo: 2,
          data: 3,
          cliente: 4,
          status: 5,
          conta_lancada: 6,
          estoque_lancado: 7,
          valor: 8,
          acoes: 9,
        }
      : {
          select: 1,
          codigo: 2,
          data: 3,
          cliente: 4,
          status: 5,
          conta_lancada: 999,
          estoque_lancado: 999,
          valor: 6,
          acoes: 7,
        };
    return (Object.keys(baseIndexByKey) as NegociosTableColumnKey[])
      .filter((key) => visibleColumns[key] === false && baseIndexByKey[key] !== 999)
      .map(
        (key) =>
          `.${visibilityClassName} table th:nth-child(${baseIndexByKey[key]}), .${visibilityClassName} table td:nth-child(${baseIndexByKey[key]}) { display: none; }`
      )
      .join('\n');
  }, [visibleColumns, visibilityClassName, isPedidosVenda, isOrdemServico]);

  const handleLancarOuEstornarContas = useCallback(
    async (documentoId: string) => {
      if (!companyId) return;
      const hasParcelas = hasParcelasMap[documentoId];
      const pTipo = isPedidosVenda ? 'VENDA' : 'OS';

      if (hasParcelas) {
        const msg = isPedidosVenda
          ? 'Tem certeza que deseja estornar as contas a receber deste pedido?'
          : 'Tem certeza que deseja estornar as contas a receber desta ordem de serviço?';
        if (!window.confirm(msg)) return;

        setLoadingFinanceiro(documentoId);
        try {
          const { error } = await supabase.rpc('erp_rpc_gerenciar_financeiro_origem', {
            p_tipo: pTipo,
            p_id: documentoId,
            p_operacao: 'ESTORNAR',
          });
          if (error) throw error;
          toast.warning('Financeiro estornado!');
          setHasParcelasMap((prev) => ({ ...prev, [documentoId]: false }));
        } catch (err: unknown) {
          const msg =
            err && typeof err === 'object' && 'message' in err
              ? String((err as { message: string }).message)
              : 'Erro ao estornar contas.';
          toast.error(msg);
        } finally {
          setLoadingFinanceiro(null);
        }
      } else {
        setLoadingFinanceiro(documentoId);
        try {
          const { error } = await supabase.rpc('erp_rpc_gerenciar_financeiro_origem', {
            p_tipo: pTipo,
            p_id: documentoId,
            p_operacao: 'LANCAR',
          });
          if (error) throw error;
          toast.success('Financeiro lançado com sucesso!');
          setHasParcelasMap((prev) => ({ ...prev, [documentoId]: true }));
        } catch (err: unknown) {
          const msg =
            err && typeof err === 'object' && 'message' in err
              ? String((err as { message: string }).message)
              : 'Erro ao lançar contas a receber.';
          toast.error(msg);
        } finally {
          setLoadingFinanceiro(null);
        }
      }
      setOpenMenu(null);
    },
    [companyId, isPedidosVenda, hasParcelasMap]
  );

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-60 transition-opacity" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDown size={14} className="text-white" />;
    }
    return <ArrowUp size={14} className="text-white" />;
  };

  const SortableHeader = ({
    column,
    children,
    className = '',
  }: {
    column: SortColumn;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th className={`py-2 text-left border-b border-blue-500/30 dark:border-blue-400/30 ${className}`}>
      <button
        onClick={() => onSort(column)}
        className="group relative w-full pr-5 text-left leading-tight text-xs font-bold text-white uppercase tracking-wider hover:text-blue-100 transition-colors"
      >
        <span>{children}</span>
        <span className="absolute right-0 top-1/2 -translate-y-1/2">
          {getSortIcon(column)}
        </span>
      </button>
    </th>
  );

  const allSelected = propostas.length > 0 && selectedIds.length === propostas.length;
  const hasPartialSelection = selectedIds.length > 0 && !allSelected;

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => propostas.some((proposta) => proposta.id === id)));
  }, [propostas]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = hasPartialSelection;
    }
  }, [hasPartialSelection]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const isButtonClick = Object.values(buttonRefs.current).some(
          (button) => button && button.contains(event.target as Node)
        );
        if (!isButtonClick) {
          setOpenMenu(null);
        }
      }
    };

    if (openMenu !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenu]);

  useEffect(() => {
    if (!mostraAcaoFinanceira || !companyId || propostas.length === 0) {
      setHasParcelasMap({});
      return;
    }

    const carregarParcelasRelacionadas = async () => {
      try {
        const ids = propostas.map((p) => p.id);
        const column = isPedidosVenda ? 'id_pedido_venda' : 'id_os';
        const { data } = await supabase
          .from('erp_parcelas')
          .select(column)
          .eq('id_empresa', companyId)
          .in(column, ids);

        const idsComParcelas = new Set((data || []).map((r) => (r as Record<string, string>)[column]).filter(Boolean));
        const map: Record<string, boolean> = {};
        propostas.forEach((p) => {
          map[p.id] = idsComParcelas.has(p.id);
        });
        setHasParcelasMap(map);
      } catch {
        setHasParcelasMap({});
      }
    };

    void carregarParcelasRelacionadas();
  }, [mostraAcaoFinanceira, companyId, isPedidosVenda, propostas]);

  const handleMenuClick = (propostaId: string) => {
    const button = buttonRefs.current[propostaId];
    if (button) {
      const rect = button.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpenMenu(openMenu === propostaId ? null : propostaId);
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const handleCopyLink = (propostaId: string) => {
    const tipo =
      resolvedTableType === 'pedidos_venda'
        ? 'venda'
        : resolvedTableType === 'ordens_servico'
          ? 'ordem-servico'
          : 'proposta';
    const link = `${window.location.origin}/${tipo}/${propostaId}`;
    navigator.clipboard.writeText(link);
    setOpenMenu(null);
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : propostas.map((proposta) => proposta.id));
  };

  const toggleOne = (propostaId: string) => {
    setSelectedIds((prev) =>
      prev.includes(propostaId) ? prev.filter((id) => id !== propostaId) : [...prev, propostaId]
    );
  };
  const selectedDocForMenu = openMenu ? propostas.find((p) => p.id === openMenu) : null;

  const handleGerarPdf = useCallback((documentoId: string | null) => {
    if (!documentoId || typeof window === 'undefined') return;

    const tipoPath =
      resolvedTableType === 'pedidos_venda'
        ? 'pedido-venda'
        : resolvedTableType === 'ordens_servico'
          ? 'ordem-servico'
          : 'proposta';

    window.open(`/pdf/${tipoPath}/${documentoId}`, '_blank', 'noopener,noreferrer');
    setOpenMenu(null);
  }, [resolvedTableType]);

  if (propostas.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {isPedidosVenda
          ? 'Nenhum pedido de venda encontrado'
          : isOrdemServico
            ? 'Nenhuma ordem de serviço encontrada'
            : 'Nenhuma proposta encontrada'}
      </div>
    );
  }

  return (
    <div className={`${visibilityClassName} w-full overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white dark:border-[#262626] dark:bg-black`}>
      {hiddenColumnsCss ? <style>{hiddenColumnsCss}</style> : null}
      <table className="w-full table-fixed">
        <thead className="bg-blue-600 dark:bg-blue-700">
          <tr>
            <th className="w-12 px-4 py-2 text-left border-b border-blue-500/30 dark:border-blue-400/30">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Selecionar todas"
                className="h-4 w-4 rounded border-white/35 bg-transparent accent-blue-500 focus:ring-2 focus:ring-white/40"
              />
            </th>
            <SortableHeader column="codigo" className="w-[108px] whitespace-nowrap px-5">
              Número
            </SortableHeader>
            <SortableHeader column="data" className="w-[140px] whitespace-nowrap px-5">
              Data
            </SortableHeader>
            <SortableHeader column="cliente_nome" className="px-5">Cliente</SortableHeader>
            <SortableHeader column="status" className="w-[152px] whitespace-nowrap pl-3 pr-10">
              Status
            </SortableHeader>
            {(isPedidosVenda || isOrdemServico) && (
              <th className="w-[132px] px-4 py-2 text-center border-b border-blue-500/30 dark:border-blue-400/30">
                <span className="block text-center leading-tight text-xs font-bold text-white uppercase tracking-wider">Conta</span>
              </th>
            )}
            {(isPedidosVenda || isOrdemServico) && (
              <th className="w-[136px] px-4 py-2 text-center border-b border-blue-500/30 dark:border-blue-400/30">
                <span className="block text-center leading-tight text-xs font-bold text-white uppercase tracking-wider">Estoque</span>
              </th>
            )}
            <SortableHeader column="valor_total_final" className="w-[152px] whitespace-nowrap pl-8 pr-5">
              Valor Total
            </SortableHeader>
            <th className="w-[140px] px-5 py-2 text-center border-b border-blue-500/30 dark:border-blue-400/30">
              <span className="block text-center leading-tight text-xs font-bold text-white uppercase tracking-wider">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-black divide-y divide-[#E5E7EB] dark:divide-[#262626]">
          {propostas.map((proposta) => (
            <tr key={proposta.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
              <td className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(proposta.id)}
                  onChange={() => toggleOne(proposta.id)}
                  aria-label={`Selecionar ${proposta.codigo}`}
                  className="h-4 w-4 rounded border-gray-300/70 accent-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-neutral-600/70 dark:bg-neutral-900"
                />
              </td>
              <td className="w-[108px] whitespace-nowrap px-5 py-3">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{proposta.codigo}</span>
              </td>
              <td className="w-[140px] whitespace-nowrap px-5 py-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(proposta.data_emissao)}</span>
              </td>
              <td className="min-w-0 px-5 py-3">
                <button onClick={() => onEditarProposta && onEditarProposta(proposta.id)} className="block w-full min-w-0 cursor-pointer text-left">
                  <div className="truncate text-sm font-medium text-gray-900 dark:text-white">{proposta.cliente_nome}</div>
                  {proposta.introducao && <div className="truncate text-xs text-gray-500 dark:text-gray-400">{proposta.introducao}</div>}
                </button>
              </td>
              <td className="w-[152px] whitespace-nowrap pl-3 pr-10 py-3">
                {permiteEdicaoStatus && onAlterarStatus ? (
                  <button
                    type="button"
                    onClick={() => onAlterarStatus(proposta)}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    title="Clique para alterar o status"
                  >
                    {getStatusBadge(proposta.status)}
                  </button>
                ) : (
                  getStatusBadge(proposta.status)
                )}
              </td>
              {(isPedidosVenda || isOrdemServico) && (
                <td className="w-[132px] px-4 py-3 text-center">
                  {(hasParcelasMap[proposta.id] ?? Boolean(proposta.conta_lancada)) ? (
                    <Check size={18} className="mx-auto text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <X size={18} className="mx-auto text-rose-600 dark:text-rose-400" />
                  )}
                </td>
              )}
              {(isPedidosVenda || isOrdemServico) && (
                <td className="w-[136px] px-4 py-3 text-center">
                  {proposta.estoque_lancado ? (
                    <Check size={18} className="mx-auto text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <X size={18} className="mx-auto text-rose-600 dark:text-rose-400" />
                  )}
                </td>
              )}
              <td className="w-[152px] whitespace-nowrap pl-8 pr-5 py-3">
                <span className="text-sm text-gray-900 dark:text-gray-100">{formatCurrency(proposta.valor_total_final)}</span>
              </td>
              <td className="w-[140px] px-5 py-3">
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    title="Enviar via WhatsApp"
                    aria-label="Enviar via WhatsApp"
                    onClick={() => setOpenMenu(null)}
                    className="rounded-lg p-2 text-green-600 transition-all duration-150 hover:bg-green-100 active:scale-95 dark:text-green-400 dark:hover:bg-green-500/25"
                  >
                    <MessageCircle size={17} />
                  </button>
                  {permiteAprovacaoManual && (
                    <button
                      type="button"
                      title="Aprovar manualmente"
                      aria-label="Aprovar manualmente"
                      onClick={() => onAprovarProposta && onAprovarProposta(proposta.id)}
                      className="rounded-lg p-2 text-blue-600 transition-all duration-150 hover:bg-blue-100 active:scale-95 dark:text-blue-400 dark:hover:bg-blue-500/25"
                    >
                      <CheckCircle size={17} />
                    </button>
                  )}
                  <button
                    type="button"
                    ref={(el) => {
                      buttonRefs.current[proposta.id] = el;
                    }}
                    onClick={() => handleMenuClick(proposta.id)}
                    title="Mais opções"
                    aria-label="Mais opções"
                    className={`group rounded-lg p-2 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                      openMenu === proposta.id
                        ? 'bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-500/20 dark:text-blue-300'
                        : 'text-slate-700 hover:bg-slate-200 dark:text-neutral-300 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <MoreVertical
                      size={18}
                      className={`transition-colors duration-200 ${
                        openMenu === proposta.id
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {openMenu !== null && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            right: `${menuPosition.right}px`,
            zIndex: 9999,
          }}
          className="w-56 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
        >
          {onVerCliente && openMenu && selectedDocForMenu?.id_cliente && (
            <button
              type="button"
              onClick={() => {
                onVerCliente(selectedDocForMenu.id_cliente!);
                setOpenMenu(null);
              }}
              className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors whitespace-nowrap rounded-t-lg"
            >
              <Eye size={16} className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
              <span>Ver Cliente</span>
            </button>
          )}
          {mostraAcaoFinanceira && openMenu && hasParcelasMap[openMenu] !== undefined && (
            <button
              onClick={() => handleLancarOuEstornarContas(openMenu)}
              disabled={loadingFinanceiro === openMenu}
              className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors whitespace-nowrap border-t border-gray-200 dark:border-gray-700 disabled:opacity-60"
            >
              {loadingFinanceiro === openMenu ? (
                <Loader2 size={16} className="animate-spin flex-shrink-0" />
              ) : hasParcelasMap[openMenu] ? (
                <RotateCcw size={16} className="text-rose-600 dark:text-rose-400 flex-shrink-0" />
              ) : (
                <DollarSign size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
              )}
              <span>
                {loadingFinanceiro === openMenu ? 'Processando...' : hasParcelasMap[openMenu] ? 'Estornar Contas' : 'Lançar Contas'}
              </span>
            </button>
          )}
          {(isPedidosVenda || isOrdemServico) && onAcaoEstoque && openMenu && selectedDocForMenu && (
            <button
              onClick={() => {
                onAcaoEstoque(selectedDocForMenu, isPedidosVenda ? 'pedidos_venda' : 'ordens_servico');
                setOpenMenu(null);
              }}
              className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors whitespace-nowrap border-t border-gray-200 dark:border-gray-700 ${
                selectedDocForMenu.estoque_lancado
                  ? 'text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                  : 'text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20'
              }`}
            >
              {selectedDocForMenu.estoque_lancado ? (
                <Undo2 size={16} className="flex-shrink-0" />
              ) : (
                <PackagePlus size={16} className="flex-shrink-0" />
              )}
              <span>{selectedDocForMenu.estoque_lancado ? 'Estornar Estoque' : 'Lançar Estoque'}</span>
            </button>
          )}
          <button
            onClick={() => handleGerarPdf(openMenu)}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap"
          >
            <FileText size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span>Gerar PDF</span>
          </button>
          <button
            onClick={() => {
              if (openMenu && onCopiarProposta) {
                onCopiarProposta(openMenu);
              }
              setOpenMenu(null);
            }}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap"
          >
            <CopyPlus size={16} className="text-teal-600 dark:text-teal-400 flex-shrink-0" />
            <span>Copiar</span>
          </button>
          <button
            onClick={() => {
              setOpenMenu(null);
            }}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap"
          >
            <Mail size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span>Enviar via E-mail</span>
          </button>
          <button
            onClick={() => handleCopyLink(openMenu)}
            className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap"
          >
            <Copy size={16} className="text-gray-600 dark:text-gray-400 flex-shrink-0" />
            <span>Copiar Link</span>
          </button>
          <button
            onClick={() => {
              if (openMenu && onExcluirDocumento) {
                const proposta = propostas.find((p) => p.id === openMenu);
                if (proposta) onExcluirDocumento(proposta);
              }
              setOpenMenu(null);
            }}
            className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-3 transition-colors border-t border-gray-200 dark:border-gray-700 whitespace-nowrap rounded-b-lg"
          >
            <Trash2 size={16} className="text-red-600 dark:text-red-400 flex-shrink-0" />
            <span>Excluir</span>
          </button>
        </div>
      )}
    </div>
  );
}
