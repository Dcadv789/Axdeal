'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeDollarSign,
  Barcode,
  Box,
  CheckCircle2,
  FileText,
  Package,
  Save,
  Tag,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

interface CatalogoCadastro {
  id: string;
  id_empresa?: string;
  codigo: string | null;
  nome: string;
  tipo: string | null;
  preco_venda: number | null;
  descricao_padrao: string | null;
  ativo: boolean;
}

interface CatalogoDetailsDrawerProps {
  item: CatalogoCadastro | null;
  activeTab: 'produtos' | 'servicos';
  mode: 'view' | 'edit';
  onClose: () => void;
  onSave: (payload: {
    id: string;
    codigo: string | null;
    nome: string;
    preco_venda: number | null;
    descricao_padrao: string | null;
    ativo: boolean;
  }) => Promise<void>;
}

function formatCurrency(value?: number) {
  if (!value) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function normalizarTipo(tipo: string | null | undefined) {
  const valor = (tipo || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

  if (valor === 'PRODUTO') return 'Produto';
  if (valor === 'SERVICO') return 'Servico';
  return '-';
}

function statusClasses(ativo: boolean) {
  return ativo
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300'
    : 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-100';
}

export default function CatalogoDetailsDrawer({
  item,
  activeTab,
  mode,
  onClose,
  onSave,
}: CatalogoDetailsDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!item) return;
    setNome(item.nome || '');
    setCodigo(item.codigo || '');
    setPrecoVenda(item.preco_venda != null ? String(item.preco_venda) : '');
    setDescricao(item.descricao_padrao || '');
    setAtivo(item.ativo);
    setError('');
    setSaving(false);
  }, [item, mode]);

  const itemIcon = useMemo(
    () => (activeTab === 'produtos' ? <Package size={18} /> : <Wrench size={18} />),
    [activeTab]
  );

  const handleSave = async () => {
    if (!item) return;

    if (!nome.trim()) {
      setError('Informe o nome.');
      return;
    }

    const precoNormalizado = precoVenda.trim() === '' ? null : Number(precoVenda.replace(',', '.'));
    if (precoNormalizado !== null && Number.isNaN(precoNormalizado)) {
      setError('Informe um valor valido.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await onSave({
        id: item.id,
        nome: nome.trim(),
        codigo: codigo.trim() || null,
        preco_venda: precoNormalizado,
        descricao_padrao: descricao.trim() || null,
        ativo,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nao foi possivel salvar.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {item && (
        <motion.div
          className="fixed inset-0 z-[121] flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            className="absolute inset-0 bg-black/45"
            aria-label="Fechar"
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 h-screen w-full max-w-lg overflow-y-auto rounded-l-3xl rounded-r-none border-l border-slate-200 bg-gradient-to-b from-white via-slate-50 to-white p-6 shadow-[0_0_40px_rgba(15,23,42,0.24)] dark:border-neutral-700 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950"
            initial={{ x: 48, opacity: 0.95 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 48, opacity: 0.95 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {mode === 'edit' ? 'Editar' : 'Detalhes do'} {activeTab === 'produtos' ? 'produto' : 'servico'}
              </h3>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-neutral-700 dark:bg-neutral-900/70">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    {itemIcon}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                      {mode === 'edit' ? `Atualize o ${activeTab === 'produtos' ? 'produto' : 'servico'}` : item.nome}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                          mode === 'edit' ? ativo : item.ativo
                        )}`}
                      >
                        {(mode === 'edit' ? ativo : item.ativo) ? 'Ativo' : 'Inativo'}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300">
                        {normalizarTipo(item.tipo)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              )}

              {mode === 'edit' ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-neutral-700 dark:bg-neutral-900/70">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Dados do item
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Nome</label>
                        <input
                          type="text"
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100 dark:focus:ring-blue-500/30"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Codigo</label>
                        <input
                          type="text"
                          value={codigo}
                          onChange={(e) => setCodigo(e.target.value)}
                          className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100 dark:focus:ring-blue-500/30"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Valor de venda</label>
                        <input
                          type="number"
                          step="0.01"
                          value={precoVenda}
                          onChange={(e) => setPrecoVenda(e.target.value)}
                          className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100 dark:focus:ring-blue-500/30"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Descricao padrao</label>
                        <textarea
                          value={descricao}
                          onChange={(e) => setDescricao(e.target.value)}
                          rows={5}
                          className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100 dark:focus:ring-blue-500/30"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Status</label>
                        <select
                          value={ativo ? 'ativo' : 'inativo'}
                          onChange={(e) => setAtivo(e.target.value === 'ativo')}
                          className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100 dark:focus:ring-blue-500/30"
                        >
                          <option value="ativo">Ativo</option>
                          <option value="inativo">Inativo</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={onClose}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 dark:border-neutral-700 dark:text-slate-200"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => void handleSave()}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      <Save size={15} />
                      {saving ? 'Salvando...' : 'Salvar alteracoes'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-neutral-700 dark:bg-neutral-900/70">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Resumo
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-neutral-800/70">
                        <div className="mb-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <Barcode size={14} />
                          <p className="text-[11px]">Codigo</p>
                        </div>
                        <p className="font-medium text-slate-800 dark:text-slate-100">
                          {item.codigo || '-'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-neutral-800/70">
                        <div className="mb-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <BadgeDollarSign size={14} />
                          <p className="text-[11px]">Valor de venda</p>
                        </div>
                        <p className="font-medium text-slate-800 dark:text-slate-100">
                          {formatCurrency(Number(item.preco_venda || 0))}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-neutral-800/70">
                        <div className="mb-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <Tag size={14} />
                          <p className="text-[11px]">Categoria</p>
                        </div>
                        <p className="font-medium text-slate-800 dark:text-slate-100">
                          {activeTab === 'produtos' ? 'Produto de catalogo' : 'Servico de catalogo'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-neutral-800/70">
                        <div className="mb-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <CheckCircle2 size={14} />
                          <p className="text-[11px]">Situacao</p>
                        </div>
                        <p className="font-medium text-slate-800 dark:text-slate-100">
                          {item.ativo ? 'Disponivel para uso' : 'Desativado'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-neutral-700 dark:bg-neutral-900/70">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Descricao
                    </p>
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-3 py-3 dark:border-neutral-700 dark:bg-neutral-800/60">
                      <div className="mb-2 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <FileText size={14} />
                        <span className="text-[11px]">Descricao padrao</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                        {item.descricao_padrao?.trim() || 'Nenhuma descricao cadastrada.'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-neutral-700 dark:bg-neutral-900/70">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Identificacao
                    </p>
                    <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-neutral-800/70">
                      <div className="mb-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Box size={14} />
                        <p className="text-[11px]">ID interno</p>
                      </div>
                      <p className="break-all font-medium text-slate-800 dark:text-slate-100">{item.id}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
