import type { ClienteFormData } from '../types';

export async function buscarDadosCNPJ(cnpj: string): Promise<any> {
  const limpo = cnpj.replace(/\D/g, '');
  if (limpo.length !== 14) return null;
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

export function mapearDadosReceitaWS(data: any): Partial<ClienteFormData> {
  if (!data) return {};
  const end = data.endereco || {};
  const cep = end.cep ?? data.cep;
  const cepStr = cep ? String(cep).replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2') : '';
  return {
    nome: data.razao_social || data.nome || '',
    nome_fantasia: data.nome_fantasia || '',
    logradouro: end.logradouro || data.logradouro || '',
    numero: end.numero || data.numero || '',
    complemento: end.complemento || data.complemento || '',
    bairro: end.bairro || data.bairro || '',
    cidade: end.municipio || data.municipio || data.cidade || '',
    uf: end.uf || data.uf || '',
    cep: cepStr,
  };
}

export async function buscarEnderecoCEP(cep: string): Promise<any> {
  const limpo = cep.replace(/\D/g, '');
  if (limpo.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.erro === true) return null;
    return data;
  } catch {
    return null;
  }
}

export function mapearDadosViaCEP(data: any): Partial<ClienteFormData> {
  if (!data) return {};
  return {
    cep: data.cep || '',
    logradouro: data.logradouro || '',
    complemento: data.complemento || '',
    bairro: data.bairro || '',
    cidade: data.localidade || '',
    uf: data.uf || '',
  };
}
