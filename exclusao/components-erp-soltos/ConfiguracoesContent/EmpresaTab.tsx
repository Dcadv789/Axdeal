import { Upload, Building2, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Tooltip } from '@axdeal/ui';
import { supabase } from '@/lib/supabase';
import type { Empresa, Configuracao } from '@/types/database';

export default function EmpresaTab() {
  const [formData, setFormData] = useState({
    nomeEmpresa: '',
    nomeFantasia: '',
    cnpj: '',
    pixKeyType: 'email',
    pixKeyValue: '',
    multaAtraso: '0',
    jurosMenuais: '0',
  });

  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [configId, setConfigId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadEmpresaData();
  }, []);

  const loadEmpresaData = async () => {
    try {
      setIsLoading(true);

      const { data: empresas, error: empresaError } = await supabase
        .from('sis_empresas')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (empresaError) {
        console.error('Erro ao carregar empresa:', empresaError);
        return;
      }

      if (empresas) {
        const empresa = empresas as Empresa;
        setEmpresaId(empresa.id);

        const { data: configs, error: configError } = await supabase
          .from('sis_configuracoes')
          .select('*')
          .eq('id_empresa', empresa.id)
          .maybeSingle();

        if (configError) {
          console.error('Erro ao carregar configurações:', configError);
        }

        const config = configs as Configuracao | null;
        if (config) {
          setConfigId(config.id);
        }

        setFormData({
          nomeEmpresa: empresa.nome_razao_social || '',
          nomeFantasia: empresa.nome_fantasia || '',
          cnpj: empresa.cnpj || '',
          pixKeyType: config?.tipo_chave_pix || 'email',
          pixKeyValue: config?.chave_pix_padrao || '',
          multaAtraso: config?.multa_atraso_padrao?.toString() || '0',
          jurosMenuais: config?.juros_mensal_padrao?.toString() || '0',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!empresaId) {
      alert('Nenhuma empresa encontrada. Por favor, crie uma empresa primeiro.');
      return;
    }

    try {
      setIsSaving(true);

      const { error: empresaError } = await supabase
        .from('sis_empresas')
        .update({
          nome_razao_social: formData.nomeEmpresa,
          nome_fantasia: formData.nomeFantasia,
          cnpj: formData.cnpj,
        })
        .eq('id', empresaId);

      if (empresaError) {
        console.error('Erro ao atualizar empresa:', empresaError);
        alert('Erro ao salvar dados da empresa');
        return;
      }

      if (configId) {
        const { error: configError } = await supabase
          .from('sis_configuracoes')
          .update({
            tipo_chave_pix: formData.pixKeyType,
            chave_pix_padrao: formData.pixKeyValue,
            multa_atraso_padrao: parseFloat(formData.multaAtraso),
            juros_mensal_padrao: parseFloat(formData.jurosMenuais),
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', configId);

        if (configError) {
          console.error('Erro ao atualizar configurações:', configError);
          alert('Erro ao salvar configurações');
          return;
        }
      } else {
        const { data: newConfig, error: configError } = await supabase
          .from('sis_configuracoes')
          .insert({
            id_empresa: empresaId,
            tipo_chave_pix: formData.pixKeyType,
            chave_pix_padrao: formData.pixKeyValue,
            multa_atraso_padrao: parseFloat(formData.multaAtraso),
            juros_mensal_padrao: parseFloat(formData.jurosMenuais),
          })
          .select()
          .single();

        if (configError) {
          console.error('Erro ao criar configurações:', configError);
          alert('Erro ao criar configurações');
          return;
        }

        if (newConfig) {
          setConfigId(newConfig.id);
        }
      }

      alert('Dados salvos com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar dados');
    } finally {
      setIsSaving(false);
    }
  };

  const pixKeyTypes = [
    { value: 'email', label: 'E-mail' },
    { value: 'cpf', label: 'CPF' },
    { value: 'cnpj', label: 'CNPJ' },
    { value: 'random', label: 'Chave Aleatória' },
  ];

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
          <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>

          <div className="flex flex-col">
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3 animate-pulse" />
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/30 min-h-[200px]">
              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 mb-4 animate-pulse" />
              <div className="h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg mb-2 animate-pulse" />
              <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        </div>

        <div className="border-t border-[#E5E7EB] dark:border-[#262626] pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-[#E5E7EB] dark:border-[#262626]">
          <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          Dados da Empresa
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure as informações e padrões da sua organização
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Razão Social
              </label>
              <Tooltip content="Razão social registrada no CNPJ. É o nome oficial da sua empresa perante as autoridades fiscais.">
                <Info size={16} className="text-gray-400 dark:text-gray-500" />
              </Tooltip>
            </div>
            <input
              type="text"
              value={formData.nomeEmpresa}
              onChange={(e) => handleChange('nomeEmpresa', e.target.value)}
              placeholder="Nome oficial da empresa"
              className="px-3 py-2 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Nome Fantasia
              </label>
              <Tooltip content="Nome comercial da sua empresa. É como você é conhecido no mercado e aparece em documentos comerciais.">
                <Info size={16} className="text-gray-400 dark:text-gray-500" />
              </Tooltip>
            </div>
            <input
              type="text"
              value={formData.nomeFantasia}
              onChange={(e) => handleChange('nomeFantasia', e.target.value)}
              className="px-3 py-2 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                CNPJ
              </label>
              <Tooltip content="Cadastro Nacional da Pessoa Jurídica da sua empresa.">
                <Info size={16} className="text-gray-400 dark:text-gray-500" />
              </Tooltip>
            </div>
            <input
              type="text"
              value={formData.cnpj}
              onChange={(e) => handleChange('cnpj', e.target.value)}
              className="px-3 py-2 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Logo da Empresa
          </label>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/50 min-h-[200px]">
            <div className="w-20 h-20 mb-4 flex items-center justify-center">
              <Building2 size={40} className="text-gray-400 dark:text-gray-500" />
            </div>
            <button className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium text-sm mb-2">
              <Upload size={18} />
              Alterar Logo
            </button>
            <p className="text-xs text-center text-blue-600 dark:text-blue-400">
              Recomendado: PNG ou SVG com fundo transparente,<br/>200x200px, máximo 2MB
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-[#E5E7EB] dark:border-[#262626] pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Tipo Pix
            </label>
            <select
              value={formData.pixKeyType}
              onChange={(e) => handleChange('pixKeyType', e.target.value)}
              className="px-3 py-2 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            >
              {pixKeyTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tipo de chave
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Chave Pix Principal
            </label>
            <input
              type="text"
              value={formData.pixKeyValue}
              onChange={(e) => handleChange('pixKeyValue', e.target.value)}
              placeholder="Digite a chave"
              className="px-3 py-2 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Para recebimento de pagamentos
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Multa Atraso (%)
            </label>
            <input
              type="number"
              value={formData.multaAtraso}
              onChange={(e) => handleChange('multaAtraso', e.target.value)}
              className="px-3 py-2 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Padrão para contratos
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Juros Mensais (%)
            </label>
            <input
              type="number"
              value={formData.jurosMenuais}
              onChange={(e) => handleChange('jurosMenuais', e.target.value)}
              className="px-3 py-2 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Padrão para contratos
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-stretch md:justify-end pt-6 border-t border-[#E5E7EB] dark:border-[#262626]">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full md:w-auto px-6 py-2.5 bg-gray-900 dark:bg-gray-100 hover:bg-black dark:hover:bg-gray-200 text-white dark:text-gray-900 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white dark:border-gray-900"></div>
              Salvando...
            </>
          ) : (
            'Salvar Alterações'
          )}
        </button>
      </div>
    </div>
  );
}
