'use client';

import { ArrowLeft, Loader2, Search } from 'lucide-react';
import type { NovoClientePageProps } from './types';
import { useClienteData } from './hooks/useClienteData';
import { useViaCEP } from './hooks/useViaCEP';
import { useReceitaWS } from './hooks/useReceitaWS';
import {
  formatarCPF,
  formatarCNPJ,
  formatarTelefone,
  formatarCEP,
  removerFormatacao,
} from './utils/formatters';

export default function NovoClientePage({
  onBack,
  mode,
  clienteId,
}: NovoClientePageProps) {
  const titulo =
    mode === 'edit'
      ? 'Editar Cliente'
      : mode === 'view'
        ? 'Detalhes do Cliente'
        : 'Novo Cliente';

  const {
    loading,
    loadingForm,
    formData,
    setFormData,
    saveCliente,
    saveError,
    setSaveError,
  } = useClienteData(clienteId, mode);

  const { buscarCEP, carregando: cepCarregando, erro: cepErro, limparErro: limparCepErro } = useViaCEP();
  const { buscarCNPJ, carregando: cnpjCarregando, erro: cnpjErro, limparErro: limparCnpjErro } = useReceitaWS();

  const isView = mode === 'view';
  const readOnly = isView;

  const handleChange = (field: keyof typeof formData, value: string) => {
    setSaveError(null);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCepBlur = () => {
    const cep = removerFormatacao(formData.cep || '');
    if (cep.length === 8) {
      limparCepErro();
      buscarCEP(formData.cep!, setFormData);
    }
  };

  const handleBuscarCNPJ = () => {
    const cnpj = removerFormatacao(formData.cpf_cnpj || '');
    if (cnpj.length === 14) {
      limparCnpjErro();
      buscarCNPJ(formData.cpf_cnpj!, setFormData);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await saveCliente();
    if (ok) onBack();
  };

  if (loadingForm) {
    return (
      <div className="py-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium"
        >
          <ArrowLeft size={18} />
          Voltar
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{titulo}</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {saveError && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
              {saveError}
            </div>
          )}
          {(cepErro || cnpjErro) && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm">
              {cepErro || cnpjErro}
            </div>
          )}

          {/* Tipo de pessoa */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Tipo de pessoa
            </h3>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipo_pessoa"
                  checked={formData.tipo_pessoa === 'PF'}
                  onChange={() => handleChange('tipo_pessoa', 'PF')}
                  disabled={readOnly}
                  className="rounded border-gray-300"
                />
                <span className="text-gray-700 dark:text-gray-300">Pessoa Física</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipo_pessoa"
                  checked={formData.tipo_pessoa === 'PJ'}
                  onChange={() => handleChange('tipo_pessoa', 'PJ')}
                  disabled={readOnly}
                  className="rounded border-gray-300"
                />
                <span className="text-gray-700 dark:text-gray-300">Pessoa Jurídica</span>
              </label>
            </div>
          </section>

          {/* Dados principais */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {formData.tipo_pessoa === 'PF' ? 'Nome completo' : 'Razão social'}
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                readOnly={readOnly}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 disabled:opacity-70"
                placeholder={formData.tipo_pessoa === 'PF' ? 'Nome completo' : 'Razão social'}
              />
            </div>
            {formData.tipo_pessoa === 'PJ' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome fantasia
                </label>
                <input
                  type="text"
                  value={formData.nome_fantasia || ''}
                  onChange={(e) => handleChange('nome_fantasia', e.target.value)}
                  readOnly={readOnly}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 disabled:opacity-70"
                  placeholder="Nome fantasia"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {formData.tipo_pessoa === 'PF' ? 'CPF' : 'CNPJ'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={
                    formData.tipo_pessoa === 'PF'
                      ? formatarCPF(formData.cpf_cnpj)
                      : formatarCNPJ(formData.cpf_cnpj)
                  }
                  onChange={(e) =>
                    handleChange('cpf_cnpj', removerFormatacao(e.target.value))
                  }
                  onBlur={formData.tipo_pessoa === 'PJ' ? handleBuscarCNPJ : undefined}
                  readOnly={readOnly}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 disabled:opacity-70"
                  placeholder={formData.tipo_pessoa === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'}
                />
                {formData.tipo_pessoa === 'PJ' && !readOnly && (
                  <button
                    type="button"
                    onClick={handleBuscarCNPJ}
                    disabled={cnpjCarregando}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 flex items-center gap-2"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Inscrição estadual
                </label>
                <input
                  type="text"
                  value={formData.inscricao_estadual || ''}
                  onChange={(e) => handleChange('inscricao_estadual', e.target.value)}
                  readOnly={readOnly}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 disabled:opacity-70"
                  placeholder="Opcional"
                />
              </div>
            )}
          </section>

          {/* Contato */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                readOnly={readOnly}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 disabled:opacity-70"
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={formatarTelefone(formData.telefone)}
                onChange={(e) => handleChange('telefone', removerFormatacao(e.target.value))}
                readOnly={readOnly}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 disabled:opacity-70"
                placeholder="(11) 99999-9999"
              />
            </div>
          </section>

          {/* Endereço */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CEP
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formatarCEP(formData.cep || '')}
                    onChange={(e) => handleChange('cep', removerFormatacao(e.target.value))}
                    onBlur={handleCepBlur}
                    readOnly={readOnly}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 disabled:opacity-70"
                    placeholder="00000-000"
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleCepBlur()}
                      disabled={cepCarregando}
                      className="px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 flex items-center gap-2"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Logradouro
                </label>
                <input
                  type="text"
                  value={formData.logradouro || ''}
                  onChange={(e) => handleChange('logradouro', e.target.value)}
                  readOnly={readOnly}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 disabled:opacity-70"
                  placeholder="Rua, avenida..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Número
                </label>
                <input
                  type="text"
                  value={formData.numero || ''}
                  onChange={(e) => handleChange('numero', e.target.value)}
                  readOnly={readOnly}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 disabled:opacity-70"
                  placeholder="Nº"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Complemento
                </label>
                <input
                  type="text"
                  value={formData.complemento || ''}
                  onChange={(e) => handleChange('complemento', e.target.value)}
                  readOnly={readOnly}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 disabled:opacity-70"
                  placeholder="Apto, sala..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  value={formData.bairro || ''}
                  onChange={(e) => handleChange('bairro', e.target.value)}
                  readOnly={readOnly}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 disabled:opacity-70"
                  placeholder="Bairro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={formData.cidade || ''}
                  onChange={(e) => handleChange('cidade', e.target.value)}
                  readOnly={readOnly}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 disabled:opacity-70"
                  placeholder="Cidade"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  UF
                </label>
                <input
                  type="text"
                  value={formData.uf || ''}
                  onChange={(e) => handleChange('uf', e.target.value.toUpperCase().slice(0, 2))}
                  readOnly={readOnly}
                  maxLength={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 disabled:opacity-70"
                  placeholder="UF"
                />
              </div>
            </div>
          </section>

          {/* Observações */}
          <section>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Observações
            </label>
            <textarea
              value={formData.observacoes || ''}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              readOnly={readOnly}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 disabled:opacity-70 resize-none"
              placeholder="Anotações sobre o cliente"
            />
          </section>

          {/* Ações */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 font-medium"
            >
              Voltar
            </button>
            {!isView && (
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar cliente'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
