import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { 
  PropostaFormData, 
  PropostaImpostos,
  PropostaItem, 
  Cliente, 
  Configuracoes,
  PropostaMode,
  PropostaTipo 
} from '../types';

interface UsePropostaDataProps {
  idEmpresa: string | null;
  propostaId: string | null;
  vendaId: string | null;
  osId: string | null;
  mode: PropostaMode;
  tipo: PropostaTipo;
}

function obterPrefixoPadrao(tipo: PropostaTipo): string {
  if (tipo === 'venda') return 'VEN';
  if (tipo === 'os') return 'OS';
  return 'PRP';
}

function formatarCodigoDocumento(prefixo: string | null | undefined, numero: string | number | null | undefined): string {
  const numeroTexto = numero === null || numero === undefined ? '' : String(numero).trim();
  const prefixoTexto = (prefixo || '').trim();
  if (!numeroTexto) return '';
  return prefixoTexto ? `${prefixoTexto}-${numeroTexto}` : numeroTexto;
}

function montarTituloDocumento(tipo: 'venda' | 'os', prefixo: string | null | undefined, numero: string | number | null | undefined): string {
  const codigo = formatarCodigoDocumento(prefixo, formatarNumeroCodigo4(numero));
  const base = tipo === 'os' ? 'Ordem de Serviço' : 'Pedido de Venda';
  return codigo ? `${base} [${codigo}]` : base;
}

function formatarNumeroCodigo4(numero: string | number | null | undefined): string {
  const somenteDigitos = String(numero ?? '').replace(/\D/g, '');
  if (!somenteDigitos) return '';
  return somenteDigitos.padStart(4, '0').slice(-4);
}

function somarPrazoPorTipo(base: Date, quantidade: number, tipo: string | null | undefined): Date {
  const data = new Date(base);
  const tipoNormalizado = String(tipo || 'dias').toLowerCase().trim();

  if (tipoNormalizado === 'mes' || tipoNormalizado === 'meses') {
    data.setMonth(data.getMonth() + quantidade);
    return data;
  }

  if (tipoNormalizado === 'ano' || tipoNormalizado === 'anos') {
    data.setFullYear(data.getFullYear() + quantidade);
    return data;
  }

  data.setDate(data.getDate() + quantidade);
  return data;
}

function converterPrazoParaData(valor: string | null | undefined, dataBase: string | null | undefined): string {
  const texto = String(valor || '').trim();
  if (!texto) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto;
  }

  const match = texto.match(/^(\d+)\s*(dia|dias|mes|meses|ano|anos)$/i);
  if (!match) return '';

  const quantidade = Number(match[1]);
  const tipo = match[2].toLowerCase();
  const base = dataBase ? new Date(`${dataBase}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) return '';

  return somarPrazoPorTipo(base, quantidade, tipo).toISOString().split('T')[0];
}

function formatarValorMonetarioEntrada(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '';
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return '';
  return numero.toFixed(2).replace('.', ',');
}

function carregarImpostosDoRegistro(
  registro: any,
  setImpostos: (impostos: PropostaImpostos) => void
) {
  const possuiImpostosNasColunas =
    registro?.perc_iss != null ||
    registro?.perc_icms != null ||
    registro?.perc_pis != null ||
    registro?.perc_cofins != null ||
    registro?.perc_ir_csll_retido != null;

  if (possuiImpostosNasColunas) {
    setImpostos({
      percentualIss: registro.perc_iss ? String(registro.perc_iss).replace('.', ',') : '',
      percentualIcms: registro.perc_icms ? String(registro.perc_icms).replace('.', ',') : '',
      percentualPis: registro.perc_pis ? String(registro.perc_pis).replace('.', ',') : '',
      percentualCofins: registro.perc_cofins ? String(registro.perc_cofins).replace('.', ',') : '',
      percentualIrpjCsllRetido: registro.perc_ir_csll_retido
        ? String(registro.perc_ir_csll_retido).replace('.', ',')
        : '',
    });
    return;
  }

  if (
    registro?.condicoes_personalizadas &&
    typeof registro.condicoes_personalizadas === 'object' &&
    registro.condicoes_personalizadas.impostos
  ) {
    const impostosSalvos = registro.condicoes_personalizadas.impostos as any;
    setImpostos({
      percentualIss: impostosSalvos.percentual_iss ? String(impostosSalvos.percentual_iss).replace('.', ',') : '',
      percentualIcms: impostosSalvos.percentual_icms ? String(impostosSalvos.percentual_icms).replace('.', ',') : '',
      percentualPis: impostosSalvos.percentual_pis ? String(impostosSalvos.percentual_pis).replace('.', ',') : '',
      percentualCofins: impostosSalvos.percentual_cofins ? String(impostosSalvos.percentual_cofins).replace('.', ',') : '',
      percentualIrpjCsllRetido: impostosSalvos.percentual_irpj_csll_retido
        ? String(impostosSalvos.percentual_irpj_csll_retido).replace('.', ',')
        : '',
    });
    return;
  }

  setImpostos({
    percentualIss: '',
    percentualIcms: '',
    percentualPis: '',
    percentualCofins: '',
    percentualIrpjCsllRetido: '',
  });
}

export function usePropostaData({
  idEmpresa,
  propostaId,
  vendaId,
  osId,
  mode,
  tipo
}: UsePropostaDataProps) {
  const [formData, setFormData] = useState<PropostaFormData>({
    numeroProposta: '',
    titulo: '',
    descricao: '',
    referencia: '',
    clienteBusca: '',
    id_departamento: null,
    id_projeto: null,
    dataProposta: new Date().toISOString().split('T')[0],
    dataValidade: '',
    dataInicio: '',
    dataFim: '',
    prazoEntrega: '',
    prazoGarantia: '',
    observacoes: '',
    observacoesInternas: '',
    custoExtraOS: '',
    campos_adicionais: {},
  });

  const [items, setItems] = useState<PropostaItem[]>([]);
  const [impostos, setImpostos] = useState<PropostaImpostos>({
    percentualIss: '',
    percentualIcms: '',
    percentualPis: '',
    percentualCofins: '',
    percentualIrpjCsllRetido: '',
  });
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [statusProposta, setStatusProposta] = useState('AGUARDANDO_ENVIO');
  const [descontoGeralReal, setDescontoGeralReal] = useState('');
  const [descontoGeralPercent, setDescontoGeralPercent] = useState('');
  const [acrescimo, setAcrescimo] = useState('');
  const [frete, setFrete] = useState('');
  const [valorTotalFinalCarregado, setValorTotalFinalCarregado] = useState<number | null>(null);
  const [codigoVendaGerada, setCodigoVendaGerada] = useState<string | null>(null);
  const [codigoOsGerada, setCodigoOsGerada] = useState<string | null>(null);
  const [codigoPropostaOrigem, setCodigoPropostaOrigem] = useState<string | null>(null);
  const [codigoPrefixoAtual, setCodigoPrefixoAtual] = useState<string>(obterPrefixoPadrao(tipo));
  const [idVendedor, setIdVendedor] = useState<string | null>(null);
  const [idUsuarioResponsavel, setIdUsuarioResponsavel] = useState<string | null>(null);
  const [idCondicaoPagamento, setIdCondicaoPagamento] = useState<string | null>(null);
  const [condicoesPersonalizadasCarregadas, setCondicoesPersonalizadasCarregadas] = useState<any | null>(null);
  const [configuracaoBlocos, setConfiguracaoBlocos] = useState<{ [key: string]: boolean }>({});
  const [carregando, setCarregando] = useState(false);

  // Gerar código da proposta/venda/OS
  const gerarCodigo = useCallback(async () => {
    if (!idEmpresa || (mode !== 'create' && mode !== 'copy')) return;

    try {
      const { data: config, error } = await supabase
        .from('erp_configuracoes')
        .select('prefixo_proposta, proximo_numero_proposta, prefixo_venda, proximo_numero_venda, prefixo_os, proximo_numero_os')
        .eq('id_empresa', idEmpresa)
        .maybeSingle();

      if (error) throw error;

      if (config) {
        let prefixo: string;
        let numero: number;
        if (tipo === 'venda') {
          prefixo = config.prefixo_venda || 'VEN';
          numero = config.proximo_numero_venda || 1;
        } else if (tipo === 'os') {
          prefixo = config.prefixo_os || 'OS';
          numero = config.proximo_numero_os || 1;
        } else {
          prefixo = config.prefixo_proposta || 'PRP';
          numero = config.proximo_numero_proposta || 1;
        }
        setCodigoPrefixoAtual(prefixo);
        setFormData((prev) => ({ ...prev, numeroProposta: formatarNumeroCodigo4(numero) }));
      }
    } catch (error) {
      console.error('Erro ao gerar código:', error);
    }
  }, [idEmpresa, mode, tipo]);

  // Carregar configurações padrão
  const carregarConfiguracoesPadrao = useCallback(async () => {
    if (!idEmpresa) return;

    try {
      const { data, error } = await supabase
        .from('erp_configuracoes')
        .select('*')
        .eq('id_empresa', idEmpresa)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const hoje = new Date();

        // Data de validade (dias/meses/anos)
        if (data.validade_proposta_dias) {
          const dataValidade = somarPrazoPorTipo(
            hoje,
            Number(data.validade_proposta_dias) || 0,
            data.validade_proposta_tipo
          );
          setFormData((prev) => ({
            ...prev,
            dataValidade: dataValidade.toISOString().split('T')[0],
          }));
        }

        // Prazo de entrega
        if (data.prazo_entrega_padrao_dias) {
          const dataEntrega = somarPrazoPorTipo(
            hoje,
            Number(data.prazo_entrega_padrao_dias) || 0,
            data.prazo_entrega_padrao_tipo
          );
          setFormData((prev) => ({
            ...prev,
            prazoEntrega: dataEntrega.toISOString().split('T')[0],
          }));
        }

        // Prazo de garantia
        if (data.prazo_garantia_padrao_dias) {
          const dataGarantia = somarPrazoPorTipo(
            hoje,
            Number(data.prazo_garantia_padrao_dias) || 0,
            data.prazo_garantia_padrao_tipo
          );
          setFormData((prev) => ({
            ...prev,
            prazoGarantia: dataGarantia.toISOString().split('T')[0],
          }));
        }

        // Observações padrão
        if (tipo === 'proposta' && data.observacoes_padrao_proposta) {
          setFormData((prev) => ({
            ...prev,
            observacoes: data.observacoes_padrao_proposta,
          }));
        } else if (tipo === 'venda' && data.observacoes_padrao_venda) {
          setFormData((prev) => ({
            ...prev,
            observacoes: data.observacoes_padrao_venda,
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  }, [idEmpresa, tipo]);

  // Carregar dados da proposta existente
  const carregarProposta = useCallback(async (overridePropostaId?: string) => {
    const idToLoad = overridePropostaId ?? propostaId;
    if (!idToLoad || !idEmpresa) return;

    try {
      setCarregando(true);

      // Buscar proposta (FK explícita para evitar PGRST201 com múltiplas FKs)
      const { data: propostaData, error: propostaError } = await supabase
        .from('erp_propostas')
        .select(`
          *,
          erp_contatos!erp_propostas_id_cliente_fkey(id, nome_razao_social, nome_fantasia, tipo_pessoa, cnpj, cpf)
        `)
        .eq('id', idToLoad)
        .eq('id_empresa', idEmpresa)
        .single();

      if (propostaError) throw propostaError;
      if (!propostaData) return;

      // Preencher formulário
      setFormData({
        numeroProposta: formatarNumeroCodigo4(propostaData.codigo_numero),
        titulo: propostaData.titulo || '',
        descricao: propostaData.descricao || '',
        referencia: propostaData.referencia || '',
        clienteBusca: propostaData.erp_contatos?.nome_fantasia || propostaData.erp_contatos?.nome_razao_social || '',
        id_departamento: propostaData.id_departamento || null,
        id_projeto: propostaData.id_projeto || null,
        dataProposta: propostaData.data_emissao || new Date().toISOString().split('T')[0],
        dataValidade: propostaData.data_validade || '',
        dataInicio: propostaData.data_inicio || '',
        dataFim: propostaData.data_fim || '',
        prazoEntrega: converterPrazoParaData(propostaData.prazo_entrega, propostaData.data_emissao),
        prazoGarantia: converterPrazoParaData(propostaData.prazo_garantia, propostaData.data_emissao),
        observacoes: propostaData.observacoes_cliente || '',
        observacoesInternas: propostaData.observacoes_internas || '',
        custoExtraOS: '',
        campos_adicionais:
          propostaData.campos_adicionais && typeof propostaData.campos_adicionais === 'object'
            ? (propostaData.campos_adicionais as Record<string, string | number | null>)
            : {},
      });

      setCodigoPrefixoAtual(propostaData.codigo_prefixo || obterPrefixoPadrao('proposta'));
      setStatusProposta(propostaData.status || 'RASCUNHO');
      setValorTotalFinalCarregado(
        propostaData.valor_total_final !== null && propostaData.valor_total_final !== undefined
          ? Number(propostaData.valor_total_final)
          : null
      );
      setAcrescimo(propostaData.valor_acrescimo?.toFixed(2).replace('.', ',') || '');
      setFrete(propostaData.valor_frete_outros?.toFixed(2).replace('.', ',') || '');
      setDescontoGeralReal(propostaData.valor_desconto_global?.toFixed(2).replace('.', ',') || '');
      setIdVendedor(propostaData.id_vendedor || null);
      setIdUsuarioResponsavel(null);
      setIdCondicaoPagamento(propostaData.id_condicao_pagamento || null);
      setCondicoesPersonalizadasCarregadas(propostaData.condicoes_personalizadas || null);
      carregarImpostosDoRegistro(propostaData, setImpostos);
      
      // Carregar configuração de blocos
      if (propostaData.configuracao_blocos && typeof propostaData.configuracao_blocos === 'object') {
        setConfiguracaoBlocos(propostaData.configuracao_blocos as { [key: string]: boolean });
      } else {
        setConfiguracaoBlocos({});
      }

      if (propostaData.erp_contatos) {
        setClienteSelecionado(propostaData.erp_contatos as Cliente);
      }

      // Buscar itens (erp_itens_proposta com JOIN em erp_catalogo)
      const { data: itensData, error: itensError } = await supabase
        .from('erp_itens_proposta')
        .select(`
          *,
          erp_catalogo!id_item_catalogo(nome, tipo, unidade_medida, codigo, custo_aquisicao)
        `)
        .eq('id_proposta', idToLoad)
        .order('criado_em', { ascending: true });

      if (itensError) throw itensError;

      if (itensData && itensData.length > 0) {
        const itensFormatados: PropostaItem[] = itensData.map((item: any) => {
          const catalogo = item.erp_catalogo;
          const nomeItem = catalogo?.nome || item.descricao_item || '';
          const tipoItem = item.tipo_item === 'SERVICO' ? 'servico' : 'produto';
          const valorUnit = item.preco_unitario?.toFixed(2).replace('.', ',') || '0,00';
          const qtd = item.quantidade || 1;
          const desconto = item.desconto_item || 0;
          const subtotal = qtd * item.preco_unitario;
          const valorTotal = subtotal - desconto;
          const codigoCompleto = catalogo?.codigo ?? '';
          const codigoSemPrefix = codigoCompleto ? (codigoCompleto.includes('-') ? codigoCompleto.split('-').pop() : codigoCompleto.includes('_') ? codigoCompleto.split('_').pop() : codigoCompleto) : '';

          return {
            id: item.id,
            tipo: tipoItem,
            codigo: codigoSemPrefix ?? '',
            nome: nomeItem,
            quantidade: qtd,
            valorUnitario: valorUnit,
            descontoReal: desconto.toFixed(2).replace('.', ','),
            descontoPercent: subtotal > 0 ? ((desconto / subtotal) * 100).toFixed(2) : '0,00',
            valorTotal: valorTotal,
            id_item_catalogo: item.id_item_catalogo ?? null,
            custoAquisicao:
              catalogo?.custo_aquisicao === null || catalogo?.custo_aquisicao === undefined
                ? null
                : Number(catalogo.custo_aquisicao || 0),
          };
        });

        setItems(itensFormatados);
      }

      // Buscar pedido de venda relacionado
      const { data: vendaData } = await supabase
        .from('erp_pedidos_venda')
        .select('codigo_prefixo, codigo_numero')
        .eq('id_proposta_origem', idToLoad)
        .maybeSingle();

      if (vendaData) {
        setCodigoVendaGerada(formatarCodigoDocumento(vendaData.codigo_prefixo, vendaData.codigo_numero));
      } else {
        setCodigoVendaGerada(null);
      }

      const { data: osRelacionada } = await supabase
        .from('erp_os')
        .select('codigo_prefixo, codigo_numero')
        .eq('id_proposta_origem', idToLoad)
        .maybeSingle();

      if (osRelacionada) {
        setCodigoOsGerada(formatarCodigoDocumento(osRelacionada.codigo_prefixo, osRelacionada.codigo_numero));
      } else {
        setCodigoOsGerada(null);
      }
    } catch (error) {
      console.error('Erro ao carregar proposta:', error);
      alert('Erro ao carregar dados da proposta');
    } finally {
      setCarregando(false);
    }
  }, [propostaId, idEmpresa]);

  // Carregar venda: busca dados da VENDA em erp_pedidos_venda (não da proposta)
  // id_proposta_origem é apenas referência opcional; venda tem seus próprios dados
  const carregarVenda = useCallback(async () => {
    if (!vendaId || !idEmpresa) return;
    try {
      setCarregando(true);
      const { data: vendaData, error } = await supabase
        .from('erp_pedidos_venda')
        .select('*')
        .eq('id', vendaId)
        .eq('id_empresa', idEmpresa)
        .single();

      if (error) throw error;
      if (!vendaData) return;

      let contato: Cliente | null = null;
      if (vendaData.id_contato) {
        const { data: contatoData } = await supabase
          .from('erp_contatos')
          .select('id, nome_razao_social, nome_fantasia, tipo_pessoa, cnpj, cpf')
          .eq('id', vendaData.id_contato)
          .maybeSingle();
        contato = (contatoData as Cliente | null) ?? null;
      }
      setFormData({
        numeroProposta: formatarNumeroCodigo4(vendaData.codigo_numero),
        titulo: vendaData.titulo || '',
        descricao: vendaData.observacoes_impressas || '',
        referencia: vendaData.referencia || '',
        clienteBusca: contato?.nome_fantasia || contato?.nome_razao_social || '',
        id_departamento: null,
        id_projeto: null,
        dataProposta: vendaData.data_venda || new Date().toISOString().split('T')[0],
        dataValidade: vendaData.data_validade || '',
        dataInicio: vendaData.data_inicio || '',
        dataFim: vendaData.data_fim || '',
        prazoEntrega: converterPrazoParaData(vendaData.prazo_entrega, vendaData.data_venda),
        prazoGarantia: converterPrazoParaData(vendaData.prazo_garantia, vendaData.data_venda),
        observacoes: vendaData.observacoes_impressas || '',
        observacoesInternas: '',
        custoExtraOS: formatarValorMonetarioEntrada(vendaData.custo_extra_os),
        campos_adicionais:
          vendaData.campos_adicionais && typeof vendaData.campos_adicionais === 'object'
            ? (vendaData.campos_adicionais as Record<string, string | number | null>)
            : {},
      });
      setCodigoPrefixoAtual(vendaData.codigo_prefixo || obterPrefixoPadrao('venda'));

      setStatusProposta(vendaData.status || 'EM_ABERTO');
      setValorTotalFinalCarregado(
        vendaData.valor_total_final !== null && vendaData.valor_total_final !== undefined
          ? Number(vendaData.valor_total_final)
          : null
      );
      setAcrescimo('');
      setFrete('');
      setDescontoGeralReal('');
      setCondicoesPersonalizadasCarregadas(vendaData.condicoes_personalizadas || null);
      setClienteSelecionado(contato);
      setIdVendedor(vendaData.id_vendedor || null);
      setIdUsuarioResponsavel(null);
      const condicaoPersonalizada = vendaData.condicoes_personalizadas && typeof vendaData.condicoes_personalizadas === 'object'
        ? vendaData.condicoes_personalizadas
        : null;
      const condicaoIdPersonalizada = condicaoPersonalizada?.condicao_id
        ? String(condicaoPersonalizada.condicao_id)
        : null;
      setIdCondicaoPagamento(vendaData.id_condicao_pagamento || condicaoIdPersonalizada || null);
      carregarImpostosDoRegistro(vendaData, setImpostos);

      // Código da proposta de origem (apenas referência, exibido no campo informativo se existir)
      if (vendaData.id_proposta_origem) {
        const { data: propostaData } = await supabase
          .from('erp_propostas')
          .select('codigo_prefixo, codigo_numero')
          .eq('id', vendaData.id_proposta_origem)
          .maybeSingle();
        setCodigoPropostaOrigem(
          propostaData ? formatarCodigoDocumento(propostaData.codigo_prefixo, propostaData.codigo_numero) : null
        );

        // Itens: carregar da proposta (referência) para cálculo do valor total
        const { data: itensData, error: itensError } = await supabase
          .from('erp_itens_proposta')
          .select(`
            *,
            erp_catalogo!id_item_catalogo(nome, tipo, unidade_medida, codigo, custo_aquisicao)
          `)
          .eq('id_proposta', vendaData.id_proposta_origem)
          .order('criado_em', { ascending: true });

        if (!itensError && itensData && itensData.length > 0) {
          const itensFormatados: PropostaItem[] = itensData.map((item: any) => {
            const catalogo = item.erp_catalogo;
            const nomeItem = catalogo?.nome || item.descricao_item || '';
            const tipoItem = item.tipo_item === 'SERVICO' ? 'servico' : 'produto';
            const valorUnit = item.preco_unitario?.toFixed(2).replace('.', ',') || '0,00';
            const qtd = item.quantidade || 1;
            const desconto = item.desconto_item || 0;
            const subtotal = qtd * item.preco_unitario;
            const valorTotal = subtotal - desconto;
            const codigoCompleto = catalogo?.codigo ?? '';
            const codigoSemPrefix = codigoCompleto ? (codigoCompleto.includes('-') ? codigoCompleto.split('-').pop() : codigoCompleto.includes('_') ? codigoCompleto.split('_').pop() : codigoCompleto) : '';
            return {
              id: item.id,
              tipo: tipoItem,
              codigo: codigoSemPrefix ?? '',
              nome: nomeItem,
              quantidade: qtd,
              valorUnitario: valorUnit,
              descontoReal: desconto.toFixed(2).replace('.', ','),
              descontoPercent: subtotal > 0 ? ((desconto / subtotal) * 100).toFixed(2) : '0,00',
              valorTotal: valorTotal,
              id_item_catalogo: item.id_item_catalogo ?? null,
              custoAquisicao:
                catalogo?.custo_aquisicao === null || catalogo?.custo_aquisicao === undefined
                  ? null
                  : Number(catalogo.custo_aquisicao || 0),
            };
          });
          setItems(itensFormatados);
        } else {
          setItems([]);
        }
      } else {
        setCodigoPropostaOrigem(null);
        setItems([]);
      }
      setCodigoVendaGerada(null);
      setCodigoOsGerada(null);
    } catch (err) {
      console.error('Erro ao carregar venda:', err);
      alert('Erro ao carregar dados da venda');
    } finally {
      setCarregando(false);
    }
  }, [vendaId, idEmpresa]);

  // Carregar dados da ordem de serviço
  const carregarOS = useCallback(async () => {
    if (!osId || !idEmpresa) return;
    try {
      setCarregando(true);
      const { data: osData, error } = await supabase
        .from('erp_os')
        .select('*')
        .eq('id', osId)
        .eq('id_empresa', idEmpresa)
        .single();

      if (error) throw error;
      if (!osData) return;

      let contato: Cliente | null = null;
      if (osData.id_contato) {
        const { data: contatoData } = await supabase
          .from('erp_contatos')
          .select('id, nome_razao_social, nome_fantasia, tipo_pessoa, cnpj, cpf')
          .eq('id', osData.id_contato)
          .maybeSingle();
        contato = (contatoData as Cliente | null) ?? null;
      }
      setFormData({
        numeroProposta: formatarNumeroCodigo4(osData.codigo_numero),
        titulo: osData.titulo || '',
        descricao: osData.descricao || '',
        referencia: osData.referencia || '',
        clienteBusca: contato?.nome_fantasia || contato?.nome_razao_social || '',
        id_departamento: osData.id_departamento || null,
        id_projeto: osData.id_projeto || null,
        dataProposta: osData.data_emissao || new Date().toISOString().split('T')[0],
        dataValidade: '',
        dataInicio: osData.data_inicio || '',
        dataFim: osData.data_fim || '',
        prazoEntrega: converterPrazoParaData(osData.prazo_entrega, osData.data_emissao),
        prazoGarantia: converterPrazoParaData(osData.prazo_garantia, osData.data_emissao),
        observacoes: osData.observacoes || osData.descricao || '',
        observacoesInternas: osData.observacoes_internas || '',
        custoExtraOS: formatarValorMonetarioEntrada(osData.custo_extra_os),
        campos_adicionais:
          osData.campos_adicionais && typeof osData.campos_adicionais === 'object'
            ? (osData.campos_adicionais as Record<string, string | number | null>)
            : {},
      });
      setCodigoPrefixoAtual(osData.codigo_prefixo || obterPrefixoPadrao('os'));

      setStatusProposta(osData.status || 'EM_ABERTO');
      setValorTotalFinalCarregado(
        osData.valor_total !== null && osData.valor_total !== undefined ? Number(osData.valor_total) : null
      );
      setAcrescimo(formatarValorMonetarioEntrada(osData.valor_acrescimo));
      setFrete(formatarValorMonetarioEntrada(osData.valor_frete_outros));
      setDescontoGeralReal(formatarValorMonetarioEntrada(osData.valor_desconto_global));
      setCondicoesPersonalizadasCarregadas(osData.condicoes_personalizadas || null);
      setClienteSelecionado(contato);
      setIdVendedor(osData.id_vendedor || null);
      setIdUsuarioResponsavel(osData.id_usuario_responsavel || null);
      const condicaoPersonalizada = osData.condicoes_personalizadas && typeof osData.condicoes_personalizadas === 'object'
        ? osData.condicoes_personalizadas
        : null;
      const condicaoIdPersonalizada = condicaoPersonalizada?.condicao_id
        ? String(condicaoPersonalizada.condicao_id)
        : null;
      setIdCondicaoPagamento(osData.id_condicao_pagamento || condicaoIdPersonalizada || null);
      carregarImpostosDoRegistro(osData, setImpostos);
      setCodigoVendaGerada(null);
      setCodigoOsGerada(null);

      if (osData.id_proposta_origem) {
        const { data: propostaOrigem } = await supabase
          .from('erp_propostas')
          .select('codigo_prefixo, codigo_numero')
          .eq('id', osData.id_proposta_origem)
          .maybeSingle();

        setCodigoPropostaOrigem(
          propostaOrigem ? formatarCodigoDocumento(propostaOrigem.codigo_prefixo, propostaOrigem.codigo_numero) : null
        );
      } else {
        setCodigoPropostaOrigem(null);
      }

      // Buscar itens da OS (erp_itens_movimentacao com id_os)
      const { data: itensData, error: itensError } = await supabase
        .from('erp_itens_movimentacao')
        .select(`
          *,
          erp_catalogo!id_item_catalogo(nome, tipo, unidade_medida, codigo, custo_aquisicao)
        `)
        .eq('id_os', osId)
        .order('criado_em', { ascending: true });

      if (!itensError && itensData && itensData.length > 0) {
        const itensFormatados: PropostaItem[] = itensData.map((item: any) => {
          const catalogo = item.erp_catalogo;
          const nomeItem = catalogo?.nome || item.descricao_item || '';
          const tipoItem = item.tipo_item === 'SERVICO' ? 'servico' : 'produto';
          const valorUnit = item.preco_unitario?.toFixed(2).replace('.', ',') || '0,00';
          const qtd = item.quantidade || 1;
          const desconto = item.desconto_item || 0;
          const subtotal = qtd * item.preco_unitario;
          const valorTotal = subtotal - desconto;

          const codigoCompleto = catalogo?.codigo ?? '';
          const codigoSemPrefix = codigoCompleto ? (codigoCompleto.includes('-') ? codigoCompleto.split('-').pop() : codigoCompleto.includes('_') ? codigoCompleto.split('_').pop() : codigoCompleto) : '';
          return {
            id: item.id,
            tipo: tipoItem,
            codigo: codigoSemPrefix ?? '',
            nome: nomeItem,
            quantidade: qtd,
            valorUnitario: valorUnit,
            descontoReal: desconto.toFixed(2).replace('.', ','),
            descontoPercent: subtotal > 0 ? ((desconto / subtotal) * 100).toFixed(2) : '0,00',
            valorTotal: valorTotal,
            id_item_catalogo: item.id_item_catalogo ?? null,
            custoAquisicao:
              catalogo?.custo_aquisicao === null || catalogo?.custo_aquisicao === undefined
                ? null
                : Number(catalogo.custo_aquisicao || 0),
          };
        });
        setItems(itensFormatados);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error('Erro ao carregar ordem de serviço:', err);
      alert('Erro ao carregar dados da ordem de serviço');
    } finally {
      setCarregando(false);
    }
  }, [osId, idEmpresa]);

  // Inicializar
  useEffect(() => {
    if (!idEmpresa) return;

    if (mode === 'create') {
      setStatusProposta('AGUARDANDO_ENVIO');
      setValorTotalFinalCarregado(null);
      gerarCodigo();
      carregarConfiguracoesPadrao();
    } else if (mode === 'copy') {
      const carregarDepoisGerarCodigo = async () => {
        if (propostaId) {
          await carregarProposta();
        } else if (vendaId && tipo === 'venda') {
          await carregarVenda();
        } else if (osId && tipo === 'os') {
          await carregarOS();
        }
        setStatusProposta(tipo === 'os' ? 'EM_ABERTO' : 'RASCUNHO');
        await gerarCodigo();
      };
      void carregarDepoisGerarCodigo();
    } else if (propostaId) {
      carregarProposta();
    } else if (vendaId && tipo === 'venda') {
      carregarVenda();
    } else if (osId && tipo === 'os') {
      carregarOS();
    }
  }, [idEmpresa, mode, propostaId, vendaId, osId, tipo, gerarCodigo, carregarConfiguracoesPadrao, carregarProposta, carregarVenda, carregarOS]);

  return {
    formData,
    setFormData,
    items,
    setItems,
    impostos,
    setImpostos,
    clienteSelecionado,
    setClienteSelecionado,
    statusProposta,
    setStatusProposta,
    descontoGeralReal,
    setDescontoGeralReal,
    descontoGeralPercent,
    setDescontoGeralPercent,
    acrescimo,
    setAcrescimo,
    frete,
    setFrete,
    valorTotalFinalCarregado,
    codigoVendaGerada,
    codigoOsGerada,
    codigoPropostaOrigem,
    codigoPrefixoAtual,
    idVendedor,
    setIdVendedor,
    idUsuarioResponsavel,
    setIdUsuarioResponsavel,
    idCondicaoPagamento,
    setIdCondicaoPagamento,
    condicoesPersonalizadasCarregadas,
    configuracaoBlocos,
    setConfiguracaoBlocos,
    carregando,
    refetch: carregarProposta,
  };
}
