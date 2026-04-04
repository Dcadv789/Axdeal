import type { ClienteFormData } from '../../types';

function manterSomenteCamposPreenchidos(data: Partial<ClienteFormData>) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ) as Partial<ClienteFormData>;
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

  return manterSomenteCamposPreenchidos({
    cep: data.cep || '',
    logradouro: data.logradouro || '',
    complemento: data.complemento || '',
    bairro: data.bairro || '',
    cidade: data.localidade || '',
    uf: data.uf || '',
  });
}
