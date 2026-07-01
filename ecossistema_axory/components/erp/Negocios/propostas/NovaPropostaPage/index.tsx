/**
 * NovaPropostaPage - Vers?o Refatorada
 * 
 * Este componente foi refatorado para melhorar:
 * - Organiza??o do c?digo
 * - Reutiliza??o de l?gica atrav?s de hooks
 * - Separa??o de responsabilidades
 * - Manutenibilidade
 * 
 * Estrutura:
 * - types/ - Interfaces e tipos TypeScript
 * - utils/ - Fun??es utilit?rias (formatters, validators, calculations)
 * - hooks/ - Hooks customizados para l?gica de neg?cio
 * - components/ - Componentes de UI reutiliz?veis
 */

import { ArrowLeft, CalendarDays, CheckCircle, ChevronDown, CopyPlus, CreditCard, Eye, FileText, Layers3, Link2, Mail, MessageCircle, Package, Receipt, Settings2, Trash2, User, Wrench } from 'lucide-react';
import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Hooks
import { useClientes } from './hooks/useClientes';
import { useCatalogo } from './hooks/useCatalogo';
import { useCondicoesPagamento } from './hooks/useCondicoesPagamento';
import { useDepartamentos } from './hooks/useDepartamentos';
import { useParcelas } from './hooks/useParcelas';
import { usePropostaData } from './hooks/usePropostaData';
import { useProjetos } from './hooks/useProjetos';
import { useVendedores } from './hooks/useVendedores';

// Components
import InformacoesBasicas from './components/InformacoesBasicas';
import ConfiguracoesAdicionais from './components/ConfiguracoesAdicionais';
import ItensProposta from './components/ItensProposta';
import ImpostosProposta from './components/ImpostosProposta';
import CondicoesComerciais from './components/CondicoesComerciais';
import InformacoesAdicionais from './components/InformacoesAdicionais';
import DetalhesCamposCustomizados, {
  normalizarOpcoesSelecaoCustomizadas,
  normalizarTipoCampoCustomizado,
  type CampoCustomizadoConfig,
} from './components/DetalhesCamposCustomizados';

// Shared
import ClienteDrawer from '@/components/erp/Negocios/shared/ClienteDrawer';

// Utils
import { calcularTotalGeral, gerarParcelas } from './utils/calculations';
import { formatarCnpjCpf, formatarDataBrasileira, formatarMoeda, parseValorBrasileiro } from './utils/formatters';
import { validarFormularioProposta } from './utils/validators';
import { STATUS_LABELS, normalizarStatusParaLookup } from '@/config/propostas';

// Types
import type { NovaPropostaPageProps } from './types';

type PropostaTab = 'basicas' | 'detalhes' | 'componentes' | 'itens' | 'servicos' | 'produtos' | 'impostos' | 'condicoes' | 'informacoes';

type TabDefinition = { id: PropostaTab; label: string; icon: ReactNode };

const PROPOSTA_TABS_BASE: TabDefinition[] = [
  { id: 'basicas', label: 'Informações básicas', icon: <User className="h-4 w-4" /> },
  { id: 'itens', label: 'Itens da proposta', icon: <Layers3 className="h-4 w-4" /> },
  { id: 'servicos', label: 'Serviços', icon: <Wrench className="h-4 w-4" /> },
  { id: 'produtos', label: 'Produtos', icon: <Package className="h-4 w-4" /> },
  { id: 'impostos', label: 'Impostos', icon: <Receipt className="h-4 w-4" /> },
  { id: 'condicoes', label: 'Condições comerciais', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'informacoes', label: 'Resumo Financeiro', icon: <FileText className="h-4 w-4" /> },
  { id: 'componentes', label: 'Componentes da proposta', icon: <Settings2 className="h-4 w-4" /> },
];

function getTabsForTipo(tipo: 'proposta' | 'venda' | 'os', mostrarDetalhes: boolean): { tabs: TabDefinition[]; order: PropostaTab[] } {
  const tabMap = new Map(PROPOSTA_TABS_BASE.map((t) => [t.id, t]));
  const tabDetalhes: TabDefinition = {
    id: 'detalhes',
    label: 'Detalhes',
    icon: <Layers3 className="h-4 w-4" />,
  };

  const montarTabs = (order: PropostaTab[]) =>
    order.map((id) => (id === 'detalhes' ? tabDetalhes : tabMap.get(id) ?? { id, label: id, icon: <FileText className="h-4 w-4" /> }));

  if (tipo === 'proposta') {
    const order: PropostaTab[] = ['basicas', ...(mostrarDetalhes ? ['detalhes' as const] : []), 'itens', 'impostos', 'condicoes', 'componentes', 'informacoes'];
    return {
      tabs: montarTabs(order),
      order,
    };
  }
  if (tipo === 'venda') {
    const order: PropostaTab[] = ['basicas', ...(mostrarDetalhes ? ['detalhes' as const] : []), 'produtos', 'impostos', 'condicoes', 'informacoes'];
    return {
      tabs: order.map((id) => {
        if (id === 'detalhes') return tabDetalhes;
        return {
          id,
          label: id === 'produtos' ? 'Produtos' : tabMap.get(id)?.label ?? id,
          icon: tabMap.get(id)?.icon ?? <FileText className="h-4 w-4" />,
        };
      }),
      order,
    };
  }
  const order: PropostaTab[] = ['basicas', ...(mostrarDetalhes ? ['detalhes' as const] : []), 'servicos', 'produtos', 'impostos', 'condicoes', 'informacoes'];
  return {
    tabs: montarTabs(order),
    order,
  };
}

function getTabFromHash(hash: string, tipo: 'proposta' | 'venda' | 'os', mostrarDetalhes: boolean): PropostaTab {
  const normalizedHash = hash.replace('#', '') as PropostaTab;
  const { order } = getTabsForTipo(tipo, mostrarDetalhes);
  if (tipo === 'venda' && normalizedHash === 'itens') return 'produtos';
  if (tipo === 'os' && normalizedHash === 'itens') return 'servicos';
  return order.includes(normalizedHash) ? normalizedHash : 'basicas';
}

function getInitials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return 'NP';

  return parts.map((part) => part[0]?.toUpperCase() || '').join('');
}

function SummaryCard({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-neutral-800/80 dark:bg-neutral-950">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
        {title}
      </div>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  icon,
  showIndicator = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: ReactNode;
  showIndicator?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-neutral-800 dark:hover:text-slate-100'
      }`}
    >
      <span className={active ? 'text-white/90' : 'text-slate-400 dark:text-slate-400'}>{icon}</span>
      <span className="relative inline-flex items-center">
        {label}
        {showIndicator && (
          <span className="absolute -top-1 -right-2 h-1.5 w-1.5 rounded-full bg-amber-400 shadow-sm" />
        )}
      </span>
    </button>
  );
}

type DocumentoAction = {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: 'outline' | 'dark' | 'primary';
};

type ResponsavelOption = {
  id_usuario: string;
  nome_completo: string | null;
};

function getActionButtonClass(variant: DocumentoAction['variant']): string {
  if (variant === 'primary') {
    return 'rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50';
  }

  if (variant === 'dark') {
    return 'rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-700';
  }

  return 'inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-neutral-800 dark:text-slate-300 dark:hover:bg-neutral-800';
}

function buildDocumentoResumo(tituloDocumento: string, codigoDocumento: string, cliente: string, valorTotal: number) {
  const partes = [
    tituloDocumento,
    codigoDocumento ? `Número: ${codigoDocumento}` : null,
    cliente ? `Cliente: ${cliente}` : null,
    `Valor: ${formatarMoeda(valorTotal)}`,
  ].filter(Boolean);

  return partes.join('\n');
}

export default function NovaPropostaPage({ 
  onBack, 
  onSavedSuccess,
  mode = 'create', 
  propostaId = null,
  vendaId = null,
  osId = null,
  tipo = 'proposta' 
}: NovaPropostaPageProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<PropostaTab>('basicas');
  const [abasVisitadas, setAbasVisitadas] = useState<Set<PropostaTab>>(new Set(['basicas']));
  const [abasVisitadasHidratadas, setAbasVisitadasHidratadas] = useState(false);
  const [ocultarBolinhasTabs, setOcultarBolinhasTabs] = useState(false);
  const [idEmpresa, setIdEmpresa] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [menuAcoesAberto, setMenuAcoesAberto] = useState(false);
  const [clienteDrawerAberto, setClienteDrawerAberto] = useState(false);
  const [camposCustomizadosConfig, setCamposCustomizadosConfig] = useState<CampoCustomizadoConfig[]>([]);
  const [carregandoCamposCustomizados, setCarregandoCamposCustomizados] = useState(false);
  const menuAcoesRef = useRef<HTMLDivElement | null>(null);
  
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isCopyMode = mode === 'copy';
  const isCreateOrCopy = mode === 'create' || mode === 'copy';
  const isVenda = tipo === 'venda';
  const isOrdemServico = tipo === 'os';
  const isModoSemProposta = tipo !== 'proposta';
  const documentoTipoLabelSalvar = tipo === 'os' ? 'ordem de serviço' : tipo === 'venda' ? 'pedido de venda' : 'proposta';
  const mostrarAbaDetalhes = true;
  const tabsConfiguradas = useMemo(() => getTabsForTipo(tipo, mostrarAbaDetalhes), [tipo, mostrarAbaDetalhes]);
  const idDocumentoPersistencia = useMemo(() => {
    if (mode !== 'edit' && mode !== 'view') return null;
    return propostaId || vendaId || osId || null;
  }, [mode, propostaId, vendaId, osId]);
  const chaveTabsVisitadas = useMemo(() => {
    if (!idDocumentoPersistencia) return null;
    return `erp:nova-proposta:tabs-visitadas:${tipo}:${idDocumentoPersistencia}`;
  }, [tipo, idDocumentoPersistencia]);
  const chaveBolinhasPersistidas = useMemo(() => {
    if (!idDocumentoPersistencia) return null;
    return `erp:nova-proposta:tabs-indicador-lido:${tipo}:${idDocumentoPersistencia}`;
  }, [tipo, idDocumentoPersistencia]);

  // Hooks de dados
  const clientes = useClientes(idEmpresa);
  const catalogo = useCatalogo(idEmpresa);
  const condicoes = useCondicoesPagamento(idEmpresa);
  const departamentos = useDepartamentos(idEmpresa);
  const parcelas = useParcelas();
  const projetos = useProjetos(idEmpresa);
  const vendedores = useVendedores(idEmpresa);
  const propostaData = usePropostaData({
    idEmpresa,
    propostaId,
    vendaId,
    osId,
    mode,
    tipo
  });

  const [vendedorSelecionado, setVendedorSelecionado] = useState<string | null>(null);
  const [responsaveis, setResponsaveis] = useState<ResponsavelOption[]>([]);
  const [responsavelSelecionado, setResponsavelSelecionado] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncHash = () => {
      setActiveTab(getTabFromHash(window.location.hash, tipo, mostrarAbaDetalhes));
    };

    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [tipo, mostrarAbaDetalhes]);

  useEffect(() => {
    if (!tabsConfiguradas.order.includes(activeTab)) {
      setActiveTab('basicas');
    }
  }, [activeTab, tabsConfiguradas.order]);

  useEffect(() => {
    const carregarCamposCustomizados = async () => {
      if (!idEmpresa) {
        setCamposCustomizadosConfig([]);
        setCarregandoCamposCustomizados(false);
        return;
      }

      const contexto = tipo === 'os' ? 'OS' : tipo === 'venda' ? 'VENDA' : 'PROPOSTA';
      setCarregandoCamposCustomizados(true);

      try {
        const { data, error } = await supabase
          .from('erp_campos_customizados_config')
          .select('id, campo_chave, label, tipo_campo, opcoes_selecao, ordem')
          .eq('id_empresa', idEmpresa)
          .eq('contexto', contexto)
          .eq('ativo', true)
          .order('ordem', { ascending: true, nullsFirst: false });

        if (error) throw error;

        const configuracoes = ((data || []) as Array<Record<string, unknown>>)
          .map((item) => ({
            id: String(item.id || ''),
            campo_chave: String(item.campo_chave || '').trim(),
            label: String(item.label || '').trim(),
            tipo_campo: normalizarTipoCampoCustomizado(item.tipo_campo),
            ordem:
              item.ordem === null || item.ordem === undefined || item.ordem === ''
                ? null
                : Number(item.ordem),
            opcoes_selecao: normalizarOpcoesSelecaoCustomizadas(item.opcoes_selecao),
          }))
          .filter((item) => item.campo_chave && item.label);

        setCamposCustomizadosConfig(configuracoes);
      } catch (error) {
        console.error('Erro ao carregar campos customizados do documento:', error);
        setCamposCustomizadosConfig([]);
      } finally {
        setCarregandoCamposCustomizados(false);
      }
    };

    void carregarCamposCustomizados();
  }, [idEmpresa, tipo]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setAbasVisitadasHidratadas(false);
    try {
      const indicadorJaLido = chaveBolinhasPersistidas
        ? window.localStorage.getItem(chaveBolinhasPersistidas) === '1'
        : false;
      setOcultarBolinhasTabs(indicadorJaLido);

      const bruto = chaveTabsVisitadas ? window.localStorage.getItem(chaveTabsVisitadas) : null;
      const parsed = bruto ? JSON.parse(bruto) : [];
      const carregadas = Array.isArray(parsed) ? (parsed as PropostaTab[]) : [];
      const permitidas = new Set(tabsConfiguradas.order);
      const normalizadas = carregadas.filter((tab) => permitidas.has(tab));
      const visitadasIniciais = new Set<PropostaTab>(normalizadas);
      visitadasIniciais.add(activeTab);
      setAbasVisitadas(visitadasIniciais);
      if (chaveTabsVisitadas) {
        window.localStorage.setItem(chaveTabsVisitadas, JSON.stringify(Array.from(visitadasIniciais)));
      }
      if (chaveBolinhasPersistidas && !indicadorJaLido) {
        // Primeira abertura deste documento: mostra nesta vez e desativa para as próximas.
        window.localStorage.setItem(chaveBolinhasPersistidas, '1');
      }
      setAbasVisitadasHidratadas(true);
    } catch {
      const fallback = new Set<PropostaTab>([activeTab]);
      setAbasVisitadas(fallback);
      setOcultarBolinhasTabs(false);
      setAbasVisitadasHidratadas(true);
    }
  }, [chaveTabsVisitadas, chaveBolinhasPersistidas, tabsConfiguradas.order]);

  useEffect(() => {
    setAbasVisitadas((atual) => {
      if (atual.has(activeTab)) return atual;
      const proximo = new Set(atual);
      proximo.add(activeTab);
      if (typeof window !== 'undefined' && chaveTabsVisitadas) {
        try {
          window.localStorage.setItem(chaveTabsVisitadas, JSON.stringify(Array.from(proximo)));
        } catch {}
      }
      return proximo;
    });
  }, [activeTab, chaveTabsVisitadas]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const { pathname, search, hash } = window.location;
    const nextHash = `#${activeTab}`;
    if (hash !== nextHash) {
      window.history.replaceState(null, '', `${pathname}${search}${nextHash}`);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!menuAcoesAberto) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuAcoesRef.current && !menuAcoesRef.current.contains(event.target as Node)) {
        setMenuAcoesAberto(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuAcoesAberto]);

  // Buscar vendedor do usu?rio atual ao criar nova proposta
  useEffect(() => {
    const buscarVendedorUsuario = async () => {
      if (!user || !idEmpresa || mode !== 'create') return;

      try {
        // Buscar vendedor associado ao usu?rio atual
        const { data: vendedorData, error } = await supabase
          .from('erp_vendedores')
          .select('id')
          .eq('id_empresa', idEmpresa)
          .eq('id_usuario', user.id)
          .eq('status', 'ATIVO')
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar vendedor do usu?rio:', error);
          return;
        }

        if (vendedorData) {
          setVendedorSelecionado(vendedorData.id);
        }
      } catch (error) {
        console.error('Erro ao buscar vendedor do usu?rio:', error);
      }
    };

    buscarVendedorUsuario();
  }, [user, idEmpresa, mode]);

  // Sincronizar vendedor e condi??o de pagamento com dados da proposta
  useEffect(() => {
    if (propostaData.idVendedor) {
      setVendedorSelecionado(propostaData.idVendedor);
    }
  }, [propostaData.idVendedor]);

  useEffect(() => {
    setResponsavelSelecionado(propostaData.idUsuarioResponsavel || null);
  }, [propostaData.idUsuarioResponsavel]);

  useEffect(() => {
    const carregarResponsaveis = async () => {
      if (!idEmpresa) {
        setResponsaveis([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('sis_membros_equipe')
          .select('id_usuario, nome_completo')
          .eq('id_empresa', idEmpresa)
          .order('nome_completo', { ascending: true });

        if (error) throw error;
        setResponsaveis((data || []) as ResponsavelOption[]);
      } catch (error) {
        console.error('Erro ao carregar responsaveis da empresa:', error);
        setResponsaveis([]);
      }
    };

    void carregarResponsaveis();
  }, [idEmpresa]);

  useEffect(() => {
    if (propostaData.idCondicaoPagamento && condicoes.condicoes.length > 0) {
      const condicaoJaSelecionada = condicoes.condicaoSelecionada?.id === propostaData.idCondicaoPagamento;
      if (!condicaoJaSelecionada) {
        condicoes.selecionarCondicao(propostaData.idCondicaoPagamento);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propostaData.idCondicaoPagamento, condicoes.condicoes.length]);

  const hidratacaoCondicoesRef = useRef<string | null>(null);
  useEffect(() => {
    const idDocumento = propostaId || vendaId || osId || 'novo';
    const chaveHidratacao = `${tipo}:${mode}:${idDocumento}`;
    if (hidratacaoCondicoesRef.current === chaveHidratacao) return;

    const dadosPersonalizados = propostaData.condicoesPersonalizadasCarregadas;
    if (!dadosPersonalizados || typeof dadosPersonalizados !== 'object') return;

    const registro = dadosPersonalizados as any;
    parcelas.setIsCobrancaRecorrente(Boolean(registro.cobranca_recorrente));

    const listaParcelas = Array.isArray(registro.parcelas) ? registro.parcelas : [];
    const parcelasNormalizadas = listaParcelas
      .map((parcela: any, index: number) => {
        const numero = Number(parcela?.numero || index + 1);
        const valorNumero = Number(parcela?.valor || 0);
        const valorTexto = Number.isFinite(valorNumero)
          ? valorNumero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : '0,00';

        return {
          id: `parcela-carregada-${idDocumento}-${numero}-${index}`,
          numero: Number.isFinite(numero) ? numero : index + 1,
          valor: valorTexto,
          vencimento: String(parcela?.data_vencimento || parcela?.vencimento || '').trim(),
          formaPagamento: String(parcela?.forma_pagamento || '').trim(),
          idFormaPagamento: parcela?.id_forma_pagamento ? String(parcela.id_forma_pagamento) : null,
          observacoes: String(parcela?.observacoes || '').trim(),
        };
      })
      .filter((parcela: any) => parcela.vencimento);

    if (parcelasNormalizadas.length > 0) {
      parcelas.definirParcelas(parcelasNormalizadas);
    }

    if (registro.quantidade_parcelas != null) {
      parcelas.setQuantidadeParcelas(String(registro.quantidade_parcelas));
    }

    hidratacaoCondicoesRef.current = chaveHidratacao;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    propostaData.condicoesPersonalizadasCarregadas,
    propostaId,
    vendaId,
    osId,
    tipo,
    mode,
  ]);

  // Sincronizar cliente carregado ao editar/visualizar proposta
  useEffect(() => {
    if (!propostaData.clienteSelecionado) return;
    if (clientes.clienteSelecionado?.id === propostaData.clienteSelecionado.id) return;
    clientes.selecionarCliente(propostaData.clienteSelecionado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propostaData.clienteSelecionado?.id]);

  // Buscar empresa do usu?rio
  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!user) return;
      
      try {
        const { data: memberData } = await supabase
          .from('sis_membros_equipe')
          .select('id_empresa')
          .eq('id_usuario', user.id)
          .maybeSingle();

        if (memberData) {
          setIdEmpresa(memberData.id_empresa);
        }
      } catch (error) {
        console.error('Erro ao buscar empresa:', error);
      }
    };

    fetchCompanyData();
  }, [user]);

  // Calcular valor total
  const valorTotalCalculado = calcularTotalGeral(
    propostaData.items,
    propostaData.descontoGeralReal,
    propostaData.descontoGeralPercent,
    propostaData.acrescimo,
    propostaData.frete
  );
  const valorTotalReferencia =
    propostaData.valorTotalFinalCarregado !== null && propostaData.valorTotalFinalCarregado !== undefined
      ? propostaData.valorTotalFinalCarregado
      : valorTotalCalculado;

  const obterMensagemErro = (erro: unknown, fallback: string) => {
    if (!erro || typeof erro !== 'object') return fallback;
    const erroSupabase = erro as { code?: string; message?: string; details?: string; hint?: string };

    if (erroSupabase.code === '23505') {
      return 'J\u00e1 existe um registro com esses dados. Revise o n\u00famero da proposta.';
    }
    if (erroSupabase.code === '42501') {
      return 'Voc\u00ea n\u00e3o tem permiss\u00e3o para executar esta a\u00e7\u00e3o.';
    }
    if (erroSupabase.message) {
      return erroSupabase.message;
    }
    if (erroSupabase.details) {
      return erroSupabase.details;
    }
    if (erroSupabase.hint) {
      return erroSupabase.hint;
    }
    return fallback;
  };

  const normalizarTexto = (value: string | null | undefined) => (value || '').trim();
  const obterPrefixoDocumento = () =>
    (propostaData.codigoPrefixoAtual || (tipo === 'os' ? 'OS' : tipo === 'venda' ? 'VEN' : 'PRP')).trim();
  const formatarNumeroCodigo4 = (numero: string | number | null | undefined) => {
    const somenteDigitos = String(numero ?? '').replace(/\D/g, '');
    if (!somenteDigitos) return '';
    return somenteDigitos.padStart(4, '0').slice(-4);
  };
  const normalizarDataISO = (valor: string | null | undefined): string | null => {
    const texto = String(valor || '').trim();
    if (!texto) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      return texto;
    }

    const matchBr = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (matchBr) {
      const [, dia, mes, ano] = matchBr;
      return `${ano}-${mes}-${dia}`;
    }

    const data = new Date(texto);
    if (Number.isNaN(data.getTime())) return null;
    return data.toISOString().split('T')[0];
  };
  const converterIsoParaDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

  const atualizarProximoNumeroDocumento = async (tipoDocumento: 'proposta' | 'venda' | 'os', codigoNumero: string) => {
    if (!idEmpresa) return;
    const numeroAtual = Number.parseInt(codigoNumero, 10);
    if (!Number.isFinite(numeroAtual)) return;
    const proximoNumero = numeroAtual + 1;
    const colunaProximoNumero =
      tipoDocumento === 'venda'
        ? 'proximo_numero_venda'
        : tipoDocumento === 'os'
          ? 'proximo_numero_os'
          : 'proximo_numero_proposta';

    const { data: configAtual, error: erroBuscaConfig } = await supabase
      .from('erp_configuracoes')
      .select(colunaProximoNumero)
      .eq('id_empresa', idEmpresa)
      .maybeSingle();

    if (erroBuscaConfig) throw erroBuscaConfig;

    const valorAtual = Number(((configAtual as Record<string, unknown> | null)?.[colunaProximoNumero] as number | string | undefined) || 0);
    if (proximoNumero <= valorAtual) return;

    const { error: erroAtualizarConfig } = await supabase
      .from('erp_configuracoes')
      .update({ [colunaProximoNumero]: proximoNumero })
      .eq('id_empresa', idEmpresa);

    if (erroAtualizarConfig) throw erroAtualizarConfig;
  };
  const detectarCondicoesPersonalizadas = () => {
    const parcelasAtuais = parcelas.parcelas || [];
    if (parcelasAtuais.length === 0) return false;

    if (parcelas.isCobrancaRecorrente) return true;

    const possuiEdicaoLivre = parcelasAtuais.some(
      (parcela) =>
        normalizarTexto(parcela.formaPagamento) !== '' ||
        Boolean(parcela.idFormaPagamento) ||
        normalizarTexto(parcela.observacoes) !== ''
    );
    if (possuiEdicaoLivre) return true;

    const condicaoSelecionada = condicoes.condicaoSelecionada;
    if (!condicaoSelecionada || !propostaData.formData.dataProposta) return true;

    const regras = Array.isArray(condicaoSelecionada.regras) ? condicaoSelecionada.regras : [];
    if (regras.length === 0) return true;

    const parcelasBase = gerarParcelas(valorTotalReferencia, regras, propostaData.formData.dataProposta);
    if (parcelasBase.length !== parcelasAtuais.length) return true;

    for (let index = 0; index < parcelasAtuais.length; index += 1) {
      const atual = parcelasAtuais[index];
      const base = parcelasBase[index];
      const valorAtual = parseValorBrasileiro(atual.valor || '0');
      const valorBase = parseValorBrasileiro(base?.valor || '0');
      const vencimentoAtual = normalizarTexto(atual.vencimento);
      const vencimentoBase = normalizarTexto(base?.vencimento);
      const numeroAtual = Number(atual.numero || index + 1);
      const numeroBase = Number(base?.numero || index + 1);

      if (numeroAtual !== numeroBase) return true;
      if (vencimentoAtual !== vencimentoBase) return true;
      if (Math.abs(valorAtual - valorBase) > 0.01) return true;
    }

    return false;
  };

  const salvarProposta = async (comoRascunho: boolean) => {
    if (isViewMode || loading) return;

    if (!comoRascunho) {
      const validacao = validarFormularioProposta(
        propostaData.formData,
        clientes.clienteSelecionado,
        propostaData.items,
        tipo
      );

      if (!validacao.valido) {
        console.warn('[NovaProposta] valida??o falhou ao criar proposta', {
          mensagem: validacao.mensagem,
          quantidadeItens: propostaData.items.length,
          clienteSelecionado: Boolean(clientes.clienteSelecionado?.id),
        });
        toast.error(validacao.mensagem);
        return;
      }
    }

    try {
      setLoading(true);
      if (!idEmpresa) {
          console.error('[NovaProposta] idEmpresa n\u00e3o encontrado para salvar proposta', {
          userId: user?.id || null,
          mode,
          comoRascunho,
        });
        toast.error(`N\u00e3o foi poss\u00edvel identificar a empresa para salvar ${documentoTipoLabelSalvar}.`);
        setLoading(false);
        return;
      }

      const statusSalvar = comoRascunho
        ? 'RASCUNHO'
        : isCreateOrCopy
          ? 'AGUARDANDO_ENVIO'
          : propostaData.statusProposta || 'AGUARDANDO_ENVIO';
      const numeroProposta = (propostaData.formData.numeroProposta || '').trim();
      const numeroPropostaNormalizado = numeroProposta.replace(/\D/g, '');
      const numeroPropostaFormatado = numeroPropostaNormalizado ? formatarNumeroCodigo4(numeroPropostaNormalizado) : null;
      const codigoPrefixo = obterPrefixoDocumento();

      if (numeroPropostaNormalizado.length > 4) {
        toast.error('O número deve ter no máximo 4 dígitos.');
        setLoading(false);
        return;
      }

      if (numeroProposta && !numeroPropostaFormatado) {
        toast.error('Informe um número de documento válido.');
        setLoading(false);
        return;
      }

      if (numeroPropostaFormatado !== null) {
        const tabelaVerificar =
          tipo === 'os' ? 'erp_os' : tipo === 'venda' ? 'erp_pedidos_venda' : 'erp_propostas';
        const queryNumero = supabase
          .from(tabelaVerificar)
          .select('id')
          .eq('id_empresa', idEmpresa)
          .eq('codigo_numero', numeroPropostaFormatado)
          .limit(1);

        const { data: docComMesmoNumero, error: erroNumero } =
          mode === 'edit' && !isCopyMode && (propostaId || vendaId || osId)
            ? await queryNumero.neq('id', propostaId || vendaId || osId)
            : await queryNumero;

        if (erroNumero) {
          throw erroNumero;
        }

        if (docComMesmoNumero && docComMesmoNumero.length > 0) {
          const tipoDoc = tipo === 'os' ? 'ordem de servi\u00e7o' : tipo === 'venda' ? 'pedido de venda' : 'proposta';
          toast.error(`J\u00e1 existe outro ${tipoDoc} com o n\u00famero "${numeroPropostaFormatado}". Use outro n\u00famero.`);
          setLoading(false);
          return;
        }
      }

      const valorTotalItens = propostaData.items.reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);
      const valorDescontoGlobal = parseValorBrasileiro(propostaData.descontoGeralReal || '0');
      const valorAcrescimo = parseValorBrasileiro(propostaData.acrescimo || '0');
      const valorFreteOutros = parseValorBrasileiro(propostaData.frete || '0');
      const impostoOuNull = (valor: string) => {
        const numero = parseValorBrasileiro(valor || '0');
        return Number(numero) === 0 ? null : numero;
      };
      const dataBaseDocumento =
        normalizarDataISO(propostaData.formData.dataProposta) || new Date().toISOString().split('T')[0];
      const prazoEntregaPayload = normalizarDataISO(propostaData.formData.prazoEntrega) || dataBaseDocumento;
      const prazoGarantiaPayload = normalizarDataISO(propostaData.formData.prazoGarantia) || dataBaseDocumento;
      const impostosColunasPayload = {
        perc_iss: impostoOuNull(propostaData.impostos.percentualIss),
        perc_icms: impostoOuNull(propostaData.impostos.percentualIcms),
        perc_pis: impostoOuNull(propostaData.impostos.percentualPis),
        perc_cofins: impostoOuNull(propostaData.impostos.percentualCofins),
        perc_ir_csll_retido: impostoOuNull(propostaData.impostos.percentualIrpjCsllRetido),
      };
      const impostosPayload = {
        percentual_iss: parseValorBrasileiro(propostaData.impostos.percentualIss || '0'),
        percentual_icms: parseValorBrasileiro(propostaData.impostos.percentualIcms || '0'),
        percentual_pis: parseValorBrasileiro(propostaData.impostos.percentualPis || '0'),
        percentual_cofins: parseValorBrasileiro(propostaData.impostos.percentualCofins || '0'),
        percentual_irpj_csll_retido: parseValorBrasileiro(propostaData.impostos.percentualIrpjCsllRetido || '0'),
      };
      const possuiImpostoInformado = Object.values(impostosColunasPayload).some((valor) => valor !== null);
      const possuiCondicoesPersonalizadas = detectarCondicoesPersonalizadas();
      const condicoesPersonalizadasPayload = possuiCondicoesPersonalizadas
        ? {
            condicao_id: parcelas.isCobrancaRecorrente
              ? null
              : condicoes.condicaoSelecionada?.id || propostaData.idCondicaoPagamento || null,
            cobranca_recorrente: parcelas.isCobrancaRecorrente,
            quantidade_parcelas: Number(parcelas.quantidadeParcelas || 0),
            parcelas: (parcelas.parcelas || []).map((parcela, index) => ({
              numero: Number(parcela.numero || index + 1),
              valor: parseValorBrasileiro(parcela.valor || '0'),
              data_vencimento: normalizarDataISO(parcela.vencimento) || null,
              vencimento: normalizarDataISO(parcela.vencimento) || null,
              id_forma_pagamento: parcela.idFormaPagamento || null,
              forma_pagamento: normalizarTexto(parcela.formaPagamento) || null,
              observacoes: normalizarTexto(parcela.observacoes) || null,
            })),
            impostos: impostosPayload,
          }
        : possuiImpostoInformado
          ? { impostos: impostosPayload }
          : null;
      const camposAdicionaisPayload =
        propostaData.formData.campos_adicionais &&
        Object.keys(propostaData.formData.campos_adicionais).length > 0
          ? propostaData.formData.campos_adicionais
          : null;

      const payloadProposta = {
        id_empresa: idEmpresa,
        id_cliente: clientes.clienteSelecionado?.id || null,
        codigo_prefixo: codigoPrefixo || null,
        codigo_numero: numeroPropostaFormatado,
        titulo: propostaData.formData.titulo?.trim() || null,
        descricao: propostaData.formData.descricao?.trim() || null,
        referencia: propostaData.formData.referencia?.trim() || null,
        data_emissao: propostaData.formData.dataProposta || null,
        data_validade: propostaData.formData.dataValidade || null,
        data_inicio: propostaData.formData.dataInicio || null,
        data_fim: propostaData.formData.dataFim || null,
        prazo_entrega: converterIsoParaDate(prazoEntregaPayload),
        prazo_garantia: converterIsoParaDate(prazoGarantiaPayload),
        ...impostosColunasPayload,
        observacoes_cliente: propostaData.formData.observacoes?.trim() || null,
        observacoes_internas: propostaData.formData.observacoesInternas?.trim() || null,
        valor_total_itens: valorTotalItens,
        valor_desconto_global: valorDescontoGlobal,
        valor_acrescimo: valorAcrescimo,
        valor_frete_outros: valorFreteOutros,
        status: statusSalvar,
        id_vendedor: vendedorSelecionado || null,
        id_departamento: propostaData.formData.id_departamento || null,
        id_projeto: propostaData.formData.id_projeto || null,
        id_condicao_pagamento: parcelas.isCobrancaRecorrente
          ? null
          : condicoes.condicaoSelecionada?.id || propostaData.idCondicaoPagamento || null,
        cobranca_recorrente: parcelas.isCobrancaRecorrente,
        condicoes_personalizadas: condicoesPersonalizadasPayload,
        campos_adicionais: camposAdicionaisPayload,
        configuracao_blocos:
          propostaData.configuracaoBlocos && Object.keys(propostaData.configuracaoBlocos).length > 0
            ? propostaData.configuracaoBlocos
            : null,
      };

      let idPropostaSalva: string;

      // OS em modo copy ou edit: fluxo espec?fico (n?o usa proposta)
      const skipPropostaFlow = (isCopyMode && tipo === 'os') || (isEditMode && tipo === 'os');
      // Venda em modo edit: N?O toca em proposta (vendas s?o individuais)
      const skipPropostaFlowVenda = isEditMode && tipo === 'venda';
      const isEditVenda = isEditMode && tipo === 'venda' && vendaId;
      let idPropostaParaFluxo = propostaId;

      if (skipPropostaFlow || skipPropostaFlowVenda) {
        idPropostaSalva = ''; // n?o usado para OS ou venda em edit
      } else if (isCreateOrCopy) {
        const { data: propostaCriada, error: erroCriar } = await supabase
          .from('erp_propostas')
          .insert(payloadProposta)
          .select('id')
          .single();

        if (erroCriar || !propostaCriada?.id) {
          throw erroCriar || new Error('N\u00e3o foi poss\u00edvel criar a proposta.');
        }
        idPropostaSalva = propostaCriada.id;
      } else {
        if (!idPropostaParaFluxo) {
          throw new Error('ID da proposta n\u00e3o informado para edi\u00e7\u00e3o.');
        }

        const { error: erroAtualizar } = await supabase
          .from('erp_propostas')
          .update(payloadProposta)
          .eq('id', idPropostaParaFluxo)
          .eq('id_empresa', idEmpresa);

        if (erroAtualizar) {
          throw erroAtualizar;
        }
        idPropostaSalva = idPropostaParaFluxo;
      }

      if (!skipPropostaFlow && !skipPropostaFlowVenda) {
        const itensPayload = propostaData.items.map((item) => ({
          id_empresa: idEmpresa,
          id_proposta: idPropostaSalva,
          id_item_catalogo: item.id_item_catalogo ?? null,
          tipo_item: item.tipo === 'servico' ? 'SERVICO' : 'PRODUTO',
          descricao_item: item.nome?.trim() || 'Item sem descri\u00e7\u00e3o',
          quantidade: Number(item.quantidade || 0),
          preco_unitario: parseValorBrasileiro(item.valorUnitario || '0'),
          desconto_item: parseValorBrasileiro(item.descontoReal || '0'),
        }));

        const { error: erroRemoverItens } = await supabase
          .from('erp_itens_proposta')
          .delete()
          .eq('id_proposta', idPropostaSalva);

        if (erroRemoverItens) {
          console.error('Erro do Supabase ao remover itens:', erroRemoverItens);
          toast.error(`Erro ao remover itens anteriores: ${erroRemoverItens.message}`);
          throw erroRemoverItens;
        }

        if (itensPayload.length > 0) {
          console.log('Payload dos itens:', itensPayload);

          const { error: erroInserirItens } = await supabase
            .from('erp_itens_proposta')
            .insert(itensPayload);

          if (erroInserirItens) {
            console.error('Erro do Supabase ao inserir itens:', erroInserirItens);
            toast.error(`Erro ao salvar itens: ${erroInserirItens.message}`);
            throw erroInserirItens;
          }
        }
      }

      // Não gerar parcelas neste fluxo. Apenas persistimos a condição e, se houver edição manual,
      // salvamos o JSON em condicoes_personalizadas. As parcelas serão criadas em etapa posterior.

      // Em modo copy para venda: criar registro em erp_pedidos_venda
      if (isCopyMode && tipo === 'venda' && idPropostaSalva) {
        const { error: erroVenda } = await supabase
          .from('erp_pedidos_venda')
          .insert({
            id_empresa: idEmpresa,
            id_contato: clientes.clienteSelecionado?.id || null,
            id_vendedor: vendedorSelecionado || null,
            id_proposta_origem: idPropostaSalva,
            codigo_prefixo: codigoPrefixo || null,
            codigo_numero: numeroPropostaFormatado,
            status: statusSalvar,
            data_venda: propostaData.formData.dataProposta || new Date().toISOString().split('T')[0],
            id_condicao_pagamento: parcelas.isCobrancaRecorrente
              ? null
              : condicoes.condicaoSelecionada?.id || propostaData.idCondicaoPagamento || null,
            cobranca_recorrente: parcelas.isCobrancaRecorrente,
            condicoes_personalizadas: condicoesPersonalizadasPayload,
            campos_adicionais: camposAdicionaisPayload,
          });

        if (erroVenda) throw erroVenda;
        if (numeroPropostaFormatado) {
          await atualizarProximoNumeroDocumento('venda', numeroPropostaFormatado);
        }
      }

      // Em modo edit para venda: atualizar erp_pedidos_venda
      if (isEditVenda && vendaId) {
        const { error: erroAtualizarVenda } = await supabase
          .from('erp_pedidos_venda')
          .update({
            id_contato: clientes.clienteSelecionado?.id || null,
            id_vendedor: vendedorSelecionado || null,
            codigo_prefixo: codigoPrefixo || null,
            codigo_numero: numeroPropostaFormatado,
            status: statusSalvar,
            data_venda: propostaData.formData.dataProposta || new Date().toISOString().split('T')[0],
            id_condicao_pagamento: parcelas.isCobrancaRecorrente
              ? null
              : condicoes.condicaoSelecionada?.id || propostaData.idCondicaoPagamento || null,
            cobranca_recorrente: parcelas.isCobrancaRecorrente,
            condicoes_personalizadas: condicoesPersonalizadasPayload,
            campos_adicionais: camposAdicionaisPayload,
          })
          .eq('id', vendaId)
          .eq('id_empresa', idEmpresa);

        if (erroAtualizarVenda) throw erroAtualizarVenda;
      }

      // Em modo edit para OS: atualizar erp_os e itens
      if (isEditMode && tipo === 'os' && osId) {
        const { error: erroAtualizarOS } = await supabase
          .from('erp_os')
          .update({
            id_cliente: clientes.clienteSelecionado?.id || null,
            id_vendedor: vendedorSelecionado || null,
            id_usuario_responsavel: responsavelSelecionado || null,
            id_departamento: propostaData.formData.id_departamento || null,
            id_projeto: propostaData.formData.id_projeto || null,
            codigo_prefixo: codigoPrefixo || null,
            codigo_numero: numeroPropostaFormatado,
            status: statusSalvar,
            data_emissao: propostaData.formData.dataProposta || new Date().toISOString().split('T')[0],
            data_inicio: propostaData.formData.dataInicio || null,
            data_fim: propostaData.formData.dataFim || null,
            titulo: propostaData.formData.titulo?.trim() || null,
            prazo_entrega: converterIsoParaDate(prazoEntregaPayload),
            prazo_garantia: converterIsoParaDate(prazoGarantiaPayload),
            descricao: propostaData.formData.descricao?.trim() || null,
            valor_total: valorTotalCalculado,
            custo_extra_os: parseValorBrasileiro(propostaData.formData.custoExtraOS || '0'),
            id_proposta_origem: propostaId || null,
            id_condicao_pagamento: parcelas.isCobrancaRecorrente
              ? null
              : condicoes.condicaoSelecionada?.id || propostaData.idCondicaoPagamento || null,
            cobranca_recorrente: parcelas.isCobrancaRecorrente,
            condicoes_personalizadas: condicoesPersonalizadasPayload,
            campos_adicionais: camposAdicionaisPayload,
          })
          .eq('id', osId)
          .eq('id_empresa', idEmpresa);

        if (erroAtualizarOS) throw erroAtualizarOS;

        const { error: erroRemoverItensOs } = await supabase
          .from('erp_itens_movimentacao')
          .delete()
          .eq('id_os', osId);

        if (erroRemoverItensOs) throw erroRemoverItensOs;

        if (propostaData.items.length > 0) {
          const itensOsPayload = propostaData.items.map((item) => ({
            id_empresa: idEmpresa,
            id_os: osId,
            tipo_item: item.tipo === 'servico' ? 'SERVICO' : 'PRODUTO',
            descricao_item: item.nome?.trim() || 'Item sem descri\u00e7\u00e3o',
            quantidade: Number(item.quantidade || 0),
            preco_unitario: parseValorBrasileiro(item.valorUnitario || '0'),
            desconto_item: parseValorBrasileiro(item.descontoReal || '0'),
          }));

          const { error: erroInserirItensOs } = await supabase
            .from('erp_itens_movimentacao')
            .insert(itensOsPayload);
          if (erroInserirItensOs) throw erroInserirItensOs;
        }
      }

      // Em modo copy para OS: criar erp_os e itens (fluxo separado, n?o usa proposta)
      if (isCopyMode && tipo === 'os') {
        const { data: osCriada, error: erroOS } = await supabase
          .from('erp_os')
          .insert({
            id_empresa: idEmpresa,
            id_cliente: clientes.clienteSelecionado?.id || null,
            id_vendedor: vendedorSelecionado || null,
            id_usuario_responsavel: responsavelSelecionado || null,
            id_departamento: propostaData.formData.id_departamento || null,
            id_projeto: propostaData.formData.id_projeto || null,
            codigo_prefixo: codigoPrefixo || null,
            codigo_numero: numeroPropostaFormatado,
            status: statusSalvar,
            data_emissao: propostaData.formData.dataProposta || new Date().toISOString().split('T')[0],
            data_inicio: propostaData.formData.dataInicio || null,
            data_fim: propostaData.formData.dataFim || null,
            titulo: propostaData.formData.titulo?.trim() || null,
            prazo_entrega: converterIsoParaDate(prazoEntregaPayload),
            prazo_garantia: converterIsoParaDate(prazoGarantiaPayload),
            descricao: propostaData.formData.descricao?.trim() || null,
            valor_total: valorTotalCalculado,
            custo_extra_os: parseValorBrasileiro(propostaData.formData.custoExtraOS || '0'),
            id_condicao_pagamento: parcelas.isCobrancaRecorrente
              ? null
              : condicoes.condicaoSelecionada?.id || propostaData.idCondicaoPagamento || null,
            cobranca_recorrente: parcelas.isCobrancaRecorrente,
            condicoes_personalizadas: condicoesPersonalizadasPayload,
            campos_adicionais: camposAdicionaisPayload,
          })
          .select('id')
          .single();

        if (erroOS || !osCriada?.id) throw erroOS || new Error('N\u00e3o foi poss\u00edvel criar a ordem de servi\u00e7o.');
        if (numeroPropostaFormatado) {
          await atualizarProximoNumeroDocumento('os', numeroPropostaFormatado);
        }

        const itensOsPayload = propostaData.items.map((item) => ({
          id_empresa: idEmpresa,
          id_os: osCriada.id,
          tipo_item: item.tipo === 'servico' ? 'SERVICO' : 'PRODUTO',
          descricao_item: item.nome?.trim() || 'Item sem descri\u00e7\u00e3o',
          quantidade: Number(item.quantidade || 0),
          preco_unitario: parseValorBrasileiro(item.valorUnitario || '0'),
          desconto_item: parseValorBrasileiro(item.descontoReal || '0'),
        }));

        if (itensOsPayload.length > 0) {
          const { error: erroItensOs } = await supabase
            .from('erp_itens_movimentacao')
            .insert(itensOsPayload);
          if (erroItensOs) throw erroItensOs;
        }
      }

      if (tipo === 'proposta' && isCreateOrCopy && numeroPropostaFormatado) {
        await atualizarProximoNumeroDocumento('proposta', numeroPropostaFormatado);
      }

      propostaData.setStatusProposta(statusSalvar);
      if (comoRascunho) {
        toast.success(isCreateOrCopy ? 'Rascunho salvo com sucesso.' : 'Rascunho atualizado com sucesso.');
      } else {
        toast.success(isCreateOrCopy ? 'Documento criado com sucesso.' : 'Documento atualizado com sucesso.');
      }
      if (onSavedSuccess) {
        onSavedSuccess();
      } else {
        onBack();
      }
    } catch (error) {
      console.error(`[NovaProposta] erro ao salvar ${documentoTipoLabelSalvar}`, {
        error,
        mode,
        comoRascunho,
        propostaId,
        idEmpresa,
      });
      toast.error(obterMensagemErro(error, `Erro ao salvar ${documentoTipoLabelSalvar}. Tente novamente.`));
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async (comoRascunho: boolean) => {
    try {
      await salvarProposta(comoRascunho);
    } catch (err) {
      console.error('[NovaProposta] handleSalvar error:', err);
      toast.error('Ocorreu um erro ao processar. Tente novamente.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const comoRascunho = submitter?.value === 'rascunho';
    void handleSalvar(comoRascunho);
  };



  const tituloDocumento =
    tipo === 'os' ? 'ordem de serviço' : tipo === 'venda' ? 'venda' : 'proposta';
  const numeroDocumento = (propostaData.formData.numeroProposta || '').trim();
  const numeroDocumentoFormatado = formatarNumeroCodigo4(numeroDocumento);
  const codigoDocumento = numeroDocumento
    ? `${obterPrefixoDocumento()}-${numeroDocumentoFormatado}`
    : '';
  const tituloPrincipal =
    tipo === 'os'
      ? propostaData.formData.titulo?.trim() || `Ordem de Serviço${codigoDocumento ? ` [${codigoDocumento}]` : ''}`
      : tipo === 'venda'
        ? propostaData.formData.titulo?.trim() || (mode === 'create' ? 'Novo pedido de venda' : 'Documento sem tÃ­tulo')
        : propostaData.formData.titulo?.trim() ||
          (mode === 'create' ? 'Nova proposta' : 'Documento sem título');
  const clienteRazaoSocial = (clientes.clienteSelecionado?.nome_razao_social || '').trim() || 'Sem cliente';
  const clienteNomeFantasia = (clientes.clienteSelecionado?.nome_fantasia || clientes.clienteSelecionado?.nome_razao_social || '').trim() || 'Sem cliente';
  const vendedorResumo =
    vendedores.vendedores.find((vendedor) => vendedor.id === vendedorSelecionado)?.nome_completo ||
    'Vendedor não definido';
  const validadeResumo = propostaData.formData.dataValidade
    ? formatarDataBrasileira(propostaData.formData.dataValidade)
    : 'Sem validade';
  const statusBadgeLabel = STATUS_LABELS[normalizarStatusParaLookup(propostaData.statusProposta || 'AGUARDANDO_ENVIO')] || propostaData.statusProposta || 'Aguardando Envio';
  const labelVoltar = tipo === 'venda' ? 'Voltar aos pedidos de venda' : tipo === 'os' ? 'Voltar às ordens de serviço' : 'Voltar às propostas';
  const badgesRelacionados = [
    ...(tipo === 'proposta' && propostaData.codigoVendaGerada
      ? [{ id: 'venda', label: propostaData.codigoVendaGerada, className: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' }]
      : []),
    ...(tipo === 'proposta' && propostaData.codigoOsGerada
      ? [{ id: 'os', label: propostaData.codigoOsGerada, className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' }]
      : []),
    ...((tipo === 'venda' || tipo === 'os') && propostaData.codigoPropostaOrigem
      ? [{ id: 'proposta', label: propostaData.codigoPropostaOrigem, className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' }]
      : []),
  ];
  const labelSalvarPrincipal = loading
    ? 'Salvando...'
    : mode === 'create'
      ? isOrdemServico
        ? 'Criar ordem de serviço'
        : isVenda
          ? 'Criar venda'
          : 'Criar proposta'
      : 'Salvar alterações';
  const documentoTemId = Boolean(propostaId || vendaId || osId);
  const documentoTipoLabel = tipo === 'os' ? 'ordem de serviço' : tipo === 'venda' ? 'pedido de venda' : 'proposta';

  const handleEnviarWhatsApp = () => {
    const resumo = buildDocumentoResumo(tituloPrincipal, codigoDocumento, clienteRazaoSocial, valorTotalReferencia);
    const texto = encodeURIComponent(`Segue ${documentoTipoLabel}:\n${resumo}`);
    window.open(`https://wa.me/?text=${texto}`, '_blank', 'noopener,noreferrer');
    setMenuAcoesAberto(false);
  };

  const handleEnviarEmail = () => {
    const assunto = encodeURIComponent(`${documentoTipoLabel} ${codigoDocumento || ''}`.trim());
    const corpo = encodeURIComponent(
      buildDocumentoResumo(tituloPrincipal, codigoDocumento, clienteRazaoSocial, valorTotalReferencia)
    );
    window.location.href = `mailto:?subject=${assunto}&body=${corpo}`;
    setMenuAcoesAberto(false);
  };

  const handleCopiarLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado com sucesso.');
    } catch {
      toast.error('Não foi possível copiar o link.');
    } finally {
      setMenuAcoesAberto(false);
    }
  };

  const handleCopiarDocumento = () => {
    if (typeof window === 'undefined') return;

    const idDocumento = propostaId || vendaId || osId;
    if (!idDocumento) return;

    const base =
      tipo === 'venda'
        ? '/erp/negocios/pedidos_venda'
        : tipo === 'os'
          ? '/erp/negocios/ordens_servico'
          : '/erp/negocios/propostas';

    window.location.href = `${base}/${idDocumento}/copiar`;
    setMenuAcoesAberto(false);
  };

  const handleAprovarManual = async () => {
    if (!idEmpresa) return;

    const configAprovacao =
      tipo === 'proposta'
        ? {
            tabela: 'erp_propostas',
            id: propostaId,
            status: 'APROVADA',
            sucesso: 'Proposta aprovada manualmente.',
            erro: 'N\u00e3o foi poss\u00edvel aprovar a proposta.',
          }
        : tipo === 'venda'
          ? {
              tabela: 'erp_pedidos_venda',
              id: vendaId,
              status: 'ATENDIDO',
              sucesso: 'Pedido de venda aprovado manualmente.',
              erro: 'N\u00e3o foi poss\u00edvel aprovar o pedido de venda.',
            }
          : {
              tabela: 'erp_os',
              id: osId,
              status: 'CONCLUIDO',
              sucesso: 'Ordem de servi\u00e7o aprovada manualmente.',
              erro: 'N\u00e3o foi poss\u00edvel aprovar a ordem de servi\u00e7o.',
            };

    if (!configAprovacao.id) return;

    try {
      const { error } = await supabase
        .from(configAprovacao.tabela)
        .update({ status: configAprovacao.status })
        .eq('id', configAprovacao.id)
        .eq('id_empresa', idEmpresa);

      if (error) throw error;

      propostaData.setStatusProposta(configAprovacao.status);
      toast.success(configAprovacao.sucesso);
    } catch (error) {
      console.error(`Erro ao aprovar ${tipo} manualmente:`, error);
      toast.error(configAprovacao.erro);
      return;
      toast.error('Não foi possível aprovar a proposta.');
    } finally {
      setMenuAcoesAberto(false);
    }
  };

  const handleExcluirDocumento = async () => {
    if (!documentoTemId || !idEmpresa) return;

    const confirmado = window.confirm(`Tem certeza que deseja excluir esta ${documentoTipoLabel}?`);
    if (!confirmado) {
      setMenuAcoesAberto(false);
      return;
    }

    try {
      if (tipo === 'proposta' && propostaId) {
        const { error: erroItens } = await supabase.from('erp_itens_proposta').delete().eq('id_proposta', propostaId);
        if (erroItens) throw erroItens;

        const { error: erroParcelas } = await supabase.from('erp_parcelas').delete().eq('id_proposta', propostaId);
        if (erroParcelas) throw erroParcelas;

        const { error } = await supabase.from('erp_propostas').delete().eq('id', propostaId).eq('id_empresa', idEmpresa);
        if (error) throw error;
      } else if (tipo === 'venda' && vendaId) {
        const { error } = await supabase.from('erp_pedidos_venda').delete().eq('id', vendaId).eq('id_empresa', idEmpresa);
        if (error) throw error;
      } else if (tipo === 'os' && osId) {
        const { error } = await supabase.from('erp_os').delete().eq('id', osId).eq('id_empresa', idEmpresa);
        if (error) throw error;
      }

      toast.success('Documento excluído com sucesso.');
      onBack();
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      toast.error('Não foi possível excluir o documento.');
    } finally {
      setMenuAcoesAberto(false);
    }
  };

  const acoesDocumento = useMemo<DocumentoAction[]>(
    () => [
      {
        id: 'ver_cliente',
        label: 'Ver Cliente',
        icon: <Eye size={16} />,
        onClick: () => {
          setClienteDrawerAberto(true);
          setMenuAcoesAberto(false);
        },
        variant: 'outline',
      } satisfies DocumentoAction,
      ...((tipo === 'proposta' || tipo === 'venda' || tipo === 'os')
        ? [
            {
              id: 'aprovar',
              label:
                tipo === 'proposta'
                  ? 'Aprovar manualmente'
                  : tipo === 'venda'
                    ? 'Aprovar venda'
                    : 'Aprovar OS',
              icon: <CheckCircle size={16} />,
              onClick: handleAprovarManual,
              disabled: !documentoTemId,
              variant: 'outline',
            } satisfies DocumentoAction,
          ]
        : []),
      {
        id: 'whatsapp',
        label: 'Enviar via WhatsApp',
        icon: <MessageCircle size={16} />,
        onClick: handleEnviarWhatsApp,
        variant: 'outline',
      },
      {
        id: 'email',
        label: 'Enviar via E-mail',
        icon: <Mail size={16} />,
        onClick: handleEnviarEmail,
        variant: 'outline',
      },
      {
        id: 'copiar',
        label: 'Copiar',
        icon: <CopyPlus size={16} />,
        onClick: handleCopiarDocumento,
        variant: 'outline',
      },
      {
        id: 'link',
        label: 'Copiar link',
        icon: <Link2 size={16} />,
        onClick: handleCopiarLink,
        variant: 'outline',
      },
      {
        id: 'excluir',
        label: 'Excluir',
        icon: <Trash2 size={16} />,
        onClick: handleExcluirDocumento,
        variant: 'outline',
      },
    ],
    [documentoTemId, handleAprovarManual, handleCopiarDocumento, handleCopiarLink, handleEnviarEmail, handleEnviarWhatsApp, handleExcluirDocumento, tipo]
  );

  return (
    <div className="nova-proposta-theme flex h-full min-h-0 flex-1 flex-col overflow-hidden pt-2">
      <form id="form-nova-proposta" onSubmit={handleSubmit} className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        {/* Cabe?alho fixo no topo (sem scroll) - fundo igual ao app; space-y-3 card?abas; pb-0 para n?o aumentar espa?o abas?conte?do */}
        <div className="z-30 flex-shrink-0 space-y-4 bg-[#F8FAFC] pb-4 dark:bg-transparent">
          <div className="relative z-30 overflow-visible rounded-2xl border border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-neutral-900/40 dark:bg-black">
            <div className="flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                  {getInitials(tituloPrincipal)}
                </div>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="truncate text-2xl font-semibold text-slate-900 dark:text-slate-100">
                      {tituloPrincipal}
                    </h2>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-neutral-800 dark:text-slate-300">
                      {statusBadgeLabel}
                    </span>
                    {codigoDocumento && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                        {codigoDocumento}
                      </span>
                    )}
                    {badgesRelacionados.map((badge) => (
                      <span
                        key={badge.id}
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Preencha os dados principais da {tituloDocumento} e organize o restante nas abas abaixo.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-neutral-800 dark:text-slate-300">
                      <User className="h-3.5 w-3.5" />
                      {clienteRazaoSocial}
                    </span>
                    {(clientes.clienteSelecionado?.cnpj || clientes.clienteSelecionado?.cpf) && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                        {clientes.clienteSelecionado?.cnpj ? 'CNPJ ' : 'CPF '}
                        {formatarCnpjCpf(clientes.clienteSelecionado?.cnpj || clientes.clienteSelecionado?.cpf)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                      <CreditCard className="h-3.5 w-3.5" />
                      {formatarMoeda(valorTotalReferencia)}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-neutral-800 dark:text-slate-300">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {validadeResumo}
                    </span>
                  </div>
                </div>
              </div>
              <div
                className="relative z-50 isolate flex shrink-0 flex-wrap items-center justify-end gap-2 self-end lg:self-start"
                ref={menuAcoesRef}
              >
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-neutral-800 dark:text-slate-300 dark:hover:bg-neutral-800"
                >
                  <ArrowLeft size={16} />
                  {labelVoltar}
                </button>
                <button
                  type="button"
                  onClick={() => setMenuAcoesAberto((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                >
                  {'A\u00e7\u00f5es'}
                  <ChevronDown className={`h-4 w-4 transition-transform ${menuAcoesAberto ? 'rotate-180' : ''}`} />
                </button>

                {menuAcoesAberto && (
                  <div className="absolute right-0 top-full z-[9999] mt-2 min-w-[240px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="p-2">
                      {acoesDocumento.map((acao) => (
                        <button
                          key={acao.id}
                          type="button"
                          onClick={acao.onClick}
                          disabled={acao.disabled}
                          className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-neutral-800"
                        >
                          <span className="flex items-center gap-2">
                            {acao.icon && <span className="text-slate-400 dark:text-slate-500">{acao.icon}</span>}
                            {acao.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 border-t border-slate-200 px-6 py-5 md:grid-cols-3 dark:border-neutral-900/60">
              <SummaryCard
                title="Cliente"
                value={clienteNomeFantasia}
                icon={<User className="h-3.5 w-3.5" />}
              />
              <SummaryCard title="Vendedor" value={vendedorResumo} icon={<Layers3 className="h-3.5 w-3.5" />} />
              <SummaryCard
                title="Valor total"
                value={formatarMoeda(valorTotalReferencia)}
                icon={<Receipt className="h-3.5 w-3.5" />}
              />
            </div>
          </div>
          <div className="relative z-10 rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 shadow-sm backdrop-blur dark:border-neutral-900/40 dark:bg-black">
            <div className="flex flex-wrap gap-2">
              {tabsConfiguradas.order.map((tabId) => {
                if (tabId === 'componentes' && isModoSemProposta) return null;
                const tab = tabsConfiguradas.tabs.find((item) => item.id === tabId);
                if (!tab) return null;

                return (
                  <TabButton
                    key={tab.id}
                    active={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    label={tab.label}
                    icon={tab.icon}
                    showIndicator={
                      abasVisitadasHidratadas &&
                      !ocultarBolinhasTabs &&
                      activeTab !== tab.id &&
                      !abasVisitadas.has(tab.id)
                    }
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Conte?do das abas - ?rea rol?vel (pt-3 = 12px entre abas e conte?do) */}
        <div className="flex min-h-0 flex-1 flex-col pt-3">
        <div className="min-h-0 flex-1 overflow-y-scroll pr-2 pb-4 [scrollbar-width:thin] [scrollbar-color:#94a3b8_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400/80 dark:[scrollbar-color:#525252_transparent] dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600">
        {activeTab === 'basicas' && (
          <div className="grid grid-cols-1 items-stretch gap-2">
            <div>
              <InformacoesBasicas
                formData={propostaData.formData}
                setFormData={propostaData.setFormData}
                clienteSelecionado={clientes.clienteSelecionado}
                busca={clientes.busca}
                atualizarBusca={clientes.atualizarBusca}
                clientesFiltrados={clientes.clientesFiltrados}
                mostrarSugestoes={clientes.mostrarSugestoes}
                setMostrarSugestoes={clientes.setMostrarSugestoes}
                selecionarCliente={clientes.selecionarCliente}
                isViewMode={isViewMode}
                codigoVendaGerada={propostaData.codigoVendaGerada}
                codigoPropostaOrigem={propostaData.codigoPropostaOrigem}
                isVenda={isModoSemProposta}
                tipoDocumento={tipo}
                statusProposta={propostaData.statusProposta}
                setStatusProposta={propostaData.setStatusProposta}
                vendedores={vendedores.vendedores}
                vendedorSelecionado={vendedorSelecionado}
                setVendedorSelecionado={setVendedorSelecionado}
                responsaveis={responsaveis}
                responsavelSelecionado={responsavelSelecionado}
                setResponsavelSelecionado={setResponsavelSelecionado}
              />
            </div>
          </div>
        )}

        {activeTab === 'componentes' && !isModoSemProposta && (
          <ConfiguracoesAdicionais
            isViewMode={isViewMode}
            propostaId={propostaId}
            idEmpresa={idEmpresa}
            configuracaoBlocosInicial={propostaData.configuracaoBlocos}
            onConfiguracaoBlocosChange={propostaData.setConfiguracaoBlocos}
          />
        )}

        {(activeTab === 'itens' || activeTab === 'servicos' || activeTab === 'produtos') && (
          <ItensProposta
            items={propostaData.items}
            setItems={propostaData.setItems}
            catalogo={catalogo.catalogoItens}
            descontoGeralReal={propostaData.descontoGeralReal}
            setDescontoGeralReal={propostaData.setDescontoGeralReal}
            descontoGeralPercent={propostaData.descontoGeralPercent}
            setDescontoGeralPercent={propostaData.setDescontoGeralPercent}
            acrescimo={propostaData.acrescimo}
            setAcrescimo={propostaData.setAcrescimo}
            frete={propostaData.frete}
            setFrete={propostaData.setFrete}
            isViewMode={isViewMode}
            isVenda={isModoSemProposta}
            tipoDocumento={tipo}
            filterTipo={activeTab === 'servicos' ? 'servico' : activeTab === 'produtos' ? 'produto' : null}
          />
        )}

        {/* Condi??es Comerciais */}
        {/* Impostos */}
        {activeTab === 'impostos' && (
          <ImpostosProposta
            impostos={propostaData.impostos}
            setImpostos={propostaData.setImpostos}
            valorBase={valorTotalCalculado}
            isViewMode={isViewMode}
            isVenda={isModoSemProposta}
            tipoDocumento={tipo}
          />
        )}

        {/* Condi??es Comerciais */}
        {activeTab === 'condicoes' && (
          <CondicoesComerciais
            cobrancaRecorrente={parcelas.isCobrancaRecorrente}
            setCobrancaRecorrente={parcelas.setIsCobrancaRecorrente}
            condicoes={condicoes.condicoes}
            condicaoSelecionada={condicoes.condicaoSelecionada}
            selecionarCondicao={condicoes.selecionarCondicao}
            parcelas={parcelas.parcelas}
            setParcelas={(novasParcelas) => {
              parcelas.definirParcelas(novasParcelas);
            }}
            quantidadeParcelas={parcelas.quantidadeParcelas}
            setQuantidadeParcelas={parcelas.setQuantidadeParcelas}
            valorTotal={valorTotalReferencia}
            dataProposta={propostaData.formData.dataProposta}
            isViewMode={isViewMode}
            isVenda={isModoSemProposta}
            tipoDocumento={tipo}
            idEmpresa={idEmpresa}
            atualizarParcela={parcelas.atualizarParcela}
            removerParcela={parcelas.removerParcela}
            recalcularValores={parcelas.recalcularValores}
          />
        )}

        {activeTab === 'detalhes' && mostrarAbaDetalhes && (
          <DetalhesCamposCustomizados
            formData={propostaData.formData}
            setFormData={propostaData.setFormData}
            items={propostaData.items}
            departamentos={departamentos.departamentos}
            projetos={projetos.projetos}
            carregandoDepartamentos={departamentos.carregando}
            carregandoProjetos={projetos.carregando}
            camposConfig={camposCustomizadosConfig}
            carregando={carregandoCamposCustomizados}
            isViewMode={isViewMode}
            tipoDocumento={tipo}
          />
        )}

        {/* Informa??es Adicionais */}
        {activeTab === 'informacoes' && (
          <InformacoesAdicionais
            formData={propostaData.formData}
            setFormData={propostaData.setFormData}
            items={propostaData.items}
            impostos={propostaData.impostos}
            valorTotalDocumento={valorTotalReferencia}
            valorAcrescimo={propostaData.acrescimo}
            valorFrete={propostaData.frete}
            valorDesconto={propostaData.descontoGeralReal}
            isViewMode={isViewMode}
            isVenda={isModoSemProposta}
            tipoDocumento={tipo}
          />
        )}

        {/* Botões de Ação */}
        </div>
        <div className="flex flex-shrink-0 justify-end gap-3 pt-4 pb-2">
          {!(propostaId || vendaId || osId) ? (
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-neutral-800 dark:text-slate-300 dark:hover:bg-neutral-800"
            >
              {isViewMode ? 'Voltar' : 'Cancelar'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-neutral-800 dark:text-slate-300 dark:hover:bg-neutral-800"
            >
              <ArrowLeft size={16} />
              {labelVoltar}
            </button>
          )}
          {!isViewMode && (
            <>
              <button
                type="button"
                onClick={() => handleSalvar(true)}
                disabled={loading}
                className="rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-700"
              >
                {loading ? 'Salvando...' : 'Salvar rascunho'}
              </button>
              <button
                type="button"
                onClick={() => handleSalvar(false)}
                disabled={loading}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {labelSalvarPrincipal}
              </button>
            </>
          )}
        </div>
        </div>
      </form>
      <ClienteDrawer
        isOpen={clienteDrawerAberto}
        onClose={() => setClienteDrawerAberto(false)}
        clienteId={clientes.clienteSelecionado?.id}
      />
      <style jsx global>{`
        .nova-proposta-theme input:not([type='checkbox']):not([type='radio']),
        .nova-proposta-theme select,
        .nova-proposta-theme textarea {
          border-color: #bfdbfe;
        }

        .nova-proposta-theme input:not([type='checkbox']):not([type='radio']):focus,
        .nova-proposta-theme input:not([type='checkbox']):not([type='radio']):focus-visible,
        .nova-proposta-theme select:focus,
        .nova-proposta-theme select:focus-visible,
        .nova-proposta-theme textarea:focus,
        .nova-proposta-theme textarea:focus-visible,
        .nova-proposta-theme button:focus-visible {
          outline: none;
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.22);
        }

        .dark .nova-proposta-theme input:not([type='checkbox']):not([type='radio']),
        .dark .nova-proposta-theme select,
        .dark .nova-proposta-theme textarea {
          border-color: rgba(59, 130, 246, 0.35);
        }
      `}</style>
    </div>
  );
}
