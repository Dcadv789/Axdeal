'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, ExternalLink, Loader2, User, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ClienteDetalhe {
  id: string;
  tipo_pessoa: string | null;
  nome_razao_social: string | null;
  nome_fantasia: string | null;
  nome_contato: string | null;
  cpf: string | null;
  cnpj: string | null;
  inscricao_estadual: string | null;
  email_financeiro: string | null;
  email_secundario_cc: string | null;
  telefone_fixo: string | null;
  telefone_contato: string | null;
  whatsapp: string | null;
  site: string | null;
  cep: string | null;
  endereco_logradouro: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
  endereco_uf: string | null;
  tipo_chave: string | null;
  chave_pix: string | null;
  nome_banco: string | null;
  observacoes_internas: string | null;
}

function formatarCnpj(valor: string | null | undefined): string {
  if (!valor) return '';
  const digits = valor.replace(/\D/g, '');
  if (digits.length !== 14) return valor;
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function formatarCpf(valor: string | null | undefined): string {
  if (!valor) return '';
  const digits = valor.replace(/\D/g, '');
  if (digits.length !== 11) return valor;
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

function formatarTelefone(valor: string | null | undefined): string {
  if (!valor) return '';
  const digits = valor.replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  if (digits.length === 10) return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  return valor;
}

function CopyField({ label, value }: { label: string; value: string | null | undefined }) {
  const [copiado, setCopiado] = useState(false);

  if (!value) return null;

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // fallback silencioso
    }
  };

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          {label}
        </p>
        <p className="break-all text-sm font-medium text-slate-800 dark:text-slate-100">{value}</p>
      </div>
      <button
        type="button"
        onClick={handleCopiar}
        title="Copiar"
        className={`mt-0.5 shrink-0 rounded-lg p-1.5 transition-colors ${
          copiado
            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
            : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-neutral-700 dark:hover:text-slate-200'
        }`}
      >
        {copiado ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
      {children}
    </p>
  );
}

interface ClienteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string | null | undefined;
}

export default function ClienteDrawer({ isOpen, onClose, clienteId }: ClienteDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [cliente, setCliente] = useState<ClienteDetalhe | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !clienteId) {
      setCliente(null);
      return;
    }

    const buscar = async () => {
      setCarregando(true);
      try {
        const { data, error } = await supabase
          .from('erp_contatos')
          .select(
            'id, tipo_pessoa, nome_razao_social, nome_fantasia, nome_contato, cpf, cnpj, inscricao_estadual, email_financeiro, email_secundario_cc, telefone_fixo, telefone_contato, whatsapp, site, cep, endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_uf, tipo_chave, chave_pix, nome_banco, observacoes_internas'
          )
          .eq('id', clienteId)
          .maybeSingle();

        if (!error && data) {
          setCliente(data as ClienteDetalhe);
        }
      } catch {
        // silencioso
      } finally {
        setCarregando(false);
      }
    };

    void buscar();
  }, [isOpen, clienteId]);

  if (!mounted || !isOpen) return null;

  const isPJ = (cliente?.tipo_pessoa || '').toUpperCase() === 'PJ';
  const nomeExibicao = cliente?.nome_razao_social || cliente?.nome_fantasia || 'Cliente';

  const enderecoCompleto = [
    cliente?.endereco_logradouro,
    cliente?.endereco_numero ? `nº ${cliente.endereco_numero}` : null,
    cliente?.endereco_complemento,
  ]
    .filter(Boolean)
    .join(', ');

  const content = (
    <>
      <div className="fixed inset-0 z-[9998] bg-black/60" onClick={onClose} />
      <div className="fixed right-0 top-0 z-[9999] flex h-full w-full max-w-[520px] flex-col overflow-x-hidden bg-white shadow-2xl dark:bg-neutral-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5 dark:border-[#262626]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {carregando ? 'Carregando...' : nomeExibicao}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isPJ ? 'Pessoa Jurídica' : 'Pessoa Física'} · Dados do cliente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {carregando ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : !clienteId ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-slate-400">
              Nenhum cliente vinculado a este documento.
            </div>
          ) : !cliente ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              Não foi possível carregar os dados do cliente.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Identificação */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-950/60">
                <SectionTitle>Identificação</SectionTitle>
                <div className="space-y-2">
                  <CopyField label="Razão Social / Nome" value={cliente.nome_razao_social} />
                  <CopyField label="Nome Fantasia" value={cliente.nome_fantasia} />
                  <CopyField label="Nome do Contato" value={cliente.nome_contato} />
                  <CopyField
                    label={isPJ ? 'CNPJ' : 'CPF'}
                    value={isPJ ? formatarCnpj(cliente.cnpj) : formatarCpf(cliente.cpf)}
                  />
                  {isPJ && <CopyField label="Inscrição Estadual" value={cliente.inscricao_estadual} />}
                </div>
              </div>

              {/* Contato */}
              {(cliente.email_financeiro || cliente.email_secundario_cc || cliente.telefone_fixo || cliente.telefone_contato || cliente.whatsapp || cliente.site) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-950/60">
                  <SectionTitle>Contato</SectionTitle>
                  <div className="space-y-2">
                    <CopyField label="E-mail" value={cliente.email_financeiro} />
                    <CopyField label="E-mail CC" value={cliente.email_secundario_cc} />
                    <CopyField label="Telefone" value={formatarTelefone(cliente.telefone_fixo)} />
                    <CopyField label="Telefone Contato" value={formatarTelefone(cliente.telefone_contato)} />
                    <CopyField label="WhatsApp" value={formatarTelefone(cliente.whatsapp)} />
                    {cliente.site && (
                      <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
                        <div className="min-w-0 flex-1">
                          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                            Site
                          </p>
                          <a
                            href={cliente.site.startsWith('http') ? cliente.site : `https://${cliente.site}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 break-all text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {cliente.site}
                            <ExternalLink size={12} className="shrink-0" />
                          </a>
                        </div>
                        <CopyFieldButton value={cliente.site} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Endereço */}
              {(cliente.endereco_logradouro || cliente.endereco_cidade || cliente.cep) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-950/60">
                  <SectionTitle>Endereço</SectionTitle>
                  <div className="space-y-2">
                    <CopyField label="Logradouro" value={enderecoCompleto || null} />
                    <CopyField label="Bairro" value={cliente.endereco_bairro} />
                    <CopyField
                      label="Cidade / UF"
                      value={
                        cliente.endereco_cidade && cliente.endereco_uf
                          ? `${cliente.endereco_cidade} / ${cliente.endereco_uf}`
                          : cliente.endereco_cidade || cliente.endereco_uf
                      }
                    />
                    <CopyField label="CEP" value={cliente.cep} />
                  </div>
                </div>
              )}

              {/* PIX / Financeiro */}
              {(cliente.chave_pix || cliente.nome_banco) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-950/60">
                  <SectionTitle>Financeiro / PIX</SectionTitle>
                  <div className="space-y-2">
                    <CopyField label="Banco" value={cliente.nome_banco} />
                    {cliente.tipo_chave && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/40">
                        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                          Tipo de Chave PIX
                        </p>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{cliente.tipo_chave}</p>
                      </div>
                    )}
                    <CopyField label="Chave PIX" value={cliente.chave_pix} />
                  </div>
                </div>
              )}

              {/* Observações */}
              {cliente.observacoes_internas && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
                  <SectionTitle>Observações internas</SectionTitle>
                  <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                    {cliente.observacoes_internas}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E5E7EB] bg-slate-50 px-6 py-4 dark:border-[#262626] dark:bg-neutral-950">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-neutral-700 dark:text-slate-300 dark:hover:bg-neutral-800"
          >
            Fechar
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}

function CopyFieldButton({ value }: { value: string | null | undefined }) {
  const [copiado, setCopiado] = useState(false);

  if (!value) return null;

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // silencioso
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopiar}
      title="Copiar"
      className={`mt-0.5 shrink-0 rounded-lg p-1.5 transition-colors ${
        copiado
          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
          : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-neutral-700 dark:hover:text-slate-200'
      }`}
    >
      {copiado ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}
