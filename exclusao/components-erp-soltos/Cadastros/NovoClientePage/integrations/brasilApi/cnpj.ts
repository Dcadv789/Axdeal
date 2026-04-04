import type { ClienteFormData } from '../../types';

function normalizarTelefone(value?: string | null) {
  if (!value) return '';
  return String(value).replace(/\D/g, '');
}

function normalizarData(value?: string | null) {
  if (!value) return '';

  const date = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const br = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    return `${br[3]}-${br[2]}-${br[1]}`;
  }

  return '';
}

function manterSomenteCamposPreenchidos(data: Partial<ClienteFormData>) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ) as Partial<ClienteFormData>;
}

export async function buscarDadosCNPJ(cnpj: string): Promise<any> {
  const limpo = cnpj.replace(/\D/g, '');
  if (limpo.length !== 14) return null;

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function mapearDadosBrasilApiCNPJ(data: any): Partial<ClienteFormData> {
  if (!data) return {};

  const end = data.endereco || {};
  const cep = end.cep ?? data.cep;
  const cepStr = cep ? String(cep).replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2') : '';
  const telefonePrincipal = normalizarTelefone(data.ddd_telefone_1 || data.telefone || '');
  const telefoneSecundario = normalizarTelefone(data.ddd_telefone_2 || '');
  const socioPrincipal = Array.isArray(data.qsa) ? data.qsa[0] : null;

  return manterSomenteCamposPreenchidos({
    nome: data.razao_social || data.nome || '',
    nome_fantasia: data.nome_fantasia || '',
    nome_contato: data.nome_contato || data.contato || '',
    email:
      data.email ||
      data.correio_eletronico ||
      data.email_corporativo ||
      data.contato_email ||
      data.emails?.[0]?.email ||
      '',
    telefone: telefonePrincipal,
    telefone_contato: telefoneSecundario || telefonePrincipal,
    whatsapp: telefoneSecundario || telefonePrincipal,
    logradouro: end.logradouro || data.logradouro || '',
    numero: end.numero || data.numero || '',
    complemento: end.complemento || data.complemento || '',
    bairro: end.bairro || data.bairro || '',
    cidade: end.municipio || data.municipio || data.cidade || '',
    uf: end.uf || data.uf || '',
    cep: cepStr,
    data_nascimento_fundacao: normalizarData(data.data_inicio_atividade || data.data_situacao_cadastral || ''),
    porte: data.porte || data.porte_descricao || '',
    natureza_juridica:
      data.natureza_juridica ||
      data.natureza_juridica_descricao ||
      data.descricao_natureza_juridica ||
      '',
    opcao_pelo_simples:
      typeof data.opcao_pelo_simples === 'boolean' ? (data.opcao_pelo_simples ? 'SIM' : 'NAO') : data.opcao_pelo_simples || '',
    opcao_pelo_mei:
      typeof data.opcao_pelo_mei === 'boolean' ? (data.opcao_pelo_mei ? 'SIM' : 'NAO') : data.opcao_pelo_mei || '',
    nome_socio: socioPrincipal?.nome_socio || socioPrincipal?.nome || '',
    qualificacao_socio:
      socioPrincipal?.qualificacao_socio ||
      socioPrincipal?.qualificacao_representante_legal ||
      socioPrincipal?.qual ||
      '',
  });
}
