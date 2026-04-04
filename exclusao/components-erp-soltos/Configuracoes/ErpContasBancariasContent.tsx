'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '@axdeal/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Banknote, Pencil, Plus, Power, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/lib/context/company-context';
import { supabase } from '@/lib/supabase';

type TipoConta = 'corrente' | 'poupanca' | 'investimento' | 'caixa';
type FiltroStatus = 'todas' | 'ativas' | 'inativas';

interface ContaBancaria {
  id_conta: string;
  id_empresa: string;
  id_usuario: string;
  nome_conta: string;
  tipo_conta: TipoConta;
  saldo_inicial: number;
  cor: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

interface FormConta {
  nomeConta: string;
  tipoConta: TipoConta;
  saldoInicial: string;
  cor: string;
}

interface ErpContasBancariasContentProps {
  modoEmbed?: boolean;
}

const FORM_INICIAL: FormConta = {
  nomeConta: '',
  tipoConta: 'corrente',
  saldoInicial: '0',
  cor: '#2563EB',
};

const TIPO_LABEL: Record<TipoConta, string> = {
  corrente: 'Corrente',
  poupanca: 'Poupança',
  investimento: 'Investimento',
  caixa: 'Caixa',
};

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

function formatarData(valor: string): string {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(data);
}

export default function ErpContasBancariasContent({ modoEmbed = false }: ErpContasBancariasContentProps) {
  const { user } = useAuth();
  const { companyId } = useCompany();

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [atualizandoStatusId, setAtualizandoStatusId] = useState<string | null>(null);

  const [erroPagina, setErroPagina] = useState<string | null>(null);
  const [erroDrawer, setErroDrawer] = useState<string | null>(null);

  const [mostrarDrawer, setMostrarDrawer] = useState(false);
  const [idContaEmEdicao, setIdContaEmEdicao] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todas');

  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [form, setForm] = useState<FormConta>(FORM_INICIAL);

  const emEdicao = Boolean(idContaEmEdicao);

  useEffect(() => {
    if (!mostrarDrawer) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mostrarDrawer]);

  const carregarContas = useCallback(async () => {
    if (!companyId) {
      setContas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErroPagina(null);

    const { data, error } = await supabase
      .from('erp_contas_bancarias')
      .select('*')
      .eq('id_empresa', companyId)
      .order('criado_em', { ascending: false });

    if (error) {
      console.error('Erro ao carregar contas bancarias:', error);
      setErroPagina('Nao foi possivel carregar as contas bancarias.');
      setLoading(false);
      return;
    }

    setContas((data || []) as ContaBancaria[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    void carregarContas();
  }, [user, carregarContas]);

  const contasFiltradas = useMemo(() => {
    if (filtroStatus === 'ativas') return contas.filter((conta) => conta.ativo);
    if (filtroStatus === 'inativas') return contas.filter((conta) => !conta.ativo);
    return contas;
  }, [contas, filtroStatus]);

  const totais = useMemo(() => {
    const ativas = contas.filter((conta) => conta.ativo).length;
    const inativas = contas.length - ativas;
    const saldoTotal = contas.reduce((acc, conta) => acc + Number(conta.saldo_inicial || 0), 0);
    return { total: contas.length, ativas, inativas, saldoTotal };
  }, [contas]);

  const abrirDrawerNovaConta = () => {
    setIdContaEmEdicao(null);
    setForm(FORM_INICIAL);
    setErroDrawer(null);
    setMostrarDrawer(true);
  };

  const abrirDrawerEditarConta = (conta: ContaBancaria) => {
    setIdContaEmEdicao(conta.id_conta);
    setForm({
      nomeConta: conta.nome_conta,
      tipoConta: conta.tipo_conta,
      saldoInicial: String(Number(conta.saldo_inicial || 0)),
      cor: conta.cor || '#2563EB',
    });
    setErroDrawer(null);
    setMostrarDrawer(true);
  };

  const fecharDrawer = () => {
    if (salvando) return;
    setMostrarDrawer(false);
    setIdContaEmEdicao(null);
    setForm(FORM_INICIAL);
    setErroDrawer(null);
  };

  const alternarStatusConta = async (conta: ContaBancaria) => {
    if (!companyId) return;
    setAtualizandoStatusId(conta.id_conta);
    setErroPagina(null);

    const { error } = await supabase
      .from('erp_contas_bancarias')
      .update({ ativo: !conta.ativo })
      .eq('id_conta', conta.id_conta)
      .eq('id_empresa', companyId);

    if (error) {
      console.error('Erro ao atualizar status da conta bancaria:', error);
      setErroPagina('Nao foi possivel atualizar o status da conta.');
      setAtualizandoStatusId(null);
      return;
    }

    setAtualizandoStatusId(null);
    await carregarContas();
  };

  const salvarConta = async () => {
    if (!user?.id) {
      setErroDrawer('Usuario nao autenticado.');
      return;
    }
    if (!companyId) {
      setErroDrawer('Empresa nao encontrada.');
      return;
    }
    if (!form.nomeConta.trim()) {
      setErroDrawer('Informe o nome da conta.');
      return;
    }

    const saldo = Number(form.saldoInicial.replace(',', '.'));
    if (Number.isNaN(saldo)) {
      setErroDrawer('Saldo inicial invalido.');
      return;
    }

    setSalvando(true);
    setErroDrawer(null);

    if (idContaEmEdicao) {
      const payloadEdicao = {
        nome_conta: form.nomeConta.trim(),
        tipo_conta: form.tipoConta,
        saldo_inicial: saldo,
        cor: form.cor || '#2563EB',
      };

      const { error } = await supabase
        .from('erp_contas_bancarias')
        .update(payloadEdicao)
        .eq('id_conta', idContaEmEdicao)
        .eq('id_empresa', companyId);

      if (error) {
        console.error('Erro ao atualizar conta bancaria:', error);
        setErroDrawer('Nao foi possivel atualizar a conta bancaria.');
        setSalvando(false);
        return;
      }
    } else {
      const payloadCadastro = {
        id_empresa: companyId,
        id_usuario: user.id,
        nome_conta: form.nomeConta.trim(),
        tipo_conta: form.tipoConta,
        saldo_inicial: saldo,
        cor: form.cor || '#2563EB',
      };

      const { error } = await supabase.from('erp_contas_bancarias').insert(payloadCadastro);

      if (error) {
        console.error('Erro ao salvar conta bancaria:', error);
        setErroDrawer('Nao foi possivel salvar a conta bancaria.');
        setSalvando(false);
        return;
      }
    }

    setSalvando(false);
    fecharDrawer();
    await carregarContas();
  };

  const containerClass = modoEmbed ? 'space-y-4' : 'py-6 space-y-6';
  const campoDrawerClass =
    'w-full rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500 transition-colors';

  return (
    <div className={containerClass}>
      <Card>
        <div className="space-y-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">Contas Bancarias</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Gerencie contas ativas e inativas no mesmo painel.
              </p>
            </div>
            <button
              onClick={abrirDrawerNovaConta}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Plus size={16} />
              Nova Conta
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFiltroStatus('todas')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filtroStatus === 'todas'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-neutral-800 dark:text-slate-200 dark:hover:bg-neutral-700'
              }`}
            >
              Todas ({totais.total})
            </button>
            <button
              onClick={() => setFiltroStatus('ativas')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filtroStatus === 'ativas'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-neutral-800 dark:text-slate-200 dark:hover:bg-neutral-700'
              }`}
            >
              Ativas ({totais.ativas})
            </button>
            <button
              onClick={() => setFiltroStatus('inativas')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filtroStatus === 'inativas'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-neutral-800 dark:text-slate-200 dark:hover:bg-neutral-700'
              }`}
            >
              Inativas ({totais.inativas})
            </button>
          </div>

          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Saldo inicial total: {formatarMoeda(totais.saldoTotal)}
          </div>

          {erroPagina && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {erroPagina}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950" />
              ))}
            </div>
          ) : contasFiltradas.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-neutral-800 dark:bg-neutral-950">
              <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                <Banknote size={20} />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Nenhuma conta encontrada para este filtro.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {contasFiltradas.map((conta) => (
                <div
                  key={conta.id_conta}
                  className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: conta.cor || '#2563EB' }} />
                  <div className="pl-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{conta.nome_conta}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          conta.ativo
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-neutral-700 dark:text-slate-300'
                        }`}
                      >
                        {conta.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:bg-neutral-800 dark:text-slate-200">
                        {TIPO_LABEL[conta.tipo_conta]}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => abrirDrawerEditarConta(conta)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-neutral-700 dark:text-slate-200 dark:hover:bg-neutral-800"
                        >
                          <Pencil size={12} />
                          Editar
                        </button>
                        <button
                          onClick={() => void alternarStatusConta(conta)}
                          disabled={atualizandoStatusId === conta.id_conta}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:text-slate-200 dark:hover:bg-neutral-800"
                        >
                          <Power size={12} />
                          {conta.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Saldo Inicial</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {formatarMoeda(Number(conta.saldo_inicial || 0))}
                      </p>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Atualizada em {formatarData(conta.atualizado_em)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {mostrarDrawer && (
                <motion.div className="fixed inset-0 z-[121] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <motion.button className="absolute inset-0 bg-black/45" aria-label="Fechar" onClick={fecharDrawer} />
                  <motion.div
                    className="relative z-10 w-full max-w-lg h-screen bg-gradient-to-b from-white via-slate-50 to-white dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950 border-l border-slate-200 dark:border-neutral-700 shadow-[0_0_40px_rgba(15,23,42,0.24)] p-6 overflow-y-auto rounded-l-3xl rounded-r-none"
                    initial={{ x: 48, opacity: 0.95 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 48, opacity: 0.95 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {emEdicao ? 'Editar conta bancária' : 'Nova conta bancária'}
                      </h3>
                      <button onClick={fecharDrawer} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="space-y-4 text-sm">
                      <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/70 p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 inline-flex items-center justify-center">
                            <Banknote size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {emEdicao ? 'Atualize os dados da conta' : 'Cadastre uma nova conta'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Configure os dados bancários para uso no ERP.
                            </p>
                          </div>
                        </div>
                      </div>

                      {erroDrawer && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 flex items-start gap-2">
                          <AlertCircle size={16} className="mt-0.5" />
                          <span>{erroDrawer}</span>
                        </div>
                      )}

                      <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/70 p-4 space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Dados da conta</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nome da conta</label>
                            <input
                              type="text"
                              value={form.nomeConta}
                              onChange={(e) => setForm((prev) => ({ ...prev, nomeConta: e.target.value }))}
                              placeholder="Ex: Itaú Corrente"
                              className={campoDrawerClass}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Tipo</label>
                            <select
                              value={form.tipoConta}
                              onChange={(e) => setForm((prev) => ({ ...prev, tipoConta: e.target.value as TipoConta }))}
                              className={campoDrawerClass}
                            >
                              <option value="corrente">Corrente</option>
                              <option value="poupanca">Poupança</option>
                              <option value="investimento">Investimento</option>
                              <option value="caixa">Caixa</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Saldo inicial</label>
                            <input
                              type="number"
                              step="0.01"
                              value={form.saldoInicial}
                              onChange={(e) => setForm((prev) => ({ ...prev, saldoInicial: e.target.value }))}
                              className={campoDrawerClass}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/70 p-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Aparência</p>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Cor do card</label>
                          <input
                            type="color"
                            value={form.cor}
                            onChange={(e) => setForm((prev) => ({ ...prev, cor: e.target.value }))}
                            className="h-11 w-full rounded-xl border border-blue-200 dark:border-blue-500/35 bg-white dark:bg-neutral-900 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-2">
                        <button
                          onClick={fecharDrawer}
                          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-neutral-700 text-sm font-medium text-slate-700 dark:text-slate-200"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => void salvarConta()}
                          disabled={salvando}
                          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
                        >
                          {salvando ? 'Salvando...' : emEdicao ? 'Salvar alterações' : 'Criar conta'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )
        : null}
    </div>
  );
}
