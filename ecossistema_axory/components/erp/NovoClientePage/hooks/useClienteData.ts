import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/lib/context/company-context';
import type { ClienteFormData } from '../types';
import { removerFormatacao } from '../utils/formatters';

const initialFormData: ClienteFormData = {
  tipo_pessoa: 'PF',
  nome: '',
  nome_fantasia: '',
  cpf_cnpj: '',
  inscricao_estadual: '',
  email: '',
  telefone: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  observacoes: '',
};

export function useClienteData(clienteId: string | null, mode: 'create' | 'edit' | 'view') {
  const { user, idEmpresa: idEmpresaAuth } = useAuth();
  const { companyId } = useCompany();
  const [loading, setLoading] = useState(false);
  const [loadingForm, setLoadingForm] = useState(!!clienteId);
  const [formData, setFormData] = useState<ClienteFormData>(initialFormData);
  const [saveError, setSaveError] = useState<string | null>(null);

  const idEmpresa = companyId ?? idEmpresaAuth ?? null;

  const loadCliente = useCallback(async () => {
    if (!clienteId || !user) return;

    setLoadingForm(true);
    try {
      const { data: membroData } = await supabase
        .from('sis_membros_equipe')
        .select('id_empresa')
        .eq('id_usuario', user.id)
        .maybeSingle();

      const empresaId = companyId || membroData?.id_empresa;
      if (!empresaId) {
        setLoadingForm(false);
        return;
      }

      const { data, error } = await supabase
        .from('erp_clientes')
        .select('*')
        .eq('id', clienteId)
        .eq('id_empresa', empresaId)
        .maybeSingle();

      if (error || !data) {
        setLoadingForm(false);
        return;
      }

      setFormData({
        tipo_pessoa: (data.tipo_pessoa as 'PF' | 'PJ') || 'PF',
        nome: data.nome_razao_social || '',
        nome_fantasia: data.nome_fantasia || '',
        cpf_cnpj: data.tipo_pessoa === 'PF' ? (data.cpf || '') : (data.cnpj || ''),
        inscricao_estadual: data.inscricao_estadual || '',
        email: data.email_financeiro || '',
        telefone: data.whatsapp || data.telefone_fixo || '',
        cep: data.cep || '',
        logradouro: data.endereco_logradouro || '',
        numero: data.endereco_numero || '',
        complemento: data.endereco_complemento || '',
        bairro: data.endereco_bairro || '',
        cidade: data.endereco_cidade || '',
        uf: data.endereco_uf || '',
        observacoes: data.observacoes || '',
      });
    } catch (e) {
      console.error('Erro ao carregar cliente:', e);
    } finally {
      setLoadingForm(false);
    }
  }, [clienteId, user, companyId]);

  useEffect(() => {
    if (clienteId && (mode === 'edit' || mode === 'view')) {
      loadCliente();
    } else {
      setFormData(initialFormData);
    }
  }, [clienteId, mode, loadCliente]);

  const saveCliente = useCallback(async (): Promise<boolean> => {
    if (!idEmpresa) {
      setSaveError('Empresa não identificada. Faça login novamente.');
      return false;
    }

    setLoading(true);
    setSaveError(null);
    try {
      const payload = {
        id_empresa: idEmpresa,
        tipo_pessoa: formData.tipo_pessoa,
        nome_razao_social: formData.nome.trim(),
        nome_fantasia: formData.nome_fantasia?.trim() || null,
        cpf: formData.tipo_pessoa === 'PF' ? removerFormatacao(formData.cpf_cnpj) || null : null,
        cnpj: formData.tipo_pessoa === 'PJ' ? removerFormatacao(formData.cpf_cnpj) || null : null,
        inscricao_estadual: formData.inscricao_estadual?.trim() || null,
        email_financeiro: formData.email?.trim() || null,
        telefone_fixo: formData.telefone?.trim() || null,
        whatsapp: formData.telefone?.trim() || null,
        cep: removerFormatacao(formData.cep || '') || null,
        endereco_logradouro: formData.logradouro?.trim() || null,
        endereco_numero: formData.numero?.trim() || null,
        endereco_complemento: formData.complemento?.trim() || null,
        endereco_bairro: formData.bairro?.trim() || null,
        endereco_cidade: formData.cidade?.trim() || null,
        endereco_uf: formData.uf?.trim() || null,
        observacoes: formData.observacoes?.trim() || null,
        status: 'ATIVO',
      };

      if (mode === 'edit' && clienteId) {
        const { error } = await supabase
          .from('erp_clientes')
          .update(payload)
          .eq('id', clienteId)
          .eq('id_empresa', idEmpresa);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('erp_clientes').insert(payload);
        if (error) throw error;
      }
      return true;
    } catch (e: any) {
      setSaveError(e?.message || 'Erro ao salvar cliente.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [idEmpresa, formData, mode, clienteId]);

  return {
    loading,
    loadingForm,
    formData,
    setFormData,
    saveCliente,
    saveError,
    setSaveError,
  };
}
