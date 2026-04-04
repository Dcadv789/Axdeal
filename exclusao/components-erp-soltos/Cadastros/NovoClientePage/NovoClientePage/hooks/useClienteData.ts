import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/lib/context/company-context';
import type { ClienteFormData } from '../types';
import { removerFormatacao } from '../utils/formatters';

function toDateInput(value?: string | null) {
  if (!value) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const match = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  return '';
}

function parseCurrencyInput(value?: string | null) {
  if (!value) return 0;

  const normalized = String(value)
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseTagsInput(value?: string | null) {
  if (!value) return null;

  const tags = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return tags.length ? Array.from(new Set(tags)) : null;
}

function generateCodigoCliente() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizeCodigoCliente(value?: string | number | null) {
  return String(value ?? '').replace(/\D/g, '');
}

const initialFormData: ClienteFormData = {
  tipo_pessoa: 'PF',
  codigo_cliente: '',
  nome: '',
  nome_fantasia: '',
  nome_contato: '',
  cpf_cnpj: '',
  inscricao_estadual: '',
  isento_ie: true,
  data_nascimento_fundacao: '',
  genero: '',
  email: '',
  email_secundario_cc: '',
  telefone: '',
  telefone_contato: '',
  whatsapp: '',
  site: '',
  instagram: '',
  site_instagram: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  id_regua_cobranca: '',
  status: 'ATIVO',
  bloqueado: false,
  classificacao_risco: 'BOM',
  limite_credito: '0',
  tipo_chave_pix: 'email',
  chave_pix: '',
  banco_nome: '',
  segmento: '',
  origem: '',
  tags: '',
  codigo_externo: '',
  aceita_marketing: true,
  observacoes_internas: '',
  porte: '',
  nome_socio: '',
  qualificacao_socio: '',
  natureza_juridica: '',
  opcao_pelo_simples: '',
  opcao_pelo_mei: '',
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
        .from('erp_contatos')
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
        codigo_cliente: normalizeCodigoCliente(data.codigo_cliente),
        nome: data.nome_razao_social || '',
        nome_fantasia: data.nome_fantasia || '',
        nome_contato: data.nome_contato || '',
        cpf_cnpj: data.tipo_pessoa === 'PF' ? (data.cpf || '') : (data.cnpj || ''),
        inscricao_estadual: data.isento_ie ? '' : data.inscricao_estadual || '',
        isento_ie: data.isento_ie ?? true,
        data_nascimento_fundacao: toDateInput(data.data_nascimento_fundacao),
        genero: data.genero || '',
        email: data.email_financeiro || '',
        email_secundario_cc: data.email_secundario_cc || '',
        telefone: data.telefone_fixo || '',
        telefone_contato: data.telefone_contato || '',
        whatsapp: data.whatsapp || '',
        site: data.site || '',
        instagram: data.instagram || '',
        site_instagram: data.site_instagram || '',
        cep: data.cep || '',
        logradouro: data.endereco_logradouro || '',
        numero: data.endereco_numero || '',
        complemento: data.endereco_complemento || '',
        bairro: data.endereco_bairro || '',
        cidade: data.endereco_cidade || '',
        uf: data.endereco_uf || '',
        id_regua_cobranca: data.id_regua_cobranca || '',
        status: data.status || 'ATIVO',
        bloqueado: data.bloqueado ?? false,
        classificacao_risco: data.classificacao_risco || 'BOM',
        limite_credito: data.limite_credito != null ? String(data.limite_credito) : '0',
        tipo_chave_pix: data.tipo_chave || 'email',
        chave_pix: data.chave_pix || '',
        banco_nome: data.nome_banco || '',
        segmento: data.segmento || '',
        origem: data.origem || '',
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
        codigo_externo: data.codigo_externo || '',
        aceita_marketing: data.aceita_marketing ?? true,
        observacoes_internas: data.observacoes_internas || '',
        porte: data.porte || '',
        nome_socio: data.nome_socio || '',
        qualificacao_socio: data.qualificacao_socio || '',
        natureza_juridica: data.natureza_juridica || '',
        opcao_pelo_simples: data.opcao_pelo_simples || '',
        opcao_pelo_mei: data.opcao_pelo_mei || '',
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
      setFormData({
        ...initialFormData,
        codigo_cliente: generateCodigoCliente(),
      });
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
      const normalizedCodigoCliente = normalizeCodigoCliente(formData.codigo_cliente);
      if (!normalizedCodigoCliente) {
        setSaveError('Informe um código do cliente.');
        return false;
      }

      let codigoClienteQuery = supabase
        .from('erp_contatos')
        .select('id')
        .eq('id_empresa', idEmpresa)
        .eq('codigo_cliente', normalizedCodigoCliente)
        .limit(1);

      if (mode === 'edit' && clienteId) {
        codigoClienteQuery = codigoClienteQuery.neq('id', clienteId);
      }

      const { data: codigoClienteExistente, error: codigoClienteError } = await codigoClienteQuery;
      if (codigoClienteError) throw codigoClienteError;

      if (codigoClienteExistente && codigoClienteExistente.length > 0) {
        setSaveError('Já existe outro cliente com esse código.');
        return false;
      }

      const payload = {
        id_empresa: idEmpresa,
        tipo_pessoa: formData.tipo_pessoa,
        codigo_cliente: normalizedCodigoCliente,
        nome_razao_social: formData.nome.trim(),
        nome_fantasia: formData.nome_fantasia?.trim() || null,
        nome_contato: formData.nome_contato?.trim() || null,
        cpf: formData.tipo_pessoa === 'PF' ? removerFormatacao(formData.cpf_cnpj) || null : null,
        cnpj: formData.tipo_pessoa === 'PJ' ? removerFormatacao(formData.cpf_cnpj) || null : null,
        inscricao_estadual: formData.isento_ie ? null : formData.inscricao_estadual?.trim() || null,
        isento_ie: Boolean(formData.isento_ie),
        data_nascimento_fundacao: formData.data_nascimento_fundacao || null,
        genero: formData.genero?.trim() || null,
        email_financeiro: formData.email?.trim() || null,
        email_secundario_cc: formData.email_secundario_cc?.trim() || null,
        telefone_fixo: formData.telefone?.trim() || null,
        telefone_contato: formData.telefone_contato?.trim() || null,
        whatsapp: formData.whatsapp?.trim() || formData.telefone?.trim() || null,
        site: formData.site?.trim() || null,
        instagram: formData.instagram?.trim() || null,
        site_instagram: formData.site_instagram?.trim() || null,
        cep: removerFormatacao(formData.cep || '') || null,
        endereco_logradouro: formData.logradouro?.trim() || null,
        endereco_numero: formData.numero?.trim() || null,
        endereco_complemento: formData.complemento?.trim() || null,
        endereco_bairro: formData.bairro?.trim() || null,
        endereco_cidade: formData.cidade?.trim() || null,
        endereco_uf: formData.uf?.trim() || null,
        id_regua_cobranca: formData.id_regua_cobranca?.trim() || null,
        status: formData.status || 'ATIVO',
        bloqueado: Boolean(formData.bloqueado),
        classificacao_risco: formData.classificacao_risco?.trim() || 'BOM',
        limite_credito: parseCurrencyInput(formData.limite_credito),
        tipo_chave: formData.tipo_chave_pix?.trim() || null,
        chave_pix: formData.chave_pix?.trim() || null,
        nome_banco: formData.banco_nome?.trim() || null,
        segmento: formData.segmento?.trim() || null,
        origem: formData.origem?.trim() || null,
        tags: parseTagsInput(formData.tags),
        codigo_externo: formData.codigo_externo?.trim() || null,
        aceita_marketing: Boolean(formData.aceita_marketing),
        observacoes_internas: formData.observacoes_internas?.trim() || null,
        porte: formData.porte?.trim() || null,
        nome_socio: formData.nome_socio?.trim() || null,
        qualificacao_socio: formData.qualificacao_socio?.trim() || null,
        natureza_juridica: formData.natureza_juridica?.trim() || null,
        opcao_pelo_simples: formData.opcao_pelo_simples?.trim() || null,
        opcao_pelo_mei: formData.opcao_pelo_mei?.trim() || null,
      };

      if (mode === 'edit' && clienteId) {
        const { error } = await supabase
          .from('erp_contatos')
          .update(payload)
          .eq('id', clienteId)
          .eq('id_empresa', idEmpresa);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('erp_contatos').insert(payload);
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
