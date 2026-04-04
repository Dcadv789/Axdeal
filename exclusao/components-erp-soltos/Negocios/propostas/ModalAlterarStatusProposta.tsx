'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  normalizarStatusParaLookup,
  STATUS_OPCOES_OS,
  STATUS_OPCOES_PROPOSTA,
  STATUS_OPCOES_VENDA,
} from '@/config/propostas';
import { getStatusBadge } from '@/utils/statusBadge';

const NOMES_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const NOMES_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

interface Proposta {
  id: string;
  codigo: string;
  status: string;
}

interface ModalAlterarStatusPropostaProps {
  isOpen: boolean;
  proposta: Proposta | null;
  tipoDocumento?: 'proposta' | 'venda' | 'os';
  idEmpresa?: string | null;
  onClose: () => void;
  onSalvar: (id: string, novoStatus: string, observacao: string, dataStatus: string) => Promise<void>;
}

interface HistoricoStatusItem {
  status: string;
  data_status: string | null;
  data_registro: string | null;
  id_usuario: string | null;
  observacao: string | null;
}

interface SingleDatePickerProps {
  value: string;
  onChange: (value: string) => void;
}

function toISODate(data: Date): string {
  const ano = data.getFullYear();
  const mes = `${data.getMonth() + 1}`.padStart(2, '0');
  const dia = `${data.getDate()}`.padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function parseISODate(valor: string): Date | null {
  if (!valor) return null;
  const [ano, mes, dia] = valor.split('-').map(Number);
  if (!ano || !mes || !dia) return null;
  return new Date(ano, mes - 1, dia);
}

function formatarDataCurta(valor: string | null): string {
  if (!valor) return '-';
  const data = parseISODate(valor) ?? new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(data);
}

function formatarDataHora(valor: string | null): string {
  if (!valor) return '-';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data);
}

function montarDiasMes(base: Date): Array<Date | null> {
  const ano = base.getFullYear();
  const mes = base.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diasNoMes = ultimoDia.getDate();
  const inicioSemana = (primeiroDia.getDay() + 6) % 7;
  const totalCelulas = 42;

  return Array.from({ length: totalCelulas }, (_, idx) => {
    const dia = idx - inicioSemana + 1;
    if (dia < 1 || dia > diasNoMes) return null;
    return new Date(ano, mes, dia);
  });
}

function mesmoDia(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function normalizarStatusParaSelect(valor: string, opcoesStatus: Array<{ value: string; label: string }>): string {
  const statusNormalizado = normalizarStatusParaLookup(valor);
  return opcoesStatus.some((opcao) => opcao.value === statusNormalizado)
    ? statusNormalizado
    : opcoesStatus[0]?.value || '';
}

function getNomeDocumento(tipoDocumento: 'proposta' | 'venda' | 'os') {
  if (tipoDocumento === 'venda') return 'Venda';
  if (tipoDocumento === 'os') return 'Ordem de Serviço';
  return 'Proposta';
}

function SingleDatePicker({ value, onChange }: SingleDatePickerProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selectedDate = useMemo(() => parseISODate(value), [value]);
  const [mesBase, setMesBase] = useState(() => {
    const base = parseISODate(value) ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!value) return;
    const base = parseISODate(value);
    if (!base) return;
    setMesBase(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [value]);

  const dias = montarDiasMes(mesBase);
  const label = value ? formatarDataCurta(value) : 'Selecionar data';

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="h-10 w-full rounded-xl border border-blue-200 bg-white px-3 flex items-center justify-between gap-3 text-sm hover:border-blue-400 transition-colors dark:border-blue-500/35 dark:bg-black dark:hover:border-blue-400/50"
      >
        <span className={value ? 'text-slate-700 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}>{label}</span>
        <CalendarDays size={15} className="text-slate-500 dark:text-slate-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-[2147483100] rounded-2xl border border-slate-200 bg-white shadow-xl p-4 w-[320px] dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMesBase((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-neutral-700 dark:text-slate-300 dark:hover:bg-neutral-800"
              >
                <ChevronLeft size={14} className="mx-auto" />
              </button>
              <button
                type="button"
                onClick={() => setMesBase((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-neutral-700 dark:text-slate-300 dark:hover:bg-neutral-800"
              >
                <ChevronRight size={14} className="mx-auto" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <X size={13} />
              Limpar
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 p-2 dark:border-neutral-700">
            <div className="text-center text-sm font-semibold text-slate-700 dark:text-slate-100 mb-2">
              {NOMES_MESES[mesBase.getMonth()]} {mesBase.getFullYear()}
            </div>
            <div className="grid grid-cols-7 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              {NOMES_SEMANA.map((nome) => (
                <div key={nome} className="h-6 flex items-center justify-center">
                  {nome}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {dias.map((dia, idx) => {
                if (!dia) return <div key={`vazio-${idx}`} className="h-8" />;

                const selecionado = mesmoDia(dia, selectedDate);

                return (
                  <button
                    key={`${dia.getTime()}-${idx}`}
                    type="button"
                    onClick={() => {
                      onChange(toISODate(dia));
                      setOpen(false);
                    }}
                    className={[
                      'h-8 w-8 mx-auto rounded-lg text-xs font-medium transition-colors',
                      selecionado
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-neutral-800',
                    ].join(' ')}
                  >
                    {dia.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ModalAlterarStatusProposta({
  isOpen,
  proposta,
  tipoDocumento = 'proposta',
  idEmpresa = null,
  onClose,
  onSalvar,
}: ModalAlterarStatusPropostaProps) {
  const opcoesStatus = useMemo(
    () =>
      tipoDocumento === 'venda'
        ? STATUS_OPCOES_VENDA
        : tipoDocumento === 'os'
          ? STATUS_OPCOES_OS
          : STATUS_OPCOES_PROPOSTA,
    [tipoDocumento]
  );
  const statusInicial = opcoesStatus[0]?.value || '';

  const [status, setStatus] = useState(statusInicial);
  const [observacao, setObservacao] = useState('');
  const [dataStatus, setDataStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [historico, setHistorico] = useState<HistoricoStatusItem[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [nomesPorUsuario, setNomesPorUsuario] = useState<Record<string, string>>({});
  const [mostrarDropdownStatus, setMostrarDropdownStatus] = useState(false);

  const statusDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setMostrarDropdownStatus(false);
      }
    };

    if (mostrarDropdownStatus) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mostrarDropdownStatus]);

  useEffect(() => {
    if (isOpen && proposta) {
      setStatus(normalizarStatusParaSelect(proposta.status || statusInicial, opcoesStatus));
      setObservacao('');
      setDataStatus(new Date().toISOString().slice(0, 10));
    }
  }, [isOpen, proposta, statusInicial, opcoesStatus]);

  useEffect(() => {
    if (!isOpen) {
      setMostrarDropdownStatus(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    const carregarHistorico = async () => {
      if (!isOpen || !proposta) return;

      setLoadingHistorico(true);

      try {
        const entidade = tipoDocumento === 'venda' ? 'VENDA' : tipoDocumento === 'os' ? 'OS' : 'PROPOSTA';

        let query = supabase
          .from('erp_status_historico')
          .select('status, data_status, data_registro, id_usuario, observacao')
          .eq('entidade', entidade)
          .eq('id_referencia', proposta.id)
          .order('data_registro', { ascending: true })
          .order('data_status', { ascending: true });

        if (idEmpresa) {
          query = query.eq('id_empresa', idEmpresa);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Erro ao buscar histórico de status:', error);
          setHistorico([]);
          return;
        }

        const itens = (data || []) as HistoricoStatusItem[];
        setHistorico(itens);

        const idsUsuarios = Array.from(
          new Set(itens.map((item) => item.id_usuario).filter((id): id is string => Boolean(id)))
        );

        if (!idsUsuarios.length) {
          setNomesPorUsuario({});
          return;
        }

        const { data: usuariosData, error: usuariosError } = await supabase
          .from('sis_membros_equipe')
          .select('id_usuario, nome_completo')
          .in('id_usuario', idsUsuarios);

        if (usuariosError) {
          console.error('Erro ao buscar nomes dos usuários do histórico:', usuariosError);
          setNomesPorUsuario({});
          return;
        }

        const mapa = (usuariosData || []).reduce<Record<string, string>>((acc, item: any) => {
          if (item.id_usuario) {
            acc[item.id_usuario] = item.nome_completo || item.id_usuario;
          }
          return acc;
        }, {});

        setNomesPorUsuario(mapa);
      } finally {
        setLoadingHistorico(false);
      }
    };

    void carregarHistorico();
  }, [isOpen, proposta, tipoDocumento, idEmpresa, opcoesStatus, statusInicial]);

  const handleSalvar = async () => {
    if (!proposta) return;

    setSaving(true);
    try {
      await onSalvar(proposta.id, status, observacao, dataStatus);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  const nomeDocumento = getNomeDocumento(tipoDocumento);
  const statusSelecionadoLabel =
    opcoesStatus.find((opcao) => opcao.value === status)?.label || 'Selecione o status';
  const campoAzulClass =
    'w-full rounded-lg border border-blue-500/30 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-blue-400/30 dark:bg-black dark:text-gray-100';

  return createPortal(
    <AnimatePresence>
      {isOpen && proposta && (
        <motion.div
          className="fixed inset-0 z-[2147483001] flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-black/80"
            onClick={onClose}
          />

          <motion.div
            className="relative z-10 h-dvh w-full max-w-3xl rounded-l-3xl border-l border-[#E5E7EB] bg-white p-6 shadow-[0_0_40px_rgba(15,23,42,0.24)] dark:border-[#262626] dark:bg-neutral-900 flex flex-col"
            initial={{ x: 56, opacity: 0.96 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 56, opacity: 0.96 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-1 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Alterar status</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {nomeDocumento} {proposta.codigo}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-transparent bg-gray-100/90 p-2 text-gray-500 transition-colors hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 min-h-0 flex-1 flex flex-col">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Data</label>
                  <SingleDatePicker value={dataStatus} onChange={setDataStatus} />
                </div>

                <div ref={statusDropdownRef} className="relative">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <button
                    type="button"
                    onClick={() => setMostrarDropdownStatus((prev) => !prev)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-blue-500/30 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-blue-400/30 dark:bg-black dark:text-gray-100"
                  >
                    <span className="truncate text-left">{statusSelecionadoLabel}</span>
                    <ChevronDown
                      size={16}
                      className={`text-gray-500 transition-transform dark:text-gray-400 ${
                        mostrarDropdownStatus ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {mostrarDropdownStatus && (
                    <div className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-xl dark:border-[#262626] dark:bg-neutral-900">
                      <div className="max-h-56 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
                        {opcoesStatus.map((opcao) => (
                          <button
                            key={opcao.value}
                            type="button"
                            onClick={() => {
                              setStatus(opcao.value);
                              setMostrarDropdownStatus(false);
                            }}
                            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-gray-800 transition-colors hover:bg-blue-50 dark:text-gray-100 dark:hover:bg-blue-500/10"
                          >
                            <span>{opcao.label}</span>
                            {status === opcao.value && <Check size={15} className="text-blue-600 dark:text-blue-400" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Observação</label>
                <input
                  type="text"
                  value={observacao}
                  onChange={(event) => setObservacao(event.target.value)}
                  placeholder="Motivo ou detalhe da alteração"
                  className={`${campoAzulClass} placeholder:text-gray-400 dark:placeholder:text-gray-500`}
                />
              </div>

              <div className="mt-6 min-h-0 flex-1 border-t border-slate-200 pt-4 dark:border-neutral-800 flex flex-col">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Histórico de status</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Linha do tempo das alterações registradas.
                </p>

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                  {loadingHistorico ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-slate-300">
                      Carregando histórico...
                    </div>
                  ) : historico.length === 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-slate-300">
                      Nenhum histórico encontrado para este documento.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-neutral-800 dark:bg-black">
                      <div className="grid grid-cols-[28px,156px,minmax(0,1.6fr),168px,132px] gap-3 border-b border-slate-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:border-neutral-800 dark:text-slate-400">
                        <span>#</span>
                        <span>Data</span>
                        <span>Observação</span>
                        <span>Usuário</span>
                        <span>Status</span>
                      </div>

                      {[...historico].reverse().map((item, index, itensOrdenados) => {
                        const numeroItem = historico.length - index;
                        const nomeUsuario = item.id_usuario
                          ? nomesPorUsuario[item.id_usuario] || item.id_usuario
                          : 'Sistema';

                        return (
                          <div
                            key={`${item.status}-${item.data_status}-${index}`}
                            className={`grid grid-cols-[28px,156px,minmax(0,1.6fr),168px,132px] items-center gap-3 px-4 py-3 ${
                              index !== itensOrdenados.length - 1 ? 'border-b border-slate-100 dark:border-neutral-800' : ''
                            }`}
                          >
                            <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                              {numeroItem}
                            </div>

                            <div className="min-w-0 self-center">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {formatarDataCurta(item.data_status)}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                Registro: {formatarDataHora(item.data_registro)}
                              </p>
                            </div>

                            <div className="min-w-0 self-center">
                              <p className="text-sm text-slate-700 dark:text-slate-200">
                                {item.observacao?.trim() || 'Sem observação.'}
                              </p>
                            </div>

                            <div className="min-w-0 self-center">
                              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-600 dark:bg-neutral-800 dark:text-slate-300">
                                  {nomeUsuario.trim().charAt(0).toUpperCase() || 'U'}
                                </span>
                                <span className="truncate">{nomeUsuario}</span>
                              </div>
                            </div>

                            <div className="flex items-center self-center">
                              {getStatusBadge(item.status || '')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4 dark:border-neutral-800">
              <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-[#262626] dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvar}
                disabled={saving}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
