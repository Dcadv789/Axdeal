import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Filter, LayoutList, List } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/lib/context/company-context';
import { toast } from 'sonner';
import { formatarNomeCliente } from './NovaPropostaPage/utils/formatters';
import SearchBar from './components/SearchBar';
import { STATUS_PROPOSTAS, STATUS_PEDIDOS_VENDA, STATUS_ORDENS_SERVICO } from './components/FilterBar';
import MultiSelectDropdown from './components/MultiSelectDropdown';
import DateRangePicker from './components/DateRangePicker';
import { normalizarStatusParaLookup } from '@/config/propostas';
import PropostasTable, { type NegociosTableColumnKey } from './components/PropostasTable';
import KanbanView from './components/KanbanView';
import ModalAlterarStatusProposta from './components/ModalAlterarStatusProposta';
import ModalConfirmarExclusao from './components/ModalConfirmarExclusao';
import ModalConfirmarMovimentoEstoque from './components/ModalConfirmarMovimentoEstoque';
import ColumnVisibilityDropdown from '@/components/ui/ColumnVisibilityDropdown';

export type NegociosTab = 'propostas' | 'pedidos_venda' | 'ordens_servico';

const TAB_TITLES: Record<NegociosTab, string> = {
  propostas: 'Propostas',
  pedidos_venda: 'Pedidos de Venda',
  ordens_servico: 'Ordem de Serviço',
};

interface Proposta {
  id: string;
  codigo: string;
  cliente_nome: string;
  status: string;
  valor_total_final: number;
  data_emissao: string;
  data_validade?: string | null;
  cobranca_recorrente?: boolean | null;
  id_cliente?: string | null;
  id_vendedor?: string | null;
  vendedor_nome?: string | null;
  id_pedido_venda_gerado?: string | null;
  id_os_gerada?: string | null;
  introducao?: string;
}

interface Venda {
  id: string;
  codigo: string;
  cliente_nome: string;
  status: string;
  valor_total_final: number;
  data_venda: string;
  total_produtos?: number | null;
  total_servicos?: number | null;
  id_cliente?: string | null;
  id_vendedor?: string | null;
  vendedor_nome?: string | null;
  id_usuario_responsavel?: string | null;
  responsavel_nome?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  observacoes_impressas?: string;
  id_proposta_origem?: string | null;
  estoque_lancado?: boolean | null;
  conta_lancada?: boolean | null;
}

interface KanbanItem {
  id: string;
  codigo: string;
  cliente_nome: string;
  status: string;
  valor_total_final: number;
  data_emissao: string;
  introducao?: string;
}

function montarCodigo(prefixo?: string | null, numero?: number | string | null): string {
  const prefixoLimpo = String(prefixo || '').trim();
  const numeroNormalizado =
    typeof numero === 'number'
      ? numero
      : Number(String(numero ?? '').replace(/\D/g, ''));

  if (!prefixoLimpo && !Number.isFinite(numeroNormalizado)) return '';
  if (!Number.isFinite(numeroNormalizado)) return prefixoLimpo;

  return `${prefixoLimpo}-${String(Math.trunc(numeroNormalizado)).padStart(4, '0')}`;
}

type SortColumn = 'codigo' | 'cliente_nome' | 'status' | 'valor_total_final' | 'data' | null;
type SortDirection = 'asc' | 'desc' | null;

interface PropostasContentProps {
  activeTab?: NegociosTab;
  onTabChange?: (tab: NegociosTab) => void;
  rightContent?: React.ReactNode;
  hideInternalHeader?: boolean;
}

let negociosCache: {
  hydrated: boolean;
  propostas: Proposta[];
  vendas: Venda[];
  ordensServico: Venda[];
} = {
  hydrated: false,
  propostas: [],
  vendas: [],
  ordensServico: [],
};

function filtrarEOrdenarNegocios<T extends { codigo: string; cliente_nome: string; status: string; valor_total_final: number }>(
  lista: T[],
  searchTerm: string,
  selectedStatus: string[],
  dataInicioFiltro: string,
  dataFimFiltro: string,
  sortColumn: SortColumn,
  sortDirection: SortDirection,
  getData: (item: T) => string,
  getTextoLivre: (item: T) => string | undefined,
  shouldSort: boolean
) {
  const termo = searchTerm.toLowerCase();
  const inicio = dataInicioFiltro ? new Date(`${dataInicioFiltro}T00:00:00`) : null;
  const fim = dataFimFiltro ? new Date(`${dataFimFiltro}T23:59:59.999`) : null;

  const filtered = lista.filter((item) => {
    const matchesSearch =
      (getTextoLivre(item) || '').toLowerCase().includes(termo) ||
      item.cliente_nome.toLowerCase().includes(termo) ||
      item.codigo.toLowerCase().includes(termo);

    const statusItem = normalizarStatusParaLookup(item.status || '');
    const matchesStatus = selectedStatus.length === 0 || selectedStatus.some((s) => normalizarStatusParaLookup(s) === statusItem);
    const dataRef = getData(item);
    const dataItem = dataRef ? new Date(dataRef) : null;
    const byDataInicio = !inicio || (dataItem && dataItem >= inicio);
    const byDataFim = !fim || (dataItem && dataItem <= fim);

    return matchesSearch && matchesStatus && byDataInicio && byDataFim;
  });

  if (!shouldSort || !sortColumn || !sortDirection) return filtered;

  return [...filtered].sort((a, b) => {
    let comparison = 0;

    switch (sortColumn) {
      case 'codigo':
        comparison = a.codigo.localeCompare(b.codigo);
        break;
      case 'cliente_nome':
        comparison = a.cliente_nome.localeCompare(b.cliente_nome);
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'valor_total_final':
        comparison = (a.valor_total_final || 0) - (b.valor_total_final || 0);
        break;
      case 'data':
        comparison = new Date(getData(a)).getTime() - new Date(getData(b)).getTime();
        break;
      default:
        comparison = 0;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });
}

type DocumentoTipoExclusao = 'proposta' | 'venda' | 'os';

const NEGOCIOS_COLUMN_LABELS: Record<NegociosTableColumnKey, string> = {
  select: 'Seleção',
  codigo: 'Número',
  data: 'Data',
  cliente: 'Cliente',
  status: 'Status',
  conta_lancada: 'Conta',
  estoque_lancado: 'Estoque',
  valor: 'Valor Total',
  acoes: 'Ações',
};

const NEGOCIOS_COLUMN_TOOLTIPS: Record<NegociosTableColumnKey, string> = {
  select: 'Seleciona linhas para ações em lote.',
  codigo: 'Identificador principal do documento.',
  data: 'Data de emissão ou criação.',
  cliente: 'Contato/cliente vinculado ao documento.',
  status: 'Situação atual no fluxo.',
  conta_lancada: 'Indica se já existem contas/parcelas lançadas no financeiro.',
  estoque_lancado: 'Indica se o estoque já foi movimentado.',
  valor: 'Valor total final do documento.',
  acoes: 'Ações rápidas disponíveis para a linha.',
};

const NEGOCIOS_TOGGLEABLE_COLUMNS_BASE: NegociosTableColumnKey[] = ['codigo', 'data', 'cliente', 'status', 'valor', 'acoes'];
const NEGOCIOS_TOGGLEABLE_COLUMNS_VENDA_OS: NegociosTableColumnKey[] = [
  'codigo',
  'data',
  'cliente',
  'status',
  'conta_lancada',
  'estoque_lancado',
  'valor',
  'acoes',
];

function defaultNegociosColumns(): Record<NegociosTableColumnKey, boolean> {
  return {
    select: true,
    codigo: true,
    data: true,
    cliente: true,
    status: true,
    conta_lancada: false,
    estoque_lancado: false,
    valor: true,
    acoes: true,
  };
}

export default function PropostasContent({
  activeTab: activeTabProp,
  onTabChange,
  rightContent,
  hideInternalHeader = false,
}: PropostasContentProps = {}) {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const router = useRouter();
  const [activeTabInternal, setActiveTabInternal] = useState<NegociosTab>('propostas');
  const activeTab = activeTabProp ?? activeTabInternal;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<'list' | 'kanban'>('list');
  const [dataInicioFiltro, setDataInicioFiltro] = useState('');
  const [dataFimFiltro, setDataFimFiltro] = useState('');
  const [openBuscasAvancadas, setOpenBuscasAvancadas] = useState(false);
  const [filtroContaLancada, setFiltroContaLancada] = useState<'todos' | 'sim' | 'nao'>('todos');
  const [filtroEstoqueLancado, setFiltroEstoqueLancado] = useState<'todos' | 'sim' | 'nao'>('todos');
  const [searchTermAplicado, setSearchTermAplicado] = useState('');
  const [selectedStatusAplicado, setSelectedStatusAplicado] = useState<string[]>([]);
  const [dataInicioFiltroAplicado, setDataInicioFiltroAplicado] = useState('');
  const [dataFimFiltroAplicado, setDataFimFiltroAplicado] = useState('');
  const [filtroContaLancadaAplicado, setFiltroContaLancadaAplicado] = useState<'todos' | 'sim' | 'nao'>('todos');
  const [filtroEstoqueLancadoAplicado, setFiltroEstoqueLancadoAplicado] = useState<'todos' | 'sim' | 'nao'>('todos');
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [visibleColumnsByTab, setVisibleColumnsByTab] = useState<
    Record<NegociosTab, Record<NegociosTableColumnKey, boolean>>
  >({
    propostas: defaultNegociosColumns(),
    pedidos_venda: defaultNegociosColumns(),
    ordens_servico: defaultNegociosColumns(),
  });

  const [propostas, setPropostas] = useState<Proposta[]>(() => negociosCache.propostas);
  const [vendas, setVendas] = useState<Venda[]>(() => negociosCache.vendas);
  const [ordensServico, setOrdensServico] = useState<Venda[]>(() => negociosCache.ordensServico);
  const [loading, setLoading] = useState(() => !negociosCache.hydrated);
  const [movimentoEstoquePendente, setMovimentoEstoquePendente] = useState<{
    id: string;
    codigo: string;
    tipoTabela: 'pedidos_venda' | 'ordens_servico';
    operacao: 'LANCAR' | 'ESTORNAR';
  } | null>(null);
  const [executandoMovimentoEstoque, setExecutandoMovimentoEstoque] = useState(false);
  const colunasStorageKey = useMemo(
    () => `erp.negocios.colunas.${user?.id || companyId || 'default'}`,
    [user?.id, companyId]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(colunasStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Record<NegociosTab, Partial<Record<NegociosTableColumnKey, boolean>>>>;
      setVisibleColumnsByTab({
        propostas: { ...defaultNegociosColumns(), ...(parsed.propostas || {}) },
        pedidos_venda: { ...defaultNegociosColumns(), ...(parsed.pedidos_venda || {}) },
        ordens_servico: { ...defaultNegociosColumns(), ...(parsed.ordens_servico || {}) },
      });
    } catch (error) {
      console.error('Erro ao carregar preferencias de colunas de negócios:', error);
    }
  }, [colunasStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(colunasStorageKey, JSON.stringify(visibleColumnsByTab));
  }, [colunasStorageKey, visibleColumnsByTab]);

  const handleTabChange = (tab: NegociosTab) => {
    setActiveTabInternal(tab);
    onTabChange?.(tab);
  };

  const handleAprovarDocumento = async (documentoId: string, tipo: 'proposta' | 'venda' | 'os') => {
    try {
      const tabela =
        tipo === 'proposta' ? 'erp_propostas' : tipo === 'venda' ? 'erp_pedidos_venda' : 'erp_os';
      const statusAprovado =
        tipo === 'proposta' ? 'APROVADA' : tipo === 'venda' ? 'ATENDIDO' : 'CONCLUIDO';

      const { error } = await supabase
        .from(tabela)
        .update({ status: statusAprovado })
        .eq('id', documentoId);

      if (error) throw error;

      if (tipo === 'proposta') {
        setPropostas((prev) =>
          prev.map((p) => (p.id === documentoId ? { ...p, status: statusAprovado } : p))
        );
        negociosCache.propostas = negociosCache.propostas.map((p) =>
          p.id === documentoId ? { ...p, status: statusAprovado } : p
        );
      } else if (tipo === 'venda') {
        setVendas((prev) =>
          prev.map((v) => (v.id === documentoId ? { ...v, status: statusAprovado } : v))
        );
        negociosCache.vendas = negociosCache.vendas.map((v) =>
          v.id === documentoId ? { ...v, status: statusAprovado } : v
        );
      } else {
        setOrdensServico((prev) =>
          prev.map((o) => (o.id === documentoId ? { ...o, status: statusAprovado } : o))
        );
        negociosCache.ordensServico = negociosCache.ordensServico.map((o) =>
          o.id === documentoId ? { ...o, status: statusAprovado } : o
        );
      }

      const nomeDocumento =
        tipo === 'proposta' ? 'Proposta' : tipo === 'venda' ? 'Pedido de venda' : 'Ordem de servico';
      toast.success(`${nomeDocumento} aprovado com sucesso.`);
    } catch (e) {
      console.error('Erro ao aprovar documento:', e);
      const nomeDocumento =
        tipo === 'proposta' ? 'proposta' : tipo === 'venda' ? 'pedido de venda' : 'ordem de servico';
      toast.error(`Nao foi possivel aprovar ${nomeDocumento}.`);
    }
  };

  const handleAprovarProposta = (propostaId: string) => handleAprovarDocumento(propostaId, 'proposta');
  const handleAprovarVenda = (vendaId: string) => handleAprovarDocumento(vendaId, 'venda');
  const handleAprovarOS = (osId: string) => handleAprovarDocumento(osId, 'os');

  const [propostaParaAlterarStatus, setPropostaParaAlterarStatus] = useState<Proposta | null>(null);
  const [documentoParaExcluir, setDocumentoParaExcluir] = useState<{
    id: string;
    codigo: string;
    tipo: DocumentoTipoExclusao;
  } | null>(null);

  const statusParaDb = (v: string) => normalizarStatusParaLookup(v);

  const handleSolicitarExclusao = (proposta: { id: string; codigo: string }, tipo: DocumentoTipoExclusao) => {
    setDocumentoParaExcluir({ id: proposta.id, codigo: proposta.codigo, tipo });
  };

  const handleConfirmarExclusao = async () => {
    if (!documentoParaExcluir) return;
    if (!companyId) {
      toast.error('Empresa não identificada. Faça login novamente.');
      throw new Error('companyId ausente');
    }

    const { id, tipo } = documentoParaExcluir;
    try {
      if (tipo === 'proposta') {
        const { error } = await supabase
          .from('erp_propostas')
          .delete()
          .eq('id', id)
          .eq('id_empresa', companyId);

        if (error) throw error;
        setPropostas((prev) => prev.filter((p) => p.id !== id));
        negociosCache.propostas = negociosCache.propostas.filter((p) => p.id !== id);
      } else if (tipo === 'venda') {
        const { error } = await supabase
          .from('erp_pedidos_venda')
          .delete()
          .eq('id', id)
          .eq('id_empresa', companyId);

        if (error) throw error;
        setVendas((prev) => prev.filter((v) => v.id !== id));
        negociosCache.vendas = negociosCache.vendas.filter((v) => v.id !== id);
      } else {
        const { error } = await supabase
          .from('erp_os')
          .delete()
          .eq('id', id)
          .eq('id_empresa', companyId);

        if (error) throw error;
        setOrdensServico((prev) => prev.filter((o) => o.id !== id));
        negociosCache.ordensServico = negociosCache.ordensServico.filter((o) => o.id !== id);
      }
      toast.success('Documento excluído com sucesso.');
    } catch (e) {
      console.error('Erro ao excluir:', e);
      toast.error('Erro ao excluir. Tente novamente.');
      throw e;
    }
  };

  const handleSalvarAlteracaoStatus = async (
    propostaId: string,
    novoStatus: string,
    observacao: string,
    dataStatus: string
  ) => {
    try {
      if (!companyId) {
        throw new Error('companyId ausente ao salvar alteração de status');
      }

      const statusDb = statusParaDb(novoStatus);
      const tabelaDocumento =
        activeTab === 'pedidos_venda' ? 'erp_pedidos_venda' : activeTab === 'ordens_servico' ? 'erp_os' : 'erp_propostas';
      const selectRetornoStatus =
        activeTab === 'propostas'
          ? 'id, status, data_status_manual, observacao_status_manual'
          : 'id, status, data_status_manual, observacao_status_manual, estoque_lancado';

      const payload: Record<string, string | null> = {
        status: statusDb,
        data_status_manual: dataStatus || null,
        observacao_status_manual: observacao?.trim() || null,
      };

      const { data: updatedRows, error } = await supabase
        .from(tabelaDocumento)
        .update(payload)
        .eq('id', propostaId)
        .eq('id_empresa', companyId)
        .select(selectRetornoStatus);

      if (error) throw error;
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error(`Nenhum registro atualizado em ${tabelaDocumento} para o id ${propostaId}`);
      }

      if (activeTab === 'propostas') {
        setPropostas((prev) =>
          prev.map((p) => (p.id === propostaId ? { ...p, status: statusDb } : p))
        );
        negociosCache.propostas = negociosCache.propostas.map((p) =>
          p.id === propostaId ? { ...p, status: statusDb } : p
        );
      } else if (activeTab === 'pedidos_venda') {
        const estoqueLancadoAtualizado = Boolean((updatedRows[0] as { estoque_lancado?: boolean | null }).estoque_lancado);
        setVendas((prev) =>
          prev.map((v) =>
            v.id === propostaId ? { ...v, status: statusDb, estoque_lancado: estoqueLancadoAtualizado } : v
          )
        );
        negociosCache.vendas = negociosCache.vendas.map((v) =>
          v.id === propostaId ? { ...v, status: statusDb, estoque_lancado: estoqueLancadoAtualizado } : v
        );
      } else {
        const estoqueLancadoAtualizado = Boolean((updatedRows[0] as { estoque_lancado?: boolean | null }).estoque_lancado);
        setOrdensServico((prev) =>
          prev.map((o) =>
            o.id === propostaId ? { ...o, status: statusDb, estoque_lancado: estoqueLancadoAtualizado } : o
          )
        );
        negociosCache.ordensServico = negociosCache.ordensServico.map((o) =>
          o.id === propostaId ? { ...o, status: statusDb, estoque_lancado: estoqueLancadoAtualizado } : o
        );
      }

      // Recarrega para sincronizar cenários com automações (ex.: lançamento automático de estoque por status)
      await fetchData();

      setPropostaParaAlterarStatus(null);
    } catch (e) {
      console.error('Erro ao alterar status:', e);
      throw e;
    }
  };

  useEffect(() => {
    if (activeTabProp !== undefined) {
      setActiveTabInternal(activeTabProp);
    }
  }, [activeTabProp]);

  const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      if (!negociosCache.hydrated) {
        setLoading(true);
      }

      try {
        const { data: membroData, error: membroError } = await supabase
          .from('sis_membros_equipe')
          .select('id_empresa')
          .eq('id_usuario', user.id)
          .maybeSingle();

        if (membroError || !membroData) {
          console.error('Erro ao buscar empresa do usuario:', membroError);
          setLoading(false);
          return;
        }

        const idEmpresa = membroData.id_empresa;

        const [resPropostas, resVendas, resOs] = await Promise.all([
          supabase
            .from('erp_propostas')
            .select(
              `
              id,
              codigo_prefixo,
              codigo_numero,
              status,
              data_emissao,
              data_validade,
              valor_total_final,
              cobranca_recorrente,
              id_cliente,
              id_vendedor,
              id_pedido_venda_gerado,
              id_os_gerada,
              descricao,
              introducao,
              erp_contatos!erp_propostas_id_cliente_fkey(nome_razao_social, nome_fantasia),
              erp_vendedores(nome_completo)
            `
            )
            .eq('id_empresa', idEmpresa)
            .order('criado_em', { ascending: false }),
          supabase
            .from('erp_pedidos_venda')
            .select(
              `id, codigo_prefixo, codigo_numero, status, data_venda, total_produtos, total_servicos, valor_total_final, id_contato, id_vendedor, id_proposta_origem, estoque_lancado`
            )
            .eq('id_empresa', idEmpresa)
            .order('criado_em', { ascending: false }),
          supabase
            .from('erp_os')
            .select(
              `
              id,
              codigo_prefixo,
              codigo_numero,
              status,
              data_emissao,
              data_inicio,
              data_fim,
              valor_total,
              id_contato,
              id_usuario_responsavel,
              id_proposta_origem,
              estoque_lancado
            `
            )
            .eq('id_empresa', idEmpresa)
            .order('criado_em', { ascending: false }),
        ]);

        const vendasRaw = (resVendas.data || []) as any[];
        const osRaw = (resOs.data || []) as any[];
        const idsVendas = vendasRaw.map((v) => v.id).filter(Boolean) as string[];
        const idsOs = osRaw.map((os) => os.id).filter(Boolean) as string[];
        const idsContatos = Array.from(
          new Set([...vendasRaw.map((v) => v.id_contato), ...osRaw.map((os) => os.id_contato)].filter(Boolean))
        ) as string[];

        let mapaContatos = new Map<string, { nome_razao_social?: string | null; nome_fantasia?: string | null }>();
        if (idsContatos.length > 0) {
          const { data: contatosData, error: contatosError } = await supabase
            .from('erp_contatos')
            .select('id, nome_razao_social, nome_fantasia')
            .in('id', idsContatos);

          if (contatosError) {
            console.error('Erro ao buscar contatos de vendas/OS:', contatosError);
          } else {
            mapaContatos = new Map(
              ((contatosData || []) as any[]).map((contato) => [
                contato.id,
                { nome_razao_social: contato.nome_razao_social, nome_fantasia: contato.nome_fantasia },
              ])
            );
          }
        }

        let idsComContaLancadaVenda = new Set<string>();
        let idsComContaLancadaOS = new Set<string>();
        const [parcelasVendaRes, parcelasOSRes] = await Promise.all([
          idsVendas.length
            ? supabase
                .from('erp_parcelas')
                .select('id_pedido_venda')
                .eq('id_empresa', idEmpresa)
                .in('id_pedido_venda', idsVendas)
            : Promise.resolve({ data: [], error: null }),
          idsOs.length
            ? supabase
                .from('erp_parcelas')
                .select('id_os')
                .eq('id_empresa', idEmpresa)
                .in('id_os', idsOs)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (parcelasVendaRes.error) {
          console.error('Erro ao buscar parcelas de pedidos de venda:', parcelasVendaRes.error);
        } else {
          idsComContaLancadaVenda = new Set(
            ((parcelasVendaRes.data || []) as Array<{ id_pedido_venda?: string | null }>)
              .map((item) => item.id_pedido_venda)
              .filter(Boolean) as string[]
          );
        }

        if (parcelasOSRes.error) {
          console.error('Erro ao buscar parcelas de ordens de serviÃ§o:', parcelasOSRes.error);
        } else {
          idsComContaLancadaOS = new Set(
            ((parcelasOSRes.data || []) as Array<{ id_os?: string | null }>)
              .map((item) => item.id_os)
              .filter(Boolean) as string[]
          );
        }

        if (resPropostas.error) {
          console.error('Erro ao buscar propostas:', resPropostas.error);
          setPropostas([]);
        } else {
          const propostasFormatadas = ((resPropostas.data || []) as any[]).map((p) => {
            const contato = p.erp_contatos;
            const clienteNome = formatarNomeCliente(contato);
            return {
              id: p.id,
              codigo: montarCodigo(p.codigo_prefixo, p.codigo_numero),
              cliente_nome: clienteNome,
              status: (p.status || '').trim(),
              valor_total_final: p.valor_total_final,
              data_emissao: p.data_emissao,
              data_validade: p.data_validade,
              cobranca_recorrente: p.cobranca_recorrente,
              id_cliente: p.id_cliente,
              id_vendedor: p.id_vendedor,
              vendedor_nome: p.erp_vendedores?.nome_completo || null,
              id_pedido_venda_gerado: p.id_pedido_venda_gerado,
              id_os_gerada: p.id_os_gerada,
              introducao: p.descricao || p.introducao,
            };
          });
          setPropostas(propostasFormatadas);
          negociosCache.propostas = propostasFormatadas;
        }

        let vendasFormatadas: Venda[] = [];
        if (resVendas.error) {
          console.error('Erro ao buscar vendas:', resVendas.error);
          setVendas([]);
        } else {
          vendasFormatadas = vendasRaw.map((v) => {
            const contato = mapaContatos.get(v.id_contato) || null;
            const clienteNome = formatarNomeCliente(contato);
            return {
              id: v.id,
              codigo: montarCodigo(v.codigo_prefixo, v.codigo_numero),
              cliente_nome: clienteNome,
              status: (v.status || '').trim(),
              valor_total_final: v.valor_total_final,
              data_venda: v.data_venda,
              total_produtos: v.total_produtos,
              total_servicos: v.total_servicos,
              id_cliente: v.id_contato,
              id_vendedor: v.id_vendedor,
              vendedor_nome: v.erp_vendedores?.nome_completo || null,
              observacoes_impressas: v.observacoes_impressas,
              id_proposta_origem: v.id_proposta_origem,
              estoque_lancado: Boolean(v.estoque_lancado),
              conta_lancada: idsComContaLancadaVenda.has(v.id),
            };
          });
          setVendas(vendasFormatadas);
          negociosCache.vendas = vendasFormatadas;
        }

        if (resOs.error) {
          console.error('Erro ao buscar ordens de serviço:', resOs.error);
          setOrdensServico([]);
        } else {
          const osFormatadas = osRaw.map((os) => {
            const contato = mapaContatos.get(os.id_contato) || null;
            const clienteNome = formatarNomeCliente(contato);
            return {
              id: os.id,
              codigo: montarCodigo(os.codigo_prefixo, os.codigo_numero),
              cliente_nome: clienteNome,
              status: (os.status || '').trim(),
              valor_total_final: Number(os.valor_total || 0),
              data_venda: os.data_emissao,
              data_inicio: os.data_inicio,
              data_fim: os.data_fim,
              id_cliente: os.id_contato,
              id_usuario_responsavel: os.id_usuario_responsavel,
              observacoes_impressas: undefined,
              id_proposta_origem: os.id_proposta_origem,
              estoque_lancado: Boolean(os.estoque_lancado),
              conta_lancada: idsComContaLancadaOS.has(os.id),
            };
          });
          setOrdensServico(osFormatadas);
          negociosCache.ordensServico = osFormatadas;
        }

        negociosCache.hydrated = true;
      } catch (error) {
        console.error('Erro ao carregar dados de negocios:', error);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    void fetchData();
  }, [user]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const aplicarFiltros = () => {
    setSearchTermAplicado(searchTerm);
    setSelectedStatusAplicado(selectedStatus);
    setDataInicioFiltroAplicado(dataInicioFiltro);
    setDataFimFiltroAplicado(dataFimFiltro);
    setFiltroContaLancadaAplicado(filtroContaLancada);
    setFiltroEstoqueLancadoAplicado(filtroEstoqueLancado);
  };

  const limparFiltros = () => {
    setSearchTerm('');
    setSelectedStatus([]);
    setDataInicioFiltro('');
    setDataFimFiltro('');
    setFiltroContaLancada('todos');
    setFiltroEstoqueLancado('todos');

    setSearchTermAplicado('');
    setSelectedStatusAplicado([]);
    setDataInicioFiltroAplicado('');
    setDataFimFiltroAplicado('');
    setFiltroContaLancadaAplicado('todos');
    setFiltroEstoqueLancadoAplicado('todos');
  };

  const aplicarFiltrosLancamento = (lista: Venda[]) =>
    lista.filter((item) => {
      const contaOk =
        filtroContaLancadaAplicado === 'todos' ||
        (filtroContaLancadaAplicado === 'sim' ? Boolean(item.conta_lancada) : !Boolean(item.conta_lancada));
      const estoqueOk =
        filtroEstoqueLancadoAplicado === 'todos' ||
        (filtroEstoqueLancadoAplicado === 'sim' ? Boolean(item.estoque_lancado) : !Boolean(item.estoque_lancado));
      return contaOk && estoqueOk;
    });

  const filteredPropostas = useMemo(
    () =>
      filtrarEOrdenarNegocios(
        propostas,
        searchTermAplicado,
        selectedStatusAplicado,
        dataInicioFiltroAplicado,
        dataFimFiltroAplicado,
        sortColumn,
        sortDirection,
        (p) => p.data_emissao,
        (p) => p.introducao,
        currentView === 'list'
      ),
    [
      propostas,
      searchTermAplicado,
      selectedStatusAplicado,
      dataInicioFiltroAplicado,
      dataFimFiltroAplicado,
      sortColumn,
      sortDirection,
      currentView,
    ]
  );

  const filteredVendas = useMemo(
    () =>
      aplicarFiltrosLancamento(
        filtrarEOrdenarNegocios(
          vendas,
          searchTermAplicado,
          selectedStatusAplicado,
          dataInicioFiltroAplicado,
          dataFimFiltroAplicado,
          sortColumn,
          sortDirection,
          (v) => v.data_venda,
          (v) => v.observacoes_impressas,
          true
        )
      ),
    [
      vendas,
      searchTermAplicado,
      selectedStatusAplicado,
      dataInicioFiltroAplicado,
      dataFimFiltroAplicado,
      sortColumn,
      sortDirection,
      filtroContaLancadaAplicado,
      filtroEstoqueLancadoAplicado,
    ]
  );

  const filteredOrdensServico = useMemo(
    () =>
      aplicarFiltrosLancamento(
        filtrarEOrdenarNegocios(
          ordensServico,
          searchTermAplicado,
          selectedStatusAplicado,
          dataInicioFiltroAplicado,
          dataFimFiltroAplicado,
          sortColumn,
          sortDirection,
          (v) => v.data_venda,
          (v) => v.observacoes_impressas,
          true
        )
      ),
    [
      ordensServico,
      searchTermAplicado,
      selectedStatusAplicado,
      dataInicioFiltroAplicado,
      dataFimFiltroAplicado,
      sortColumn,
      sortDirection,
      filtroContaLancadaAplicado,
      filtroEstoqueLancadoAplicado,
    ]
  );

  const placeholderBusca =
    activeTab === 'propostas'
      ? 'Buscar por cliente ou nome da proposta...'
      : activeTab === 'pedidos_venda'
        ? 'Buscar por cliente, venda ou observação...'
        : 'Buscar por cliente, ordem de serviço ou observação...';

  const statusOptionsAtivos =
    activeTab === 'pedidos_venda'
      ? STATUS_PEDIDOS_VENDA
      : activeTab === 'ordens_servico'
        ? STATUS_ORDENS_SERVICO
        : STATUS_PROPOSTAS;
  const colunasAtivas =
    activeTab === 'pedidos_venda' || activeTab === 'ordens_servico'
      ? NEGOCIOS_TOGGLEABLE_COLUMNS_VENDA_OS
      : NEGOCIOS_TOGGLEABLE_COLUMNS_BASE;

  const toKanbanItem = (v: Venda): KanbanItem => ({
    id: v.id,
    codigo: v.codigo,
    cliente_nome: v.cliente_nome,
    status: v.status,
    valor_total_final: v.valor_total_final,
    data_emissao: v.data_venda,
    introducao: v.observacoes_impressas,
  });

  const renderTabelaNegocios = (lista: Venda[], tableType: 'pedidos_venda' | 'ordens_servico') => {
    const basePath = tableType === 'pedidos_venda' ? '/erp/negocios/pedidos_venda' : '/erp/negocios/ordens_servico';
    const tipo: DocumentoTipoExclusao = tableType === 'pedidos_venda' ? 'venda' : 'os';
    return (
      <PropostasTable
        propostas={lista.map((v) => ({
          id: v.id,
          codigo: v.codigo,
          cliente_nome: v.cliente_nome,
          status: v.status,
          valor_total_final: v.valor_total_final,
          data_emissao: v.data_venda,
          introducao: v.observacoes_impressas,
          estoque_lancado: v.estoque_lancado,
          conta_lancada: v.conta_lancada,
        }))}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        isVendas={tableType === 'pedidos_venda'}
        tableType={tableType}
        onEditarProposta={(id) => router.push(`${basePath}/${id}/editar`)}
        onCopiarProposta={(id) => router.push(`${basePath}/${id}/copiar`)}
        onExcluirDocumento={(p) => handleSolicitarExclusao(p, tipo)}
        onAprovarProposta={tableType === 'pedidos_venda' ? handleAprovarVenda : handleAprovarOS}
        onAlterarStatus={(p) => setPropostaParaAlterarStatus(p)}
        onAcaoEstoque={(p, tabela) =>
          setMovimentoEstoquePendente({
            id: p.id,
            codigo: p.codigo,
            tipoTabela: tabela,
            operacao: p.estoque_lancado ? 'ESTORNAR' : 'LANCAR',
          })
        }
        permiteEdicaoStatus
        visibleColumns={visibleColumnsByTab[tableType]}
      />
    );
  };

  const confirmarMovimentoEstoque = async () => {
    if (!movimentoEstoquePendente) return;

    setExecutandoMovimentoEstoque(true);
    try {
      const { error } = await supabase.rpc('erp_rpc_movimentar_estoque', {
        p_tipo: movimentoEstoquePendente.tipoTabela === 'pedidos_venda' ? 'VENDA' : 'OS',
        p_id: movimentoEstoquePendente.id,
        p_operacao: movimentoEstoquePendente.operacao,
      });

      if (error) throw error;

      toast.success(
        movimentoEstoquePendente.operacao === 'ESTORNAR'
          ? 'Estoque estornado com sucesso.'
          : 'Estoque lançado com sucesso.'
      );

      await fetchData();
      setMovimentoEstoquePendente(null);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Erro ao movimentar estoque.';
      toast.error(message);
    } finally {
      setExecutandoMovimentoEstoque(false);
    }
  };

  return (
    <div className={hideInternalHeader ? 'pt-0 pb-6 space-y-6' : 'py-6 space-y-6'}>
      {!hideInternalHeader && (
      <div className="relative space-y-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{`Negócios > ${TAB_TITLES[activeTab]}`}</h1>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-6 -mb-px overflow-x-auto">
            <button
              onClick={() => handleTabChange('propostas')}
              className={`relative pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'propostas'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Propostas
              {activeTab === 'propostas' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
            </button>
            <button
              onClick={() => handleTabChange('pedidos_venda')}
              className={`relative pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'pedidos_venda'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Pedidos de Vendas
              {activeTab === 'pedidos_venda' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
            </button>
            <button
              onClick={() => handleTabChange('ordens_servico')}
              className={`relative pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'ordens_servico'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Ordem de Serviço
              {activeTab === 'ordens_servico' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
            </button>
          </nav>
        </div>

        {rightContent && <div className="absolute right-0 top-[10%] -translate-y-1/2">{rightContent}</div>}
      </div>
      )}

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 dark:border-[#262626] dark:bg-black">
        <div className="space-y-2.5">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Filter size={14} />
                  <span>Data</span>
                </div>
                <DateRangePicker
                  dataInicio={dataInicioFiltro}
                  dataFim={dataFimFiltro}
                  onChange={(inicio, fim) => {
                    setDataInicioFiltro(inicio);
                    setDataFimFiltro(fim);
                  }}
                  className="w-[230px]"
                  buttonClassName="min-w-[230px] !rounded-xl !border-blue-200 dark:!border-blue-500/35"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Filter size={14} />
                  <span>Status</span>
                </div>
                <MultiSelectDropdown
                  options={statusOptionsAtivos}
                  selectedValues={selectedStatus}
                  onChange={setSelectedStatus}
                  placeholder="Status"
                  buttonClassName="h-10 min-w-[260px] !rounded-xl !border-blue-200 dark:!border-blue-500/35 !bg-white dark:!bg-neutral-900 hover:!border-blue-400 dark:hover:!border-blue-400/50 focus:!ring-blue-200 dark:focus:!ring-blue-500/30 !text-slate-700 dark:!text-slate-100"
                  menuClassName="!rounded-2xl !border-slate-200 dark:!border-neutral-700 !bg-white dark:!bg-neutral-900"
                  menuContentClassName="max-h-[420px]"
                />
              </div>

              <ColumnVisibilityDropdown
                options={colunasAtivas.map((columnKey) => ({
                  key: columnKey,
                  label: NEGOCIOS_COLUMN_LABELS[columnKey],
                  tooltip: NEGOCIOS_COLUMN_TOOLTIPS[columnKey],
                }))}
                values={visibleColumnsByTab[activeTab]}
                onToggle={(columnKey, checked) =>
                  setVisibleColumnsByTab((prev) => ({
                    ...prev,
                    [activeTab]: { ...prev[activeTab], [columnKey]: checked },
                  }))
                }
              />

              <button
                type="button"
                onClick={() => setOpenBuscasAvancadas((prev) => !prev)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
              >
                Filtros Avançados
                <ChevronDown size={16} className={`transition-transform ${openBuscasAvancadas ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <div className="flex items-center gap-2 border-l border-gray-300 pl-4 dark:border-gray-600">
              <span className="text-sm text-gray-600 dark:text-gray-400">Visualização:</span>
              <button
                type="button"
                onClick={() => setCurrentView('list')}
                className={`p-2 rounded-lg transition-colors ${
                  currentView === 'list'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800'
                }`}
                title="Visualização em tabela"
              >
                <List size={18} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('kanban')}
                className={`p-2 rounded-lg transition-colors ${
                  currentView === 'kanban'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800'
                }`}
                title="Visualização em kanban"
              >
                <LayoutList size={18} />
              </button>
            </div>
          </div>

          <div
            className={`grid overflow-hidden transition-all duration-300 ease-out ${
              openBuscasAvancadas ? 'mt-0 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className={`min-h-0 transform transition-all duration-300 ease-out ${openBuscasAvancadas ? 'translate-y-0' : '-translate-y-1'}`}>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-300">
                  Filtros avançados
                </div>
                {activeTab === 'pedidos_venda' || activeTab === 'ordens_servico' ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Conta Lançada
                      </label>
                      <select
                        value={filtroContaLancada}
                        onChange={(event) => setFiltroContaLancada(event.target.value as 'todos' | 'sim' | 'nao')}
                        className="h-10 w-full rounded-xl border border-blue-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100 dark:focus:ring-blue-500/30"
                      >
                        <option value="todos">Todos</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Estoque Lançado
                      </label>
                      <select
                        value={filtroEstoqueLancado}
                        onChange={(event) => setFiltroEstoqueLancado(event.target.value as 'todos' | 'sim' | 'nao')}
                        className="h-10 w-full rounded-xl border border-blue-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100 dark:focus:ring-blue-500/30"
                      >
                        <option value="todos">Todos</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                    Você pode combinar este modo com os filtros de Data, Status, Colunas e Busca para refinar a listagem.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={placeholderBusca}
              className="flex-1"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  aplicarFiltros();
                }
              }}
            />
            <button
              type="button"
              onClick={aplicarFiltros}
              className="h-10 shrink-0 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={limparFiltros}
              className="h-10 shrink-0 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-neutral-700 dark:text-slate-200 dark:hover:bg-neutral-800"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white py-12 text-center text-gray-500 dark:border-[#262626] dark:bg-black dark:text-gray-400">
          Carregando...
        </div>
      ) : (
        <>
          {activeTab === 'propostas' && currentView === 'list' && (
            <PropostasTable
              propostas={filteredPropostas}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              onEditarProposta={(id) => router.push(`/erp/negocios/propostas/${id}/editar`)}
              onCopiarProposta={(id) => router.push(`/erp/negocios/propostas/${id}/copiar`)}
              onExcluirDocumento={(p) => handleSolicitarExclusao(p, 'proposta')}
              onAprovarProposta={handleAprovarProposta}
              onAlterarStatus={(p) => setPropostaParaAlterarStatus(p)}
              permiteEdicaoStatus
              visibleColumns={visibleColumnsByTab.propostas}
            />
          )}
          {activeTab === 'propostas' && currentView === 'kanban' && (
            <KanbanView
              propostas={filteredPropostas}
              statusOptions={statusOptionsAtivos}
              onEditarProposta={(id) => router.push(`/erp/negocios/propostas/${id}/editar`)}
              onCopiarProposta={(id) => router.push(`/erp/negocios/propostas/${id}/copiar`)}
              onExcluirDocumento={(p) => handleSolicitarExclusao(p, 'proposta')}
              onAprovarProposta={handleAprovarProposta}
              onAlterarStatus={(p) => setPropostaParaAlterarStatus(p)}
              permiteEdicaoStatus
            />
          )}

          {activeTab === 'pedidos_venda' &&
            (currentView === 'kanban' ? (
              <KanbanView
                propostas={filteredVendas.map(toKanbanItem)}
                statusOptions={statusOptionsAtivos}
                onEditarProposta={(id) => router.push(`/erp/negocios/pedidos_venda/${id}/editar`)}
                onCopiarProposta={(id) => router.push(`/erp/negocios/pedidos_venda/${id}/copiar`)}
                onExcluirDocumento={(p) => handleSolicitarExclusao(p, 'venda')}
                onAprovarProposta={handleAprovarVenda}
                onAlterarStatus={(p) => setPropostaParaAlterarStatus(p)}
                permiteEdicaoStatus
              />
            ) : (
              renderTabelaNegocios(filteredVendas, 'pedidos_venda')
            ))}
          {activeTab === 'ordens_servico' &&
            (currentView === 'kanban' ? (
              <KanbanView
                propostas={filteredOrdensServico.map(toKanbanItem)}
                statusOptions={statusOptionsAtivos}
                onEditarProposta={(id) => router.push(`/erp/negocios/ordens_servico/${id}/editar`)}
                onCopiarProposta={(id) => router.push(`/erp/negocios/ordens_servico/${id}/copiar`)}
                onExcluirDocumento={(p) => handleSolicitarExclusao(p, 'os')}
                onAprovarProposta={handleAprovarOS}
                onAlterarStatus={(p) => setPropostaParaAlterarStatus(p)}
                permiteEdicaoStatus
              />
            ) : (
              renderTabelaNegocios(filteredOrdensServico, 'ordens_servico')
            ))}
        </>
      )}

      <ModalAlterarStatusProposta
        isOpen={!!propostaParaAlterarStatus}
        proposta={propostaParaAlterarStatus}
        tipoDocumento={activeTab === 'pedidos_venda' ? 'venda' : activeTab === 'ordens_servico' ? 'os' : 'proposta'}
        idEmpresa={companyId}
        onClose={() => setPropostaParaAlterarStatus(null)}
        onSalvar={handleSalvarAlteracaoStatus}
      />

      <ModalConfirmarExclusao
        isOpen={!!documentoParaExcluir}
        documento={documentoParaExcluir}
        onClose={() => setDocumentoParaExcluir(null)}
        onConfirmar={handleConfirmarExclusao}
      />
      <ModalConfirmarMovimentoEstoque
        isOpen={!!movimentoEstoquePendente}
        operacao={movimentoEstoquePendente?.operacao || 'LANCAR'}
        documentoLabel={movimentoEstoquePendente?.tipoTabela === 'ordens_servico' ? 'Ordem de Serviço' : 'Pedido de Venda'}
        codigoDocumento={movimentoEstoquePendente?.codigo}
        loading={executandoMovimentoEstoque}
        onClose={() => !executandoMovimentoEstoque && setMovimentoEstoquePendente(null)}
        onConfirm={confirmarMovimentoEstoque}
      />
    </div>
  );
}
