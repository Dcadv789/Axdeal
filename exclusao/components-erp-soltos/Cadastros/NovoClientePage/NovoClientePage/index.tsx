'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertCircle,
  ChevronDown,
  Copy,
  CreditCard,
  FileText,
  History,
  Loader2,
  MapPin,
  MessageCircle,
  Search,
  User,
} from 'lucide-react';
import type { ClienteFormData, NovoClientePageProps } from './types';
import { useClienteData } from './hooks/useClienteData';
import { useViaCEP } from './hooks/useViaCEP';
import { useCnpjLookup } from './hooks/useCnpjLookup';
import {
  formatarCEP,
  formatarCNPJ,
  formatarCPF,
  formatarTelefone,
  removerFormatacao,
} from './utils/formatters';

type ClienteTab = 'geral' | 'detalhes' | 'contatos' | 'endereco' | 'financeiro' | 'historico';

const CLIENTE_TABS: Array<{ id: ClienteTab; label: string }> = [
  { id: 'geral', label: 'Geral' },
  { id: 'detalhes', label: 'Detalhes' },
  { id: 'contatos', label: 'Contatos' },
  { id: 'endereco', label: 'Endereço' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'historico', label: 'Histórico' },
];

const PIX_KEY_TYPES = [
  { value: 'email', label: 'E-mail' },
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'aleatoria', label: 'Aleatória' },
];

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/10';

const readOnlyClassName =
  'read-only:bg-slate-50 read-only:text-slate-600 dark:read-only:bg-neutral-950 dark:read-only:text-slate-300';

function getTabFromHash(hash: string): ClienteTab {
  const normalizedHash = hash.replace('#', '') as ClienteTab;
  return CLIENTE_TABS.some((tab) => tab.id === normalizedHash) ? normalizedHash : 'geral';
}

function getInitials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return 'CL';

  return parts.map((part) => part[0]?.toUpperCase() || '').join('');
}

function getInfoValue(value?: string | null, fallback = 'Não informado') {
  const content = value?.trim();
  return content ? content : fallback;
}

function getStatusLabel(status?: string) {
  return (status || 'ATIVO').toUpperCase() === 'INATIVO' ? 'Inativo' : 'Ativo';
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/70">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
        {title}
      </div>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function FutureBlock({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 dark:border-neutral-700 dark:bg-neutral-900/50">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

function TabButton({
  active,
  hasError,
  onClick,
  label,
}: {
  active: boolean;
  hasError: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-neutral-800 dark:hover:text-slate-100'
      }`}
    >
      <span>{label}</span>
      {hasError && (
        <span
          className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full ${
            active ? 'bg-red-500 text-white' : 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300'
          }`}
        >
          <AlertCircle className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}

function StyledSelect({
  value,
  onChange,
  disabled,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-sm transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100 dark:border-neutral-700 dark:from-neutral-900 dark:to-neutral-950 dark:focus:border-blue-500 dark:focus:ring-blue-500/10">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full appearance-none bg-transparent px-3.5 py-2.5 pr-14 text-sm text-slate-900 outline-none dark:text-slate-100 ${disabled ? 'cursor-not-allowed opacity-100' : 'cursor-pointer'}`}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-2 right-2 flex items-center rounded-xl border border-slate-200 bg-white px-2.5 text-slate-400 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-500">
        <ChevronDown className="h-4 w-4" />
      </span>
    </div>
  );
}

function BooleanToggleField({
  label,
  value,
  onChange,
  disabled,
  trueLabel = 'Sim',
  falseLabel = 'Não',
  trueActiveClass = 'bg-blue-600 text-white shadow-sm',
  falseActiveClass = 'bg-blue-600 text-white shadow-sm',
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  trueLabel?: string;
  falseLabel?: string;
  trueActiveClass?: string;
  falseActiveClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-950/60">
      <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-900">
        <button
          type="button"
          onClick={() => onChange(false)}
          disabled={disabled}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            !value
              ? falseActiveClass
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {falseLabel}
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          disabled={disabled}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            value
              ? trueActiveClass
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {trueLabel}
        </button>
      </div>
    </div>
  );
}

function InfoNotice({
  isOpen,
  title,
  message,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NovoClientePage({
  onBack,
  onSaveSuccess,
  onSavingChange,
  mode,
  clienteId,
}: NovoClientePageProps) {
  const {
    loading,
    loadingForm,
    formData,
    setFormData,
    saveCliente,
    saveError,
    setSaveError,
  } = useClienteData(clienteId, mode);

  const [activeTab, setActiveTab] = useState<ClienteTab>('geral');
  const [cnpjNotice, setCnpjNotice] = useState<string | null>(null);
  const [pixCopied, setPixCopied] = useState(false);

  const { buscarCEP, carregando: cepCarregando, erro: cepErro, limparErro: limparCepErro } = useViaCEP();
  const { buscarCNPJ, carregando: cnpjCarregando, erro: cnpjErro, limparErro: limparCnpjErro } = useCnpjLookup();

  const isView = mode === 'view';
  const readOnly = isView;
  const formId = 'cliente-details-form';

  useEffect(() => {
    onSavingChange?.(loading);
  }, [loading, onSavingChange]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncHash = () => {
      setActiveTab(getTabFromHash(window.location.hash));
    };

    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const { pathname, search, hash } = window.location;
    const nextHash = `#${activeTab}`;
    if (hash !== nextHash) {
      window.history.replaceState(null, '', `${pathname}${search}${nextHash}`);
    }
  }, [activeTab]);

  const handleChange = (field: keyof typeof formData, value: ClienteFormData[keyof ClienteFormData]) => {
    setSaveError(null);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleIsentoIeChange = (isento: boolean) => {
    setSaveError(null);
    setFormData((prev) => ({
      ...prev,
      isento_ie: isento,
      inscricao_estadual: isento ? '' : prev.inscricao_estadual,
    }));
  };

  const handleCepBlur = () => {
    const cep = removerFormatacao(formData.cep || '');
    if (cep.length === 8) {
      limparCepErro();
      buscarCEP(formData.cep || '', setFormData);
    }
  };

  const handleBuscarCNPJ = async () => {
    const cnpj = removerFormatacao(formData.cpf_cnpj || '');
    if (cnpj.length === 14) {
      limparCnpjErro();
      const resultado = await buscarCNPJ(formData.cpf_cnpj || '', setFormData);
      if (!resultado.ok && resultado.reason === 'not_found') {
        setCnpjNotice('Nenhum dado foi retornado para esse CNPJ.');
        limparCnpjErro();
      }
    }
  };

  const handleCopyPix = async () => {
    const pixKey = String(formData.chave_pix || '').trim();
    if (!pixKey || typeof navigator === 'undefined' || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(pixKey);
      setPixCopied(true);
      window.setTimeout(() => setPixCopied(false), 1600);
    } catch {
      setPixCopied(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const ok = await saveCliente();
    if (ok) {
      if (onSaveSuccess) {
        onSaveSuccess();
      } else {
        onBack();
      }
    }
  };

  const statusLabel = getStatusLabel(formData.status);
  const codigoCliente = String(formData.codigo_cliente || '').replace(/\D/g, '');
  const displayName =
    formData.nome.trim() || (mode === 'create' ? 'Novo cliente' : 'Cliente sem identificação');
  const displaySecondary =
    formData.tipo_pessoa === 'PJ'
      ? getInfoValue(formData.nome_fantasia, 'Pessoa jurídica')
      : 'Pessoa física';

  const documentoLabel = formData.tipo_pessoa === 'PF' ? 'CPF' : 'CNPJ';
  const documentoFormatado =
    formData.tipo_pessoa === 'PF'
      ? formatarCPF(formData.cpf_cnpj || '')
      : formatarCNPJ(formData.cpf_cnpj || '');
  const inscricaoEstadualValue = formData.isento_ie ? 'ISENTO' : formData.inscricao_estadual || '';

  const whatsappPrincipal = formatarTelefone(formData.whatsapp || formData.telefone || '');
  const nomeContato = getInfoValue(formData.nome_contato);
  const localidade =
    formData.cidade || formData.uf
      ? `${getInfoValue(formData.cidade, '')}${formData.cidade && formData.uf ? ' / ' : ''}${getInfoValue(formData.uf, '')}`.trim() || 'NÃ£o informado'
      : 'NÃ£o informado';

  const tabErrors = useMemo<Record<ClienteTab, boolean>>(
    () => ({
      geral: Boolean(saveError || cnpjErro),
      detalhes: false,
      contatos: false,
      endereco: Boolean(cepErro),
      financeiro: false,
      historico: false,
    }),
    [cnpjErro, cepErro, saveError]
  );

  const handleTabChange = (tab: ClienteTab) => {
    setActiveTab(tab);
  };

  if (loadingForm) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <InfoNotice
        isOpen={Boolean(cnpjNotice)}
        title="Consulta de CNPJ"
        message={cnpjNotice || ''}
        onClose={() => setCnpjNotice(null)}
      />

      <div className="sticky top-0 z-20 space-y-3 bg-[#f5f7fb] pb-0 dark:bg-[#171717]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
          <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                {getInitials(displayName)}
              </div>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="truncate text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {displayName}
                  </h2>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      statusLabel === 'Ativo'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-neutral-800 dark:text-slate-300'
                    }`}
                  >
                    {statusLabel}
                  </span>
                  {codigoCliente && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-neutral-800 dark:text-slate-300">
                      #{codigoCliente}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{displaySecondary}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-neutral-800 dark:text-slate-300">
                    <CreditCard className="h-3.5 w-3.5" />
                    {documentoLabel}: {getInfoValue(documentoFormatado)}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-neutral-800 dark:text-slate-300">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {getInfoValue(whatsappPrincipal)}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-neutral-800 dark:text-slate-300">
                    <User className="h-3.5 w-3.5" />
                    {nomeContato}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-slate-200 px-5 py-4 md:grid-cols-3 dark:border-neutral-800">
            <SummaryCard
              title="WhatsApp"
              value={getInfoValue(whatsappPrincipal)}
              icon={<MessageCircle className="h-3.5 w-3.5" />}
            />
            <SummaryCard
              title="Nome do contato"
              value={nomeContato}
              icon={<User className="h-3.5 w-3.5" />}
            />
            <SummaryCard
              title="Localidade"
              value={
                formData.cidade || formData.uf
                  ? `${getInfoValue(formData.cidade, '')}${formData.cidade && formData.uf ? ' / ' : ''}${getInfoValue(formData.uf, '')}`.trim() || 'Não informado'
                  : 'Não informado'
              }
              icon={<MapPin className="h-3.5 w-3.5" />}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/95 px-2 py-2 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
          <div className="flex flex-wrap gap-2">
            {CLIENTE_TABS.map((tab) => (
              <TabButton
                key={tab.id}
                active={activeTab === tab.id}
                hasError={tabErrors[tab.id]}
                onClick={() => handleTabChange(tab.id)}
                label={tab.label}
              />
            ))}
          </div>
        </div>
      </div>

      {saveError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {saveError}
        </div>
      )}

      {(cepErro || cnpjErro) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          {cepErro || cnpjErro}
        </div>
      )}

      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        {activeTab === 'geral' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Informações gerais</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Dados principais do cliente e documento fiscal.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-950/60">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Tipo de pessoa
                </p>
                <div className="flex flex-wrap gap-4">
                  <label
                    className={`flex min-w-[220px] cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                      formData.tipo_pessoa === 'PF'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-400/60 dark:bg-blue-500/10 dark:text-blue-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipo_pessoa"
                      checked={formData.tipo_pessoa === 'PF'}
                      onChange={() => handleChange('tipo_pessoa', 'PF')}
                      disabled={readOnly}
                      className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Pessoa Física
                  </label>
                  <label
                    className={`flex min-w-[220px] cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                      formData.tipo_pessoa === 'PJ'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-400/60 dark:bg-blue-500/10 dark:text-blue-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipo_pessoa"
                      checked={formData.tipo_pessoa === 'PJ'}
                      onChange={() => handleChange('tipo_pessoa', 'PJ')}
                      disabled={readOnly}
                      className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Pessoa Jurídica
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {formData.tipo_pessoa === 'PF' ? 'Nome completo' : 'Razão social'}
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => handleChange('nome', e.target.value)}
                    readOnly={readOnly}
                    required
                    className={`${inputClassName} ${readOnlyClassName}`}
                    placeholder={formData.tipo_pessoa === 'PF' ? 'Nome completo' : 'Razão social'}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nome fantasia
                  </label>
                  <input
                    type="text"
                    value={formData.nome_fantasia || ''}
                    onChange={(e) => handleChange('nome_fantasia', e.target.value)}
                    readOnly={readOnly}
                    className={`${inputClassName} ${readOnlyClassName}`}
                    placeholder="Nome fantasia"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {documentoLabel}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={documentoFormatado}
                      onChange={(e) => handleChange('cpf_cnpj', removerFormatacao(e.target.value))}
                      onBlur={formData.tipo_pessoa === 'PJ' ? handleBuscarCNPJ : undefined}
                      readOnly={readOnly}
                      className={`${inputClassName} ${readOnlyClassName} flex-1`}
                      placeholder={formData.tipo_pessoa === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'}
                    />
                    {formData.tipo_pessoa === 'PJ' && !readOnly && (
                      <button
                        type="button"
                        onClick={handleBuscarCNPJ}
                        disabled={cnpjCarregando}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-neutral-700 dark:text-slate-300 dark:hover:bg-neutral-800"
                      >
                        {cnpjCarregando ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                        Buscar
                      </button>
                    )}
                  </div>
                </div>

                {formData.tipo_pessoa === 'PJ' && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Inscrição estadual
                    </label>
                    <div className="flex flex-col gap-2 xl:flex-row xl:items-end">
                    <div className="order-2 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-neutral-700 dark:bg-neutral-950/60">
                      <button
                        type="button"
                        onClick={() => handleIsentoIeChange(false)}
                        disabled={readOnly}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          !formData.isento_ie
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                      >
                        Não isento
                      </button>
                      <button
                        type="button"
                        onClick={() => handleIsentoIeChange(true)}
                        disabled={readOnly}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          formData.isento_ie
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                      >
                        Isento
                      </button>
                    </div>
                    <input
                      type="text"
                      value={inscricaoEstadualValue}
                      onChange={(e) => handleChange('inscricao_estadual', e.target.value)}
                      readOnly={readOnly || Boolean(formData.isento_ie)}
                      className={`${inputClassName} ${readOnlyClassName} order-1 flex-1`}
                      placeholder="Número da inscrição estadual"
                    />
                    </div>
                  </div>
                )}
              </div>

            </div>
          </section>
        )}

        {activeTab === 'detalhes' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Detalhes</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Dados complementares do cliente e informações cadastrais.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Código do Cliente
                </label>
                <input
                  type="text"
                  value={formData.codigo_cliente || ''}
                  onChange={(e) => handleChange('codigo_cliente', e.target.value.replace(/\D/g, ''))}
                  readOnly={readOnly}
                  className={`${inputClassName} ${readOnlyClassName}`}
                  placeholder="Gerado automaticamente"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {formData.tipo_pessoa === 'PF' ? 'Data de nascimento' : 'Data de fundação'}
                </label>
                <input
                  type="date"
                  value={formData.data_nascimento_fundacao || ''}
                  onChange={(e) => handleChange('data_nascimento_fundacao', e.target.value)}
                  readOnly={readOnly}
                  className={`${inputClassName} ${readOnlyClassName}`}
                />
              </div>

              <div className={formData.tipo_pessoa === 'PJ' ? 'hidden' : ''}>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Gênero
                </label>
                <StyledSelect
                  value={formData.genero || ''}
                  onChange={(value) => handleChange('genero', value)}
                  disabled={readOnly}
                >
                  <option value="">Selecione</option>
                  <option value="FEMININO">Feminino</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="NAO_INFORMADO">Não informar</option>
                </StyledSelect>
              </div>

              {formData.tipo_pessoa === 'PJ' && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Porte
                    </label>
                    <input
                      type="text"
                      value={formData.porte || ''}
                      onChange={(e) => handleChange('porte', e.target.value)}
                      readOnly={readOnly}
                      className={`${inputClassName} ${readOnlyClassName}`}
                      placeholder="ME, EPP, LTDA..."
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Natureza jurídica
                    </label>
                    <input
                      type="text"
                      value={formData.natureza_juridica || ''}
                      onChange={(e) => handleChange('natureza_juridica', e.target.value)}
                      readOnly={readOnly}
                      className={`${inputClassName} ${readOnlyClassName}`}
                      placeholder="Natureza jurídica"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Opção pelo Simples
                    </label>
                    <StyledSelect
                      value={formData.opcao_pelo_simples || ''}
                      onChange={(value) => handleChange('opcao_pelo_simples', value)}
                      disabled={readOnly}
                    >
                      <option value="">Selecione</option>
                      <option value="SIM">Sim</option>
                      <option value="NAO">Não</option>
                    </StyledSelect>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Opção pelo MEI
                    </label>
                    <StyledSelect
                      value={formData.opcao_pelo_mei || ''}
                      onChange={(value) => handleChange('opcao_pelo_mei', value)}
                      disabled={readOnly}
                    >
                      <option value="">Selecione</option>
                      <option value="SIM">Sim</option>
                      <option value="NAO">Não</option>
                    </StyledSelect>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Nome do sócio
                    </label>
                    <input
                      type="text"
                      value={formData.nome_socio || ''}
                      onChange={(e) => handleChange('nome_socio', e.target.value)}
                      readOnly={readOnly}
                      className={`${inputClassName} ${readOnlyClassName}`}
                      placeholder="Nome do sócio principal"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Qualificação do sócio
                    </label>
                    <input
                      type="text"
                      value={formData.qualificacao_socio || ''}
                      onChange={(e) => handleChange('qualificacao_socio', e.target.value)}
                      readOnly={readOnly}
                      className={`${inputClassName} ${readOnlyClassName}`}
                      placeholder="Qualificação do sócio"
                    />
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {activeTab === 'contatos' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Contatos</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Canais principais de contato do cliente.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nome do contato
                </label>
                <input
                  type="text"
                  value={formData.nome_contato || ''}
                  onChange={(e) => handleChange('nome_contato', e.target.value)}
                  readOnly={readOnly}
                  className={`${inputClassName} ${readOnlyClassName}`}
                  placeholder="Nome do contato"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  E-mail
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  readOnly={readOnly}
                  className={`${inputClassName} ${readOnlyClassName}`}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  E-mail secundário / CC
                </label>
                <input
                  type="email"
                  value={formData.email_secundario_cc || ''}
                  onChange={(e) => handleChange('email_secundario_cc', e.target.value)}
                  readOnly={readOnly}
                  className={`${inputClassName} ${readOnlyClassName}`}
                  placeholder="financeiro@empresa.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Telefone
                </label>
                <input
                  type="text"
                  value={formatarTelefone(formData.telefone || '')}
                  onChange={(e) => handleChange('telefone', removerFormatacao(e.target.value))}
                  readOnly={readOnly}
                  className={`${inputClassName} ${readOnlyClassName}`}
                  placeholder="(11) 3333-0000"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Telefone do contato
                </label>
                <input
                  type="text"
                  value={formatarTelefone(formData.telefone_contato || '')}
                  onChange={(e) => handleChange('telefone_contato', removerFormatacao(e.target.value))}
                  readOnly={readOnly}
                  className={`${inputClassName} ${readOnlyClassName}`}
                  placeholder="(11) 98888-7777"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  WhatsApp
                </label>
                <input
                  type="text"
                  value={formatarTelefone(formData.whatsapp || '')}
                  onChange={(e) => handleChange('whatsapp', removerFormatacao(e.target.value))}
                  readOnly={readOnly}
                  className={`${inputClassName} ${readOnlyClassName}`}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Site
                </label>
                <input
                  type="text"
                  value={formData.site || ''}
                  onChange={(e) => handleChange('site', e.target.value)}
                  readOnly={readOnly}
                  className={`${inputClassName} ${readOnlyClassName}`}
                  placeholder="https://empresa.com.br"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Instagram
                </label>
                <input
                  type="text"
                  value={formData.instagram || ''}
                  onChange={(e) => handleChange('instagram', e.target.value)}
                  readOnly={readOnly}
                  className={`${inputClassName} ${readOnlyClassName}`}
                  placeholder="@empresa"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Link do Instagram
                </label>
                <input
                  type="text"
                  value={formData.site_instagram || ''}
                  onChange={(e) => handleChange('site_instagram', e.target.value)}
                  readOnly={readOnly}
                  className={`${inputClassName} ${readOnlyClassName}`}
                  placeholder="https://instagram.com/empresa"
                />
              </div>
            </div>
          </section>
        )}

        {activeTab === 'endereco' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Endereço</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Localização e dados logísticos do cliente.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">CEP</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formatarCEP(formData.cep || '')}
                    onChange={(e) => handleChange('cep', removerFormatacao(e.target.value))}
                    onBlur={handleCepBlur}
                    readOnly={readOnly}
                    className={`${inputClassName} ${readOnlyClassName} flex-1`}
                    placeholder="00000-000"
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={handleCepBlur}
                      disabled={cepCarregando}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-neutral-700 dark:text-slate-300 dark:hover:bg-neutral-800"
                    >
                      {cepCarregando ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      Buscar
                    </button>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Logradouro
                </label>
                <input
                  type="text"
                  value={formData.logradouro || ''}
                  onChange={(e) => handleChange('logradouro', e.target.value)}
                  readOnly={readOnly}
                  className={`${inputClassName} ${readOnlyClassName}`}
                  placeholder="Rua, avenida..."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Número
                </label>
                <input
                  type="text"
                  value={formData.numero || ''}
                  onChange={(e) => handleChange('numero', e.target.value)}
                  readOnly={readOnly}
                  className={`${inputClassName} ${readOnlyClassName}`}
                  placeholder="Nº"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Complemento
                </label>
                <input
                  type="text"
                  value={formData.complemento || ''}
                  onChange={(e) => handleChange('complemento', e.target.value)}
                  readOnly={readOnly}
                  className={`${inputClassName} ${readOnlyClassName}`}
                  placeholder="Apto, sala..."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Bairro
                </label>
                <input
                  type="text"
                  value={formData.bairro || ''}
                  onChange={(e) => handleChange('bairro', e.target.value)}
                  readOnly={readOnly}
                  className={`${inputClassName} ${readOnlyClassName}`}
                  placeholder="Bairro"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Cidade
                </label>
                <input
                  type="text"
                  value={formData.cidade || ''}
                  onChange={(e) => handleChange('cidade', e.target.value)}
                  readOnly={readOnly}
                  className={`${inputClassName} ${readOnlyClassName}`}
                  placeholder="Cidade"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">UF</label>
                <input
                  type="text"
                  value={formData.uf || ''}
                  onChange={(e) => handleChange('uf', e.target.value.toUpperCase().slice(0, 2))}
                  readOnly={readOnly}
                  maxLength={2}
                  className={`${inputClassName} ${readOnlyClassName}`}
                  placeholder="UF"
                />
              </div>
            </div>
          </section>
        )}

        {activeTab === 'financeiro' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Financeiro</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Estrutura reservada para dados financeiros do cliente.
              </p>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  ID régua de cobrança
                </label>
                <input
                  type="text"
                  value={formData.id_regua_cobranca || ''}
                  onChange={(e) => handleChange('id_regua_cobranca', e.target.value)}
                  readOnly={readOnly}
                  className={`${inputClassName} ${readOnlyClassName}`}
                  placeholder="UUID da régua"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Limite de crédito
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.limite_credito || '0'}
                  onChange={(e) => handleChange('limite_credito', e.target.value)}
                  readOnly={readOnly}
                  className={`${inputClassName} ${readOnlyClassName}`}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Status
                </label>
                <select
                  value={formData.status || 'ATIVO'}
                  onChange={(e) => handleChange('status', e.target.value)}
                  disabled={readOnly}
                  className={inputClassName}
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Classificação de risco
                </label>
                <select
                  value={formData.classificacao_risco || 'BOM'}
                  onChange={(e) => handleChange('classificacao_risco', e.target.value)}
                  disabled={readOnly}
                  className={inputClassName}
                >
                  <option value="BOM">Bom</option>
                  <option value="MODERADO">Moderado</option>
                  <option value="ALTO_RISCO">Alto risco</option>
                </select>
              </div>

            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <BooleanToggleField
                  label="Cliente bloqueado"
                  value={Boolean(formData.bloqueado)}
                  onChange={(value) => handleChange('bloqueado', value)}
                  disabled={readOnly}
                  falseActiveClass="bg-blue-600 text-white shadow-sm"
                  trueActiveClass="bg-red-600 text-white shadow-sm"
                />

                <BooleanToggleField
                  label="Aceita marketing"
                  value={Boolean(formData.aceita_marketing)}
                  onChange={(value) => handleChange('aceita_marketing', value)}
                  disabled={readOnly}
                  falseActiveClass="bg-red-600 text-white shadow-sm"
                  trueActiveClass="bg-blue-600 text-white shadow-sm"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-neutral-800 dark:bg-neutral-950/60">
                <div className="grid gap-4 xl:grid-cols-[0.55fr_1.35fr_0.9fr] xl:items-end">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Tipo de chave Pix
                    </label>
                    <StyledSelect
                      value={formData.tipo_chave_pix || 'email'}
                      onChange={(value) => handleChange('tipo_chave_pix', value)}
                      disabled={readOnly}
                    >
                      {PIX_KEY_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </StyledSelect>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Chave Pix
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={formData.chave_pix || ''}
                        onChange={(e) => handleChange('chave_pix', e.target.value)}
                        readOnly={readOnly}
                        className={`${inputClassName} ${readOnlyClassName} flex-1`}
                        placeholder="Digite a chave Pix"
                      />
                      <button
                        type="button"
                        onClick={handleCopyPix}
                        disabled={!String(formData.chave_pix || '').trim()}
                        aria-label="Copiar chave Pix"
                        className="inline-flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-300 dark:hover:bg-neutral-800"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Nome do banco
                    </label>
                    <input
                      type="text"
                      value={formData.banco_nome || ''}
                      onChange={(e) => handleChange('banco_nome', e.target.value)}
                      readOnly={readOnly}
                      className={`${inputClassName} ${readOnlyClassName}`}
                      placeholder="Digite o nome do banco"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <FutureBlock
                title="Limite de crédito"
                description="Espaço preparado para política de crédito e exposição total do cliente."
              />
              <FutureBlock
                title="Histórico de pagamentos"
                description="Área pronta para mostrar pagamentos em dia, atrasos e comportamento financeiro."
              />
              <FutureBlock
                title="Banco"
                description="Bloco reservado para banco principal, agência, conta e preferências de cobrança."
              />
            </div>
          </section>
        )}

        {activeTab === 'historico' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Histórico</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Contexto comercial e observações relevantes do cliente.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Segmento
                    </label>
                    <input
                      type="text"
                      value={formData.segmento || ''}
                      onChange={(e) => handleChange('segmento', e.target.value)}
                      readOnly={readOnly}
                      className={`${inputClassName} ${readOnlyClassName}`}
                      placeholder="Segmento"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Origem
                    </label>
                    <input
                      type="text"
                      value={formData.origem || ''}
                      onChange={(e) => handleChange('origem', e.target.value)}
                      readOnly={readOnly}
                      className={`${inputClassName} ${readOnlyClassName}`}
                      placeholder="Origem do cliente"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Código externo
                    </label>
                    <input
                      type="text"
                      value={formData.codigo_externo || ''}
                      onChange={(e) => handleChange('codigo_externo', e.target.value)}
                      readOnly={readOnly}
                      className={`${inputClassName} ${readOnlyClassName}`}
                      placeholder="Código externo"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={formData.tags || ''}
                      onChange={(e) => handleChange('tags', e.target.value)}
                      readOnly={readOnly}
                      className={`${inputClassName} ${readOnlyClassName}`}
                      placeholder="vip, revenda, estratégico"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-950/60">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Observações internas
                  </label>
                  <textarea
                    value={formData.observacoes_internas || ''}
                    onChange={(e) => handleChange('observacoes_internas', e.target.value)}
                    readOnly={readOnly}
                    rows={7}
                    className={`${inputClassName} ${readOnlyClassName} resize-none`}
                    placeholder="Anotações internas sobre o cliente"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <SummaryCard
                  title="Últimas vendas"
                  value="Integração preparada para conectar pedidos e propostas desse cliente."
                  icon={<History className="h-3.5 w-3.5" />}
                />
                <SummaryCard
                  title="Interações no CRM"
                  value="Bloco preparado para timeline de atendimentos, contatos e atividades."
                  icon={<FileText className="h-3.5 w-3.5" />}
                />
              </div>
            </div>
          </section>
        )}
      </form>
    </div>
  );
}
