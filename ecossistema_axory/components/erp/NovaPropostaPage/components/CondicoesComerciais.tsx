import { RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { CondicaoPagamento, Parcela } from '../types';
import { useCalculoParcelas } from '../hooks/useCalculoParcelas';
import DatePickerPT from './DatePickerPT';

interface CondicoesComerciaisProps {
  cobrancaRecorrente: boolean;
  setCobrancaRecorrente: (valor: boolean) => void;
  condicoes: CondicaoPagamento[];
  condicaoSelecionada: CondicaoPagamento | null;
  selecionarCondicao: (id: string) => void;
  parcelas: Parcela[];
  setParcelas: (parcelas: Parcela[]) => void;
  quantidadeParcelas: string;
  setQuantidadeParcelas: (valor: string) => void;
  valorTotal: number;
  dataProposta: string;
  isViewMode: boolean;
  atualizarParcela: (id: string, campo: keyof Parcela, valor: string | number) => void;
  removerParcela: (id: string) => void;
  recalcularValores: (novoValorTotal: number) => void;
}

export default function CondicoesComerciais({
  cobrancaRecorrente,
  setCobrancaRecorrente,
  condicoes,
  condicaoSelecionada,
  selecionarCondicao,
  parcelas,
  setParcelas,
  quantidadeParcelas,
  setQuantidadeParcelas,
  valorTotal,
  dataProposta,
  isViewMode,
  atualizarParcela: atualizarParcelaProp,
  removerParcela,
  recalcularValores
}: CondicoesComerciaisProps) {
  const [formasPagamento] = useState(['PIX', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Dinheiro']);
  const { calcularParcelasDeCondicao, validarCondicao } = useCalculoParcelas();

  // Debug: Log quando condições ou condição selecionada mudarem
  useEffect(() => {
    console.log('Condições disponíveis no componente:', {
      total: condicoes?.length || 0,
      condicoes: condicoes?.map(c => ({ id: c.id, nome: c.nome, regras: c.regras?.length || 0 })) || []
    });
    console.log('Condição selecionada:', condicaoSelecionada);
  }, [condicoes, condicaoSelecionada]);

  // Gerar parcelas quando o botão "Atualizar" for clicado
  const handleAtualizarParcelas = () => {
    console.log('Atualizando parcelas...', {
      condicaoSelecionada: condicaoSelecionada,
      valorTotal,
      dataProposta,
      temRegras: condicaoSelecionada?.regras?.length || 0
    });

    if (!dataProposta || valorTotal <= 0) {
      console.warn('Dados insuficientes para gerar parcelas');
      setParcelas([]);
      return;
    }

    // Verificar se condição está selecionada e tem regras válidas
    if (condicaoSelecionada && condicaoSelecionada.regras && condicaoSelecionada.regras.length > 0) {
      console.log('Usando regras da condição de pagamento:', {
        nome: condicaoSelecionada.nome,
        regras: condicaoSelecionada.regras,
        somaPercentuais: condicaoSelecionada.regras.reduce((acc, r) => acc + (r.percentual || 0), 0)
      });
      
      // Sempre tentar calcular usando as regras, mesmo se a validação falhar
      // A função gerarParcelas já faz ajuste automático na última parcela
      try {
        const parcelasGeradas = calcularParcelasDeCondicao(condicaoSelecionada, valorTotal, dataProposta);
        console.log('Parcelas geradas:', parcelasGeradas);
        
        if (parcelasGeradas && parcelasGeradas.length > 0) {
          setParcelas(parcelasGeradas);
          setQuantidadeParcelas(parcelasGeradas.length.toString());
          return;
        } else {
          console.warn('Nenhuma parcela foi gerada');
        }
      } catch (error) {
        console.error('Erro ao calcular parcelas:', error);
      }
    }

    // Fallback: usar quantidade manual se não houver condição válida
    console.log('Usando quantidade manual (sem condição ou condição inválida)');
    const qtd = parseInt(quantidadeParcelas) || 0;
    if (qtd <= 0) {
      console.warn('Quantidade de parcelas inválida');
      setParcelas([]);
      return;
    }

    const valorParcela = valorTotal / qtd;
    const novasParcelas: Parcela[] = [];
    const dataBase = new Date(dataProposta + 'T00:00:00');

    for (let i = 0; i < qtd; i++) {
      const dataVencimento = new Date(dataBase);
      dataVencimento.setMonth(dataVencimento.getMonth() + i);

      novasParcelas.push({
        id: `parcela-${Date.now()}-${i}`,
        numero: i + 1,
        valor: valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        vencimento: dataVencimento.toISOString().split('T')[0],
        formaPagamento: '',
        observacoes: ''
      });
    }

    setParcelas(novasParcelas);
  };

  // Função para recalcular parcelas quando um valor é alterado manualmente
  // Apenas recalcula as parcelas SEGUINTES à parcela alterada
  const recalcularParcelasAposAlteracao = (parcelaId: string, novoValor: string) => {
    const valorNumerico = parseFloat(novoValor.replace(',', '.')) || 0;
    
    // Encontrar a parcela que foi alterada
    const parcelaIndex = parcelas.findIndex(p => p.id === parcelaId);
    if (parcelaIndex === -1) return;

    // Se é a última parcela, apenas atualizar (não há parcelas seguintes)
    if (parcelaIndex === parcelas.length - 1) {
      atualizarParcelaProp(parcelaId, 'valor', novoValor);
      return;
    }

    // Calcular o valor total já definido nas parcelas anteriores e na atual
    let valorTotalDefinido = 0;
    for (let i = 0; i <= parcelaIndex; i++) {
      if (i === parcelaIndex) {
        // Parcela que está sendo alterada
        valorTotalDefinido += valorNumerico;
      } else {
        // Parcelas anteriores (mantêm seus valores)
        const valorParcela = parseFloat(parcelas[i].valor.replace(',', '.')) || 0;
        valorTotalDefinido += valorParcela;
      }
    }

    // Calcular o valor restante a distribuir entre as parcelas seguintes
    const valorRestante = valorTotal - valorTotalDefinido;

    // Se o valor restante é negativo ou muito pequeno, apenas atualizar a parcela alterada
    if (valorRestante <= 0) {
      atualizarParcelaProp(parcelaId, 'valor', novoValor);
      return;
    }

    // Contar quantas parcelas seguintes precisam ser recalculadas
    const parcelasSeguintes = parcelas.length - (parcelaIndex + 1);
    
    if (parcelasSeguintes === 0) {
      atualizarParcelaProp(parcelaId, 'valor', novoValor);
      return;
    }

    // Dividir o valor restante igualmente entre as parcelas seguintes
    const valorBasePorParcela = Math.floor((valorRestante / parcelasSeguintes) * 100) / 100;
    let somaCalculada = 0;

    // Atualizar todas as parcelas
    const parcelasAtualizadas = parcelas.map((p, index) => {
      if (index === parcelaIndex) {
        // Parcela que foi alterada manualmente - manter o valor digitado
        return { ...p, valor: novoValor };
      } else if (index < parcelaIndex) {
        // Parcelas anteriores - manter valores originais (não alterar)
        return p;
      } else {
        // Parcelas seguintes - recalcular
        const isUltimaParcela = index === parcelas.length - 1;
        
        let valorParcela: number;
        if (isUltimaParcela) {
          // Última parcela: usar o que falta para completar o valor total exato
          valorParcela = Math.round((valorRestante - somaCalculada) * 100) / 100;
        } else {
          // Parcelas anteriores (seguintes): usar o valor base arredondado
          valorParcela = valorBasePorParcela;
          somaCalculada += valorParcela;
        }

        const valorFormatado = valorParcela.toLocaleString('pt-BR', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        });

        return { ...p, valor: valorFormatado };
      }
    });

    setParcelas(parcelasAtualizadas);
  };

  // Atualizar parcela usando a função do hook
  const atualizarParcela = (id: string, campo: keyof Parcela, valor: string | number) => {
    // Se o campo sendo atualizado é 'valor', usar a função de recálculo automático
    if (campo === 'valor' && typeof valor === 'string') {
      recalcularParcelasAposAlteracao(id, valor);
    } else {
      atualizarParcelaProp(id, campo, valor);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-[#E5E7EB] dark:border-[#262626] p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Condições Comerciais
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Defina as condições comerciais da proposta
        </p>
      </div>

      <div className="space-y-6">
        {/* Linha com Cobrança Recorrente, Condições de Pagamento e Quantidade de Parcelas */}
        <div className="grid grid-cols-3 gap-4">
          {/* Cobrança Recorrente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cobrança Recorrente
            </label>
            <label className="flex items-center gap-2 cursor-pointer h-[42px]">
              <input
                type="checkbox"
                checked={cobrancaRecorrente}
                onChange={(e) => setCobrancaRecorrente(e.target.checked)}
                disabled={isViewMode}
                className="w-4 h-4 text-blue-600 bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed checked:bg-blue-600 checked:border-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Contrato / Mensalidade</span>
            </label>
          </div>

          {/* Condições de Pagamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Condições de Pagamento
            </label>
            <select
              value={condicaoSelecionada?.id || ''}
              onChange={(e) => {
                if (e.target.value) {
                  selecionarCondicao(e.target.value);
                } else {
                  selecionarCondicao('');
                  setParcelas([]);
                  setQuantidadeParcelas('0');
                }
              }}
              disabled={isViewMode}
              className="w-full px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
            >
              <option value="">Selecione uma condição</option>
              {condicoes && condicoes.length > 0 ? (
                condicoes.map((condicao) => (
                  <option key={condicao.id} value={condicao.id}>
                    {condicao.nome || 'Sem nome'}
                  </option>
                ))
              ) : (
                <option value="" disabled>Nenhuma condição disponível</option>
              )}
            </select>
          </div>

          {/* Quantidade de Parcelas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quantidade de Parcelas
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                min="1"
                value={quantidadeParcelas}
                onChange={(e) => setQuantidadeParcelas(e.target.value)}
                disabled={isViewMode}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={handleAtualizarParcelas}
                disabled={isViewMode || !dataProposta || valorTotal <= 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={16} />
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Parcelas */}
        {parcelas.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Parcelas
            </h3>
            {parcelas.map((parcela) => (
              <div key={parcela.id} className="p-4 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-gray-50 dark:bg-neutral-800">
                <div className="flex gap-4 items-end">
                  {/* Parcela - reduzido */}
                  <div className="w-20 flex-shrink-0">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Parcela
                    </label>
                    <input
                      type="text"
                      value={parcela.numero}
                      disabled
                      className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 cursor-not-allowed text-center text-sm"
                    />
                  </div>

                  {/* Vencimento - reduzido */}
                  <div className="w-40 flex-shrink-0">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Vencimento
                    </label>
                    <DatePickerPT
                      value={parcela.vencimento}
                      onChange={(value) => atualizarParcela(parcela.id, 'vencimento', value)}
                      disabled={isViewMode}
                    />
                  </div>

                  {/* Valor - reduzido */}
                  <div className="w-36 flex-shrink-0">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Valor
                    </label>
                    <input
                      type="text"
                      value={parcela.valor ? `R$ ${parcela.valor}` : 'R$ 0,00'}
                      onChange={(e) => {
                        const valor = e.target.value.replace(/\D/g, '');
                        const valorNum = parseInt(valor) / 100;
                        const formatado = valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        // Chamar atualizarParcela que vai recalcular automaticamente as outras parcelas
                        atualizarParcela(parcela.id, 'valor', formatado);
                      }}
                      onBlur={(e) => {
                        // Garantir que o valor está formatado corretamente ao sair do campo
                        const valor = e.target.value.replace(/\D/g, '');
                        const valorNum = parseInt(valor) / 100;
                        const formatado = valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        if (formatado !== parcela.valor) {
                          atualizarParcela(parcela.id, 'valor', formatado);
                        }
                      }}
                      disabled={isViewMode}
                      placeholder="R$ 0,00"
                      className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-sm"
                    />
                  </div>

                  {/* Forma de Pagamento - reduzido */}
                  <div className="w-48 flex-shrink-0">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Forma de Pagamento
                    </label>
                    <select
                      value={parcela.formaPagamento}
                      onChange={(e) => atualizarParcela(parcela.id, 'formaPagamento', e.target.value)}
                      disabled={isViewMode}
                      className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-sm"
                    >
                      <option value="">Selecione</option>
                      {formasPagamento.map((forma) => (
                        <option key={forma} value={forma}>
                          {forma}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Observações - ocupa espaço restante */}
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Observações
                    </label>
                    <input
                      type="text"
                      value={parcela.observacoes}
                      onChange={(e) => atualizarParcela(parcela.id, 'observacoes', e.target.value)}
                      disabled={isViewMode}
                      placeholder="Observações adicionais..."
                      className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

