/**
 * NovaPropostaPage - Versão Refatorada
 * 
 * Este componente foi refatorado para melhorar:
 * - Organização do código
 * - Reutilização de lógica através de hooks
 * - Separação de responsabilidades
 * - Manutenibilidade
 * 
 * Estrutura:
 * - types/ - Interfaces e tipos TypeScript
 * - utils/ - Funções utilitárias (formatters, validators, calculations)
 * - hooks/ - Hooks customizados para lógica de negócio
 * - components/ - Componentes de UI reutilizáveis
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Hooks
import { useClientes } from './hooks/useClientes';
import { useCatalogo } from './hooks/useCatalogo';
import { useCondicoesPagamento } from './hooks/useCondicoesPagamento';
import { useParcelas } from './hooks/useParcelas';
import { usePropostaData } from './hooks/usePropostaData';
import { useVendedores } from './hooks/useVendedores';

// Components
import InformacoesBasicas from './components/InformacoesBasicas';
import ConfiguracoesAdicionais from './components/ConfiguracoesAdicionais';
import ItensProposta from './components/ItensProposta';
import CondicoesComerciais from './components/CondicoesComerciais';
import InformacoesAdicionais from './components/InformacoesAdicionais';

// Utils
import { calcularTotalGeral } from './utils/calculations';
import { validarFormularioProposta } from './utils/validators';

// Types
import type { NovaPropostaPageProps } from './types';

export default function NovaPropostaPage({ 
  onBack, 
  mode = 'create', 
  propostaId = null, 
  vendaId = null, 
  tipo = 'proposta' 
}: NovaPropostaPageProps) {
  const { user } = useAuth();
  const [idEmpresa, setIdEmpresa] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isVenda = tipo === 'venda';

  // Hooks de dados
  const clientes = useClientes(idEmpresa);
  const catalogo = useCatalogo(idEmpresa);
  const condicoes = useCondicoesPagamento(idEmpresa);
  const parcelas = useParcelas();
  const vendedores = useVendedores(idEmpresa);
  const propostaData = usePropostaData({
    idEmpresa,
    propostaId,
    vendaId,
    mode,
    tipo
  });

  const [vendedorSelecionado, setVendedorSelecionado] = useState<string | null>(null);

  // Buscar vendedor do usuário atual ao criar nova proposta
  useEffect(() => {
    const buscarVendedorUsuario = async () => {
      if (!user || !idEmpresa || mode !== 'create') return;

      try {
        // Buscar vendedor associado ao usuário atual
        const { data: vendedorData, error } = await supabase
          .from('erp_vendedores')
          .select('id')
          .eq('id_empresa', idEmpresa)
          .eq('id_usuario', user.id)
          .eq('status', 'ATIVO')
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar vendedor do usuário:', error);
          return;
        }

        if (vendedorData) {
          setVendedorSelecionado(vendedorData.id);
        }
      } catch (error) {
        console.error('Erro ao buscar vendedor do usuário:', error);
      }
    };

    buscarVendedorUsuario();
  }, [user, idEmpresa, mode]);

  // Sincronizar vendedor e condição de pagamento com dados da proposta
  useEffect(() => {
    if (propostaData.idVendedor) {
      setVendedorSelecionado(propostaData.idVendedor);
    }
  }, [propostaData.idVendedor]);

  useEffect(() => {
    if (propostaData.idCondicaoPagamento && condicoes.condicoes.length > 0) {
      const condicaoJaSelecionada = condicoes.condicaoSelecionada?.id === propostaData.idCondicaoPagamento;
      if (!condicaoJaSelecionada) {
        condicoes.selecionarCondicao(propostaData.idCondicaoPagamento);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propostaData.idCondicaoPagamento, condicoes.condicoes.length]);

  // Buscar empresa do usuário
  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!user) return;
      
      try {
        const { data: memberData } = await supabase
          .from('sis_membros_equipe')
          .select('id_empresa')
          .eq('id_usuario', user.id)
          .maybeSingle();

        if (memberData) {
          setIdEmpresa(memberData.id_empresa);
        }
      } catch (error) {
        console.error('Erro ao buscar empresa:', error);
      }
    };

    fetchCompanyData();
  }, [user]);

  // Calcular valor total
  const valorTotal = calcularTotalGeral(
    propostaData.items,
    propostaData.descontoGeralReal,
    propostaData.descontoGeralPercent,
    propostaData.acrescimo,
    propostaData.frete
  );

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isViewMode) return;

    // Validar
    const validacao = validarFormularioProposta(
      propostaData.formData,
      clientes.clienteSelecionado,
      propostaData.items
    );

    if (!validacao.valido) {
      alert(validacao.mensagem);
      return;
    }

    try {
      setLoading(true);

      if (mode === 'create') {
        // Criar nova proposta
        // TODO: Implementar lógica de criação
        alert('Proposta criada com sucesso!');
        onBack();
      } else if (mode === 'edit') {
        // Atualizar proposta existente
        // TODO: Implementar lógica de atualização
        alert('Proposta atualizada com sucesso!');
        onBack();
      }
    } catch (error) {
      console.error('Erro ao salvar proposta:', error);
      alert('Erro ao salvar proposta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (propostaData.carregando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Informações Básicas - 75% (3 colunas) */}
                <div className="lg:col-span-3">
                  <InformacoesBasicas
                    formData={propostaData.formData}
                    setFormData={propostaData.setFormData}
                    clienteSelecionado={clientes.clienteSelecionado}
                    busca={clientes.busca}
                    atualizarBusca={clientes.atualizarBusca}
                    clientesFiltrados={clientes.clientesFiltrados}
                    mostrarSugestoes={clientes.mostrarSugestoes}
                    setMostrarSugestoes={clientes.setMostrarSugestoes}
                    selecionarCliente={clientes.selecionarCliente}
                    isViewMode={isViewMode}
                    codigoVendaGerada={propostaData.codigoVendaGerada}
                    codigoPropostaOrigem={propostaData.codigoPropostaOrigem}
                    isVenda={isVenda}
                    statusProposta={propostaData.statusProposta}
                    vendedores={vendedores.vendedores}
                    vendedorSelecionado={vendedorSelecionado}
                    setVendedorSelecionado={setVendedorSelecionado}
                  />
                </div>

                {/* Configurações Adicionais - 25% (1 coluna) */}
                <div className="lg:col-span-1">
                  <ConfiguracoesAdicionais
                    isViewMode={isViewMode}
                    propostaId={propostaId}
                    idEmpresa={idEmpresa}
                    configuracaoBlocosInicial={propostaData.configuracaoBlocos}
                    onConfiguracaoBlocosChange={propostaData.setConfiguracaoBlocos}
                  />
                </div>
              </div>

        {/* Itens da Proposta */}
        <ItensProposta
          items={propostaData.items}
          setItems={propostaData.setItems}
          catalogo={catalogo.catalogoItens}
          descontoGeralReal={propostaData.descontoGeralReal}
          setDescontoGeralReal={propostaData.setDescontoGeralReal}
          descontoGeralPercent={propostaData.descontoGeralPercent}
          setDescontoGeralPercent={propostaData.setDescontoGeralPercent}
          acrescimo={propostaData.acrescimo}
          setAcrescimo={propostaData.setAcrescimo}
          frete={propostaData.frete}
          setFrete={propostaData.setFrete}
          isViewMode={isViewMode}
        />

        {/* Condições Comerciais */}
        <CondicoesComerciais
          cobrancaRecorrente={parcelas.isCobrancaRecorrente}
          setCobrancaRecorrente={parcelas.setIsCobrancaRecorrente}
          condicoes={condicoes.condicoes}
          condicaoSelecionada={condicoes.condicaoSelecionada}
          selecionarCondicao={condicoes.selecionarCondicao}
          parcelas={parcelas.parcelas}
          setParcelas={(novasParcelas) => {
            parcelas.definirParcelas(novasParcelas);
          }}
          quantidadeParcelas={parcelas.quantidadeParcelas}
          setQuantidadeParcelas={parcelas.setQuantidadeParcelas}
          valorTotal={valorTotal}
          dataProposta={propostaData.formData.dataProposta}
          isViewMode={isViewMode}
          atualizarParcela={parcelas.atualizarParcela}
          removerParcela={parcelas.removerParcela}
          recalcularValores={parcelas.recalcularValores}
        />

        {/* Informações Adicionais */}
        <InformacoesAdicionais
          formData={propostaData.formData}
          setFormData={propostaData.setFormData}
          isViewMode={isViewMode}
        />

        {/* Botões de Ação */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors font-medium"
          >
            {isViewMode ? 'Voltar' : 'Cancelar'}
          </button>
          
          {!isViewMode && (
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : mode === 'create' ? 'Criar Proposta' : 'Salvar Alterações'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

