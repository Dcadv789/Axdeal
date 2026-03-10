import { X, Package, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface AddServiceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddServiceDrawer({ isOpen, onClose }: AddServiceDrawerProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idEmpresa, setIdEmpresa] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    tipo: 'servico',
    precoDefault: '',
    precoPromocional: '',
    custo: '',
    descricao: '',
  });

  useEffect(() => {
    if (isOpen && user) {
      fetchCompanyAndGenerateCode();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen && idEmpresa) {
      generateCode();
    }
  }, [formData.tipo, idEmpresa, isOpen]);

  const fetchCompanyAndGenerateCode = async () => {
    try {
      const { data: memberData } = await supabase
        .from('sis_membros_equipe')
        .select('id_empresa')
        .eq('id_usuario', user?.id)
        .maybeSingle();

      if (memberData) {
        setIdEmpresa(memberData.id_empresa);
      }
    } catch (error) {
      console.error('Error fetching company:', error);
    }
  };

  const generateCode = async () => {
    if (!idEmpresa) return;

    try {
      const { data: config } = await supabase
        .from('sis_configuracoes')
        .select('prefixo_produto, prefixo_servico, proximo_numero_produto, proximo_numero_servico')
        .eq('id_empresa', idEmpresa)
        .maybeSingle();

      if (config) {
        const isProduto = formData.tipo === 'produto';
        const prefix = isProduto ? config.prefixo_produto : config.prefixo_servico;
        const nextNumber = isProduto ? config.proximo_numero_produto : config.proximo_numero_servico;
        const codigo = `${prefix}-${String(nextNumber).padStart(5, '0')}`;

        setFormData(prev => ({ ...prev, codigo }));
      }
    } catch (error) {
      console.error('Error generating code:', error);
    }
  };

  const formatCurrencyInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');

    if (!digits) return '';

    const numberValue = parseInt(digits, 10);
    const reais = Math.floor(numberValue / 100);
    const centavos = numberValue % 100;

    const reaisFormatted = reais.toLocaleString('pt-BR');
    const centavosFormatted = centavos.toString().padStart(2, '0');

    return `${reaisFormatted},${centavosFormatted}`;
  };

  const handleCurrencyChange = (field: string, value: string) => {
    const formatted = formatCurrencyInput(value);
    setFormData(prev => ({ ...prev, [field]: formatted }));
    setError(null);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const parseCurrency = (value: string): number => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return 0;
    return parseInt(digits, 10) / 100;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!idEmpresa) {
      setError('Erro ao identificar a empresa. Tente novamente.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const precoVenda = parseCurrency(formData.precoDefault);
      const precoPromocional = parseCurrency(formData.precoPromocional);
      const custoAquisicao = parseCurrency(formData.custo);

      if (precoVenda <= 0) {
        setError('O preço padrão deve ser maior que zero.');
        return;
      }

      const { data: config } = await supabase
        .from('sis_configuracoes')
        .select('proximo_numero_produto, proximo_numero_servico')
        .eq('id_empresa', idEmpresa)
        .maybeSingle();

      if (!config) {
        setError('Configurações da empresa não encontradas.');
        return;
      }

      const isProduto = formData.tipo === 'produto';
      const tipoDb = isProduto ? 'PRODUTO' : 'SERVICO';

      const { error: insertError } = await supabase
        .from('erp_catalogo')
        .insert({
          id_empresa: idEmpresa,
          tipo: tipoDb,
          nome: formData.nome,
          codigo: formData.codigo,
          preco_venda: precoVenda,
          preco_promocional: precoPromocional > 0 ? precoPromocional : null,
          custo_aquisicao: custoAquisicao,
          descricao_padrao: formData.descricao || null,
          ativo: true,
        });

      if (insertError) throw insertError;

      const nextNumber = isProduto
        ? config.proximo_numero_produto + 1
        : config.proximo_numero_servico + 1;

      const updateField = isProduto ? 'proximo_numero_produto' : 'proximo_numero_servico';

      const { error: updateError } = await supabase
        .from('sis_configuracoes')
        .update({ [updateField]: nextNumber })
        .eq('id_empresa', idEmpresa);

      if (updateError) throw updateError;

      setFormData({
        nome: '',
        codigo: '',
        tipo: 'servico',
        precoDefault: '',
        precoPromocional: '',
        custo: '',
        descricao: '',
      });

      onClose();
    } catch (error: any) {
      console.error('Error saving item:', error);
      setError(error.message || 'Erro ao salvar item. Tente novamente.');
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
              <Package size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Adicionar Item
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Cadastre um novo serviço ou produto
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
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
                Preencha as informações abaixo para cadastrar um novo item no seu catálogo
              </p>
            </div>

            <div className="space-y-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Nome do Item <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => handleChange('nome', e.target.value)}
                  placeholder="Ex: Consultoria Empresarial"
                  className="px-4 py-3 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Tipo <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleChange('tipo', 'servico')}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all ${
                      formData.tipo === 'servico'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                        : 'border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    Serviço
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('tipo', 'produto')}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all ${
                      formData.tipo === 'produto'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                        : 'border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    Produto
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.codigo}
                  readOnly
                  className="px-4 py-3 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 cursor-not-allowed outline-none text-sm font-mono"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Gerado automaticamente
                </p>
              </div>

              <div className="border-t border-[#E5E7EB] dark:border-[#262626] pt-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Informações Financeiras
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Preço Padrão <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm font-medium">
                        R$
                      </span>
                      <input
                        type="text"
                        required
                        value={formData.precoDefault}
                        onChange={(e) => handleCurrencyChange('precoDefault', e.target.value)}
                        placeholder="0,00"
                        className="w-full pl-10 pr-4 py-3 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Preço Promocional
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm font-medium">
                        R$
                      </span>
                      <input
                        type="text"
                        value={formData.precoPromocional}
                        onChange={(e) => handleCurrencyChange('precoPromocional', e.target.value)}
                        placeholder="0,00"
                        className="w-full pl-10 pr-4 py-3 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Custo
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm font-medium">
                        R$
                      </span>
                      <input
                        type="text"
                        value={formData.custo}
                        onChange={(e) => handleCurrencyChange('custo', e.target.value)}
                        placeholder="0,00"
                        className="w-full pl-10 pr-4 py-3 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => handleChange('descricao', e.target.value)}
                  placeholder="Descreva detalhadamente o serviço ou produto..."
                  rows={4}
                  className="px-4 py-3 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm resize-none transition-all"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Esta descrição será exibida em propostas e documentos
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#E5E7EB] dark:border-[#262626] p-6 bg-gray-50 dark:bg-neutral-900">
            <div className="flex flex-col-reverse md:flex-row gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 md:flex-initial px-6 py-3 border border-[#E5E7EB] dark:border-[#262626] rounded-lg text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-900 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 md:flex-initial px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Salvando...</span>
                  </>
                ) : (
                  'Adicionar Item'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
