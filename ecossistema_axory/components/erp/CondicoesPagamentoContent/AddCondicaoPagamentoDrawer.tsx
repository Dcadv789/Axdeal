import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, RefreshCw, AlertCircle, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AddCondicaoPagamentoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  idEmpresa: string | null;
  editingCondicao?: {
    id: string;
    nome: string;
    regras: Array<{ dias: number; percentual: number }>;
  } | null;
}

export default function AddCondicaoPagamentoDrawer({
  isOpen,
  onClose,
  onSave,
  idEmpresa,
  editingCondicao,
}: AddCondicaoPagamentoDrawerProps) {
  const [nome, setNome] = useState('');
  const [numParcelas, setNumParcelas] = useState(1);
  const [parcelas, setParcelas] = useState<Array<{ dias: number }>>([{ dias: 0 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (editingCondicao) {
      setNome(editingCondicao.nome);
      setNumParcelas(editingCondicao.regras.length);
      setParcelas(editingCondicao.regras.map(r => ({ dias: r.dias })));
    } else {
      setNome('');
      setNumParcelas(1);
      setParcelas([{ dias: 0 }]);
    }
    setError(null);
  }, [editingCondicao, isOpen]);

  const handleNumParcelasChange = (num: number) => {
    if (num < 1) return;
    setNumParcelas(num);
  };

  const atualizarParcelas = () => {
    const novasParcelas: Array<{ dias: number }> = [];
    for (let i = 0; i < numParcelas; i++) {
      if (parcelas[i]) {
        novasParcelas.push(parcelas[i]);
      } else {
        novasParcelas.push({ dias: 0 });
      }
    }
    setParcelas(novasParcelas);
  };

  const handleDiasChange = (index: number, dias: number) => {
    const novasParcelas = [...parcelas];
    novasParcelas[index] = { dias: Math.max(0, dias) };
    setParcelas(novasParcelas);
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      setError('Nome da condição é obrigatório.');
      return;
    }

    if (!idEmpresa) {
      setError('Empresa não identificada.');
      return;
    }

    if (parcelas.length === 0) {
      setError('Adicione pelo menos uma parcela.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const percentualPorParcela = 100 / parcelas.length;
      const regras = parcelas.map(p => ({
        dias: p.dias,
        percentual: Math.round(percentualPorParcela * 100) / 100,
      }));

      if (editingCondicao) {
        const { error: updateError } = await supabase
          .from('erp_condicoes_pagamento')
          .update({
            nome: nome.trim(),
            regras: regras,
          })
          .eq('id', editingCondicao.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('erp_condicoes_pagamento')
          .insert({
            id_empresa: idEmpresa,
            nome: nome.trim(),
            regras: regras,
          });

        if (insertError) throw insertError;
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving condition:', error);
      setError('Erro ao salvar condição de pagamento.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const content = (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-[9998] animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-full w-full md:w-[600px] bg-white dark:bg-neutral-900 shadow-2xl z-[9999] flex flex-col animate-slide-in-right overflow-x-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E7EB] dark:border-[#262626]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <CreditCard size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingCondicao ? 'Editar Condição' : 'Nova Condição de Pagamento'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Configure as parcelas e prazos de pagamento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Defina o nome e configure as parcelas com seus respectivos prazos de vencimento
              </p>
            </div>

            <div className="space-y-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Nome da Condição <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Entrada + 30 dias"
                  className="px-4 py-3 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Número Total de Parcelas <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={numParcelas}
                    onChange={(e) => handleNumParcelasChange(parseInt(e.target.value) || 1)}
                    className="flex-1 px-4 py-3 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all"
                  />
                  <button
                    onClick={atualizarParcelas}
                    className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                  >
                    <RefreshCw size={16} />
                    Atualizar
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Prazos das Parcelas
                </label>

                <div className="space-y-3">
                  {parcelas.map((parcela, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                    >
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400 text-sm font-semibold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          Dias para vencimento
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={parcela.dias}
                          onChange={(e) => handleDiasChange(index, parseInt(e.target.value) || 0)}
                          placeholder="Ex: 0 para à vista, 30 para 30 dias"
                          className="w-full px-3 py-2 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all"
                        />
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 min-w-[60px] text-right">
                        {(100 / parcelas.length).toFixed(2)}%
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  O percentual será distribuído igualmente entre as parcelas
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#E5E7EB] dark:border-[#262626] p-6 bg-gray-50 dark:bg-neutral-900">
          <div className="flex flex-col-reverse md:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 md:flex-initial px-6 py-3 border border-[#E5E7EB] dark:border-[#262626] rounded-lg text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-900 font-medium text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 md:flex-initial px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  {editingCondicao ? 'Salvar Alterações' : 'Adicionar Condição'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
