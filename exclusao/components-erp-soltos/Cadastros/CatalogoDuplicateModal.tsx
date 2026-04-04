'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Copy, Package, Wrench, X } from 'lucide-react';
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

interface CatalogoDuplicateModalProps {
  item: CatalogoCadastro | null;
  activeTab: 'produtos' | 'servicos';
  suggestedCode: string;
  onClose: () => void;
  onConfirm: (payload: {
    nome: string;
    codigo: string;
    preco_venda: number | null;
    descricao_padrao: string | null;
    ativo: boolean;
  }) => Promise<void>;
}

export default function CatalogoDuplicateModal({
  item,
  activeTab,
  suggestedCode,
  onClose,
  onConfirm,
}: CatalogoDuplicateModalProps) {
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
    setNome(`${item.nome} Copia`);
    setCodigo(suggestedCode);
    setPrecoVenda(item.preco_venda != null ? String(item.preco_venda) : '');
    setDescricao(item.descricao_padrao || '');
    setAtivo(item.ativo);
    setSaving(false);
    setError('');
  }, [item, suggestedCode]);

  const icon = useMemo(
    () => (activeTab === 'produtos' ? <Package size={18} /> : <Wrench size={18} />),
    [activeTab]
  );

  const handleConfirm = async () => {
    if (!item) return;
    if (!nome.trim()) {
      setError('Informe o nome.');
      return;
    }
    if (!codigo.trim()) {
      setError('Informe o codigo.');
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
      await onConfirm({
        nome: nome.trim(),
        codigo: codigo.trim(),
        preco_venda: precoNormalizado,
        descricao_padrao: descricao.trim() || null,
        ativo,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nao foi possivel duplicar.';
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
          className="fixed inset-0 z-[140] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button className="absolute inset-0 bg-black/45" aria-label="Fechar" onClick={onClose} />
          <motion.div
            initial={{ y: 12, opacity: 0.92 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0.92 }}
            className="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                  {icon}
                </div>
                <div>
                  <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Duplicar {activeTab === 'produtos' ? 'produto' : 'servico'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Revise os dados antes de criar o novo cadastro.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle size={16} className="mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Copy size={15} />
                  <p className="text-sm font-semibold">Base da duplicacao</p>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-blue-900 dark:text-blue-100 sm:grid-cols-2">
                  <div>
                    <span className="text-xs uppercase tracking-wide text-blue-700/80 dark:text-blue-300/80">Origem</span>
                    <p className="font-medium">{item.nome}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wide text-blue-700/80 dark:text-blue-300/80">Codigo atual</span>
                    <p className="font-medium">{item.codigo || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/70">
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
                      className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm font-mono text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100 dark:focus:ring-blue-500/30"
                    />
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Sugerido com a mesma sequencia de um novo cadastro.
                    </p>
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
                      rows={4}
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-blue-500/35 dark:bg-neutral-900 dark:text-slate-100 dark:focus:ring-blue-500/30"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Status inicial</label>
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
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 dark:border-neutral-700 dark:text-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleConfirm()}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Duplicando...' : 'Criar duplicado'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
