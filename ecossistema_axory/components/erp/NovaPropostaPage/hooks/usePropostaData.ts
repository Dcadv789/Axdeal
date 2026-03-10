import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { 
  PropostaFormData, 
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
  mode: PropostaMode;
  tipo: PropostaTipo;
}

export function usePropostaData({
  idEmpresa,
  propostaId,
  vendaId,
  mode,
  tipo
}: UsePropostaDataProps) {
  const [formData, setFormData] = useState<PropostaFormData>({
    numeroProposta: '',
    titulo: '',
    clienteBusca: '',
    dataProposta: new Date().toISOString().split('T')[0],
    dataValidade: '',
    prazoEntrega: '',
    prazoGarantia: '',
    observacoes: '',
    observacoesInternas: '',
  });

  const [items, setItems] = useState<PropostaItem[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [statusProposta, setStatusProposta] = useState('RASCUNHO');
  const [descontoGeralReal, setDescontoGeralReal] = useState('');
  const [descontoGeralPercent, setDescontoGeralPercent] = useState('');
  const [acrescimo, setAcrescimo] = useState('');
  const [frete, setFrete] = useState('');
  const [codigoVendaGerada, setCodigoVendaGerada] = useState<string | null>(null);
  const [codigoPropostaOrigem, setCodigoPropostaOrigem] = useState<string | null>(null);
  const [idVendedor, setIdVendedor] = useState<string | null>(null);
  const [idCondicaoPagamento, setIdCondicaoPagamento] = useState<string | null>(null);
  const [configuracaoBlocos, setConfiguracaoBlocos] = useState<{ [key: string]: boolean }>({});
  const [carregando, setCarregando] = useState(false);

  // Gerar código da proposta
  const gerarCodigo = useCallback(async () => {
    if (!idEmpresa || mode !== 'create') return;

    try {
      const { data: config, error } = await supabase
        .from('sis_configuracoes')
        .select('prefixo_proposta, proximo_numero_proposta, prefixo_venda, proximo_numero_venda')
        .eq('id_empresa', idEmpresa)
        .maybeSingle();

      if (error) throw error;

      if (config) {
        const prefixo = tipo === 'venda' ? config.prefixo_venda : config.prefixo_proposta;
        const numero = tipo === 'venda' ? config.proximo_numero_venda : config.proximo_numero_proposta;
        // Formato: PRP-0001 (prefixo + "-" + número com 4 dígitos)
        const codigo = `${prefixo}-${numero.toString().padStart(4, '0')}`;
        
        setFormData((prev) => ({ ...prev, numeroProposta: codigo }));
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
        .from('sis_configuracoes')
        .select('*')
        .eq('id_empresa', idEmpresa)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const hoje = new Date();

        // Data de validade
        if (data.validade_proposta_dias) {
          const dataValidade = new Date(hoje);
          dataValidade.setDate(dataValidade.getDate() + data.validade_proposta_dias);
          setFormData((prev) => ({
            ...prev,
            dataValidade: dataValidade.toISOString().split('T')[0],
          }));
        }

        // Prazo de entrega
        if (data.prazo_entrega_padrao_dias) {
          const tipoPrazo = data.prazo_entrega_padrao_tipo || 'dias';
          setFormData((prev) => ({
            ...prev,
            prazoEntrega: `${data.prazo_entrega_padrao_dias} ${tipoPrazo}`,
          }));
        }

        // Prazo de garantia
        if (data.prazo_garantia_padrao_dias) {
          const tipoPrazo = data.prazo_garantia_padrao_tipo || 'dias';
          setFormData((prev) => ({
            ...prev,
            prazoGarantia: `${data.prazo_garantia_padrao_dias} ${tipoPrazo}`,
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
  const carregarProposta = useCallback(async () => {
    if (!propostaId || !idEmpresa) return;

    try {
      setCarregando(true);

      // Buscar proposta
      const { data: propostaData, error: propostaError } = await supabase
        .from('erp_propostas')
        .select(`
          *,
          erp_clientes(id, nome_razao_social, nome_fantasia, tipo_pessoa, cnpj, cpf)
        `)
        .eq('id', propostaId)
        .eq('id_empresa', idEmpresa)
        .single();

      if (propostaError) throw propostaError;
      if (!propostaData) return;

      // Preencher formulário
      setFormData({
        numeroProposta: propostaData.codigo || '',
        titulo: propostaData.introducao || '',
        clienteBusca: propostaData.erp_clientes?.nome_fantasia || propostaData.erp_clientes?.nome_razao_social || '',
        dataProposta: propostaData.data_emissao || new Date().toISOString().split('T')[0],
        dataValidade: propostaData.data_validade || '',
        prazoEntrega: '',
        prazoGarantia: '',
        observacoes: propostaData.observacoes_cliente || '',
        observacoesInternas: propostaData.observacoes_internas || '',
      });

      setStatusProposta(propostaData.status || 'RASCUNHO');
      setAcrescimo(propostaData.valor_acrescimo?.toFixed(2).replace('.', ',') || '');
      setFrete(propostaData.valor_frete_outros?.toFixed(2).replace('.', ',') || '');
      setDescontoGeralReal(propostaData.valor_desconto_global?.toFixed(2).replace('.', ',') || '');
      setIdVendedor(propostaData.id_vendedor || null);
      setIdCondicaoPagamento(propostaData.id_condicao_pagamento || null);
      
      // Carregar configuração de blocos
      if (propostaData.configuracao_blocos && typeof propostaData.configuracao_blocos === 'object') {
        setConfiguracaoBlocos(propostaData.configuracao_blocos as { [key: string]: boolean });
      } else {
        setConfiguracaoBlocos({});
      }

      if (propostaData.erp_clientes) {
        setClienteSelecionado(propostaData.erp_clientes as Cliente);
      }

      // Buscar itens
      const { data: itensData, error: itensError } = await supabase
        .from('erp_itens_movimentacao')
        .select('*')
        .eq('id_proposta', propostaId)
        .order('criado_em', { ascending: true });

      if (itensError) throw itensError;

      if (itensData && itensData.length > 0) {
        const itensFormatados: PropostaItem[] = itensData.map((item: any) => {
          const valorUnit = item.preco_unitario?.toFixed(2).replace('.', ',') || '0,00';
          const qtd = item.quantidade || 1;
          const desconto = item.desconto_item || 0;
          const subtotal = qtd * item.preco_unitario;
          const valorTotal = subtotal - desconto;

          return {
            id: item.id,
            tipo: item.tipo_item === 'SERVICO' ? 'servico' : 'produto',
            codigo: '',
            nome: item.descricao_item || '',
            quantidade: qtd,
            valorUnitario: valorUnit,
            descontoReal: desconto.toFixed(2).replace('.', ','),
            descontoPercent: subtotal > 0 ? ((desconto / subtotal) * 100).toFixed(2) : '0,00',
            valorTotal: valorTotal,
          };
        });

        setItems(itensFormatados);
      }

      // Buscar venda relacionada
      const { data: vendaData } = await supabase
        .from('erp_vendas')
        .select('codigo')
        .eq('id_proposta_origem', propostaId)
        .maybeSingle();

      if (vendaData) {
        setCodigoVendaGerada(vendaData.codigo);
      }
    } catch (error) {
      console.error('Erro ao carregar proposta:', error);
      alert('Erro ao carregar dados da proposta');
    } finally {
      setCarregando(false);
    }
  }, [propostaId, idEmpresa]);

  // Inicializar
  useEffect(() => {
    if (!idEmpresa) return;

    if (mode === 'create') {
      gerarCodigo();
      carregarConfiguracoesPadrao();
    } else if (propostaId) {
      carregarProposta();
    }
  }, [idEmpresa, mode, propostaId, gerarCodigo, carregarConfiguracoesPadrao, carregarProposta]);

  return {
    formData,
    setFormData,
    items,
    setItems,
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
    codigoVendaGerada,
    codigoPropostaOrigem,
    idVendedor,
    setIdVendedor,
    idCondicaoPagamento,
    setIdCondicaoPagamento,
    configuracaoBlocos,
    setConfiguracaoBlocos,
    carregando,
    refetch: carregarProposta,
  };
}

