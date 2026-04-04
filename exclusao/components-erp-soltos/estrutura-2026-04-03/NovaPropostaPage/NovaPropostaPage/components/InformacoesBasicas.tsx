import { Check, ChevronDown, FileText } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Cliente, PropostaFormData } from '../types';
import type { Vendedor } from '../hooks/useVendedores';
import { formatarCnpjCpf, formatarNomeCliente } from '../utils/formatters';
import DatePickerPT from './DatePickerPT';
import {
  STATUS_LABELS,
  STATUS_OPCOES_OS,
  STATUS_OPCOES_PROPOSTA,
  STATUS_OPCOES_VENDA,
  normalizarStatusParaLookup,
} from '@/config/propostas';

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
  tipoDocumento?: 'proposta' | 'venda' | 'os';
  statusProposta?: string;
  setStatusProposta?: (status: string) => void;
  vendedores: Vendedor[];
  vendedorSelecionado: string | null;
  setVendedorSelecionado: (id: string | null) => void;
  responsaveis: Array<{ id_usuario: string; nome_completo: string | null }>;
  responsavelSelecionado: string | null;
  setResponsavelSelecionado: (id: string | null) => void;
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
  tipoDocumento = 'proposta',
  statusProposta,
  setStatusProposta,
  vendedores,
  vendedorSelecionado,
  setVendedorSelecionado,
  responsaveis,
  responsavelSelecionado,
  setResponsavelSelecionado,
}: InformacoesBasicasProps) {
  const tituloDocumento = tipoDocumento === 'os' ? 'ordem de serviço' : tipoDocumento === 'venda' ? 'venda' : 'proposta';

  const clienteInputRef = useRef<HTMLDivElement>(null);
  const clienteBuscaRef = useRef<HTMLInputElement>(null);
  const vendedorDropdownRef = useRef<HTMLDivElement>(null);
  const responsavelDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const [mostrarDropdownVendedor, setMostrarDropdownVendedor] = useState(false);
  const [mostrarDropdownResponsavel, setMostrarDropdownResponsavel] = useState(false);
  const [mostrarDropdownStatus, setMostrarDropdownStatus] = useState(false);
  const [editandoCliente, setEditandoCliente] = useState(false);

  const vendedorSelecionadoNome = useMemo(
    () => vendedores.find((vendedor) => vendedor.id === vendedorSelecionado)?.nome_completo || '',
    [vendedores, vendedorSelecionado]
  );

  const responsavelSelecionadoNome = useMemo(
    () => responsaveis.find((responsavel) => responsavel.id_usuario === responsavelSelecionado)?.nome_completo || '',
    [responsaveis, responsavelSelecionado]
  );

  const opcoesStatus =
    tipoDocumento === 'venda' ? STATUS_OPCOES_VENDA : tipoDocumento === 'os' ? STATUS_OPCOES_OS : STATUS_OPCOES_PROPOSTA;
  const statusAtual = normalizarStatusParaLookup(statusProposta || '');

  const campoTextoClass =
    'w-full px-3 py-2.5 text-sm rounded-lg border border-blue-500/30 dark:border-blue-400/30 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed';
  const campoTextoDisabledClass =
    'w-full px-3 py-2.5 text-sm rounded-lg border border-blue-500/30 dark:border-blue-400/30 bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 cursor-not-allowed';
  const campoSelecaoClass =
    'w-full min-h-[42px] flex items-center justify-between gap-2 px-3 py-2.5 text-sm rounded-lg border border-blue-500/30 dark:border-blue-400/30 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed';

  const formatarStatus = (status?: string) => {
    if (!status) return 'Aguardando Envio';
    return STATUS_LABELS[normalizarStatusParaLookup(status)] || status;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (clienteInputRef.current && !clienteInputRef.current.contains(target)) {
        setMostrarSugestoes(false);
        if (clienteSelecionado) setEditandoCliente(false);
      }
      if (vendedorDropdownRef.current && !vendedorDropdownRef.current.contains(target)) {
        setMostrarDropdownVendedor(false);
      }
      if (responsavelDropdownRef.current && !responsavelDropdownRef.current.contains(target)) {
        setMostrarDropdownResponsavel(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(target)) {
        setMostrarDropdownStatus(false);
      }
    };

    if (mostrarSugestoes || mostrarDropdownVendedor || mostrarDropdownResponsavel || mostrarDropdownStatus) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [
    clienteSelecionado,
    mostrarSugestoes,
    mostrarDropdownVendedor,
    mostrarDropdownResponsavel,
    mostrarDropdownStatus,
    setMostrarSugestoes,
  ]);

  useEffect(() => {
    if (editandoCliente && clienteBuscaRef.current) {
      clienteBuscaRef.current.focus();
      clienteBuscaRef.current.select();
    }
  }, [editandoCliente]);

  const renderStatusField = () => (
    <div className="min-w-0 relative" ref={statusDropdownRef}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
      {!isViewMode && setStatusProposta ? (
        <>
          <button
            type="button"
            onClick={() => setMostrarDropdownStatus((prev) => !prev)}
            className={campoSelecaoClass}
          >
            <span className={`min-w-0 truncate text-left ${statusAtual ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
              {statusAtual ? formatarStatus(statusProposta) : 'Selecione o status'}
            </span>
            <ChevronDown
              size={16}
              className={`text-gray-500 dark:text-gray-400 flex-shrink-0 transition-transform ${mostrarDropdownStatus ? 'rotate-180' : ''}`}
            />
          </button>

          <div
            className={`absolute z-20 mt-2 w-full origin-top overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-xl transition-all duration-200 ease-out dark:border-[#262626] dark:bg-neutral-900 ${
              mostrarDropdownStatus
                ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                : 'pointer-events-none -translate-y-1 scale-[0.98] opacity-0'
            }`}
          >
            <div className="max-h-60 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
              {opcoesStatus.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setStatusProposta(opt.value);
                    setMostrarDropdownStatus(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                >
                  <span>{opt.label}</span>
                  {statusAtual === opt.value && <Check size={15} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <input type="text" value={formatarStatus(statusProposta)} disabled className={campoTextoDisabledClass} />
      )}
    </div>
  );

  const renderVendedorField = () => (
    <div className="relative" ref={vendedorDropdownRef}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vendedor</label>
      <button
        type="button"
        onClick={() => {
          if (!isViewMode) setMostrarDropdownVendedor((prev) => !prev);
        }}
        disabled={isViewMode}
        className={campoSelecaoClass}
      >
        <span className={vendedorSelecionadoNome ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
          {vendedorSelecionadoNome || 'Selecione um vendedor'}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-500 dark:text-gray-400 transition-transform ${mostrarDropdownVendedor ? 'rotate-180' : ''}`}
        />
      </button>

      {mostrarDropdownVendedor && !isViewMode && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 shadow-xl">
          <button
            type="button"
            onClick={() => {
              setVendedorSelecionado(null);
              setMostrarDropdownVendedor(false);
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
          >
            <span>Nenhum vendedor</span>
            {!vendedorSelecionado && <Check size={15} className="text-blue-600 dark:text-blue-400" />}
          </button>
          <div className="max-h-60 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
            {vendedores.map((vendedor) => (
              <button
                key={vendedor.id}
                type="button"
                onClick={() => {
                  setVendedorSelecionado(vendedor.id);
                  setMostrarDropdownVendedor(false);
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
              >
                <span>{vendedor.nome_completo}</span>
                {vendedorSelecionado === vendedor.id && <Check size={15} className="text-blue-600 dark:text-blue-400" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderResponsavelField = () => (
    <div className="relative" ref={responsavelDropdownRef}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Responsável</label>
      <button
        type="button"
        onClick={() => {
          if (!isViewMode) setMostrarDropdownResponsavel((prev) => !prev);
        }}
        disabled={isViewMode}
        className={campoSelecaoClass}
      >
        <span className={responsavelSelecionadoNome ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
          {responsavelSelecionadoNome || 'Selecione um responsável'}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-500 dark:text-gray-400 transition-transform ${mostrarDropdownResponsavel ? 'rotate-180' : ''}`}
        />
      </button>

      {mostrarDropdownResponsavel && !isViewMode && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 shadow-xl">
          <button
            type="button"
            onClick={() => {
              setResponsavelSelecionado(null);
              setMostrarDropdownResponsavel(false);
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
          >
            <span>Nenhum responsável</span>
            {!responsavelSelecionado && <Check size={15} className="text-blue-600 dark:text-blue-400" />}
          </button>
          <div className="max-h-60 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
            {responsaveis.map((responsavel) => (
              <button
                key={responsavel.id_usuario}
                type="button"
                onClick={() => {
                  setResponsavelSelecionado(responsavel.id_usuario);
                  setMostrarDropdownResponsavel(false);
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
              >
                <span>{responsavel.nome_completo || 'Sem nome'}</span>
                {responsavelSelecionado === responsavel.id_usuario && <Check size={15} className="text-blue-600 dark:text-blue-400" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-black">
      <div className="mb-6 flex items-start gap-3">
        <div className="inline-flex h-10 w-10 min-w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
          <FileText size={18} />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Informações Básicas</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{`Preencha os dados principais da ${tituloDocumento}`}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[60px,minmax(0,1fr)]">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Número</label>
              <input
                type="text"
                value={formData.numeroProposta}
                onChange={(e) => setFormData({ ...formData, numeroProposta: e.target.value.replace(/\D/g, '') })}
                disabled={isViewMode}
                maxLength={4}
                className={campoTextoClass}
              />
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {tipoDocumento === 'os'
                  ? 'Título da Ordem de Serviço'
                  : tipoDocumento === 'venda'
                    ? 'Título da Venda'
                    : 'Título da Proposta'}
              </label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                disabled={isViewMode}
                placeholder={tipoDocumento === 'proposta' ? 'Proposta > 7070' : 'Ex: Consultoria Empresarial'}
                className={campoTextoClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr),220px]">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descrição</label>
              <input
                type="text"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                disabled={isViewMode}
                placeholder={
                  tipoDocumento === 'os'
                    ? 'Descreva a ordem de serviço'
                    : tipoDocumento === 'venda'
                      ? 'Descreva a venda'
                      : 'Descreva a proposta'
                }
                className={campoTextoClass}
              />
            </div>
            {renderStatusField()}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="relative" ref={clienteInputRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cliente *</label>
            {!clienteSelecionado || editandoCliente ? (
              <input
                ref={clienteBuscaRef}
                type="text"
                value={busca}
                onChange={(e) => atualizarBusca(e.target.value)}
                onFocus={() => busca && setMostrarSugestoes(true)}
                onBlur={() => {
                  if (clienteSelecionado && busca === clienteSelecionado.nome_razao_social) {
                    setEditandoCliente(false);
                  }
                }}
                disabled={isViewMode}
                placeholder="Digite o nome ou CNPJ do cliente..."
                className={campoTextoClass}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditandoCliente(true)}
                disabled={isViewMode}
                className={campoSelecaoClass}
              >
                <span className="truncate block text-sm font-medium leading-normal">{formatarNomeCliente(clienteSelecionado)}</span>
              </button>
            )}

            {mostrarSugestoes && clientesFiltrados.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-800 border border-[#E5E7EB] dark:border-[#262626] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {clientesFiltrados.map((cliente) => (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() => {
                      selecionarCliente(cliente);
                      setEditandoCliente(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors border-b border-[#E5E7EB] dark:border-[#262626] last:border-b-0"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">{cliente.nome_razao_social}</div>
                    {cliente.nome_fantasia && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">{cliente.nome_fantasia}</div>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {cliente.cnpj ? `CNPJ ${formatarCnpjCpf(cliente.cnpj)}` : cliente.cpf ? `CPF ${formatarCnpjCpf(cliente.cpf)}` : ''}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CNPJ / CPF</label>
            <input
              type="text"
              value={clienteSelecionado ? formatarCnpjCpf(clienteSelecionado.cnpj || clienteSelecionado.cpf) : ''}
              disabled
              readOnly
              className={campoTextoDisabledClass}
            />
          </div>

        </div>

        {tipoDocumento !== 'os' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {tipoDocumento === 'venda' ? 'Data da Venda *' : 'Data da Proposta *'}
              </label>
              <DatePickerPT
                value={formData.dataProposta}
                onChange={(value) => setFormData({ ...formData, dataProposta: value })}
                disabled={isViewMode}
              />
            </div>
            <div className="min-w-0">{renderVendedorField()}</div>
          </div>
        )}

        {tipoDocumento === 'os' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="min-w-0">{renderResponsavelField()}</div>
            <div className="min-w-0">{renderVendedorField()}</div>
          </div>
        )}

        {tipoDocumento !== 'os' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Data de Validade *</label>
              <DatePickerPT
                value={formData.dataValidade}
                onChange={(value) => setFormData({ ...formData, dataValidade: value })}
                disabled={isViewMode}
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prazo de Entrega</label>
              <DatePickerPT
                value={formData.prazoEntrega}
                onChange={(value) => setFormData({ ...formData, prazoEntrega: value })}
                disabled={isViewMode}
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prazo de Garantia</label>
              <DatePickerPT
                value={formData.prazoGarantia}
                onChange={(value) => setFormData({ ...formData, prazoGarantia: value })}
                disabled={isViewMode}
              />
            </div>
          </div>
        )}

        {tipoDocumento === 'os' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prazo de Entrega</label>
              <DatePickerPT
                value={formData.prazoEntrega}
                onChange={(value) => setFormData({ ...formData, prazoEntrega: value })}
                disabled={isViewMode}
              />
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prazo de Garantia</label>
              <DatePickerPT
                value={formData.prazoGarantia}
                onChange={(value) => setFormData({ ...formData, prazoGarantia: value })}
                disabled={isViewMode}
              />
            </div>
          </div>
        )}

        {false && codigoVendaGerada && tipoDocumento !== 'venda' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Código da Venda Gerada</label>
            <input type="text" value={codigoVendaGerada || ''} disabled className={campoTextoDisabledClass} />
          </div>
        )}

        {false && codigoPropostaOrigem && tipoDocumento === 'venda' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Código da Proposta de Origem</label>
            <input type="text" value={codigoPropostaOrigem || ''} disabled className={campoTextoDisabledClass} />
          </div>
        )}
      </div>
    </div>
  );
}
