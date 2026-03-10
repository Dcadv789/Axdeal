import { useState, useCallback } from 'react';
import type { Parcela, CondicaoPagamento } from '../types';
import { gerarParcelas, recalcularParcelas } from '../utils/calculations';

export function useParcelas() {
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [quantidadeParcelas, setQuantidadeParcelas] = useState('0');
  const [isCobrancaRecorrente, setIsCobrancaRecorrente] = useState(false);

  // Gerar parcelas baseado na condição de pagamento
  const gerarParcelasDeCondicao = useCallback((
    condicao: CondicaoPagamento,
    valorTotal: number,
    dataBase: string
  ) => {
    const novasParcelas = gerarParcelas(valorTotal, condicao.regras, dataBase);
    setParcelas(novasParcelas);
    setQuantidadeParcelas(novasParcelas.length.toString());
  }, []);

  // Adicionar parcela manualmente
  const adicionarParcela = useCallback(() => {
    const novaParcela: Parcela = {
      id: `parcela-${Date.now()}`,
      numero: parcelas.length + 1,
      valor: '0,00',
      vencimento: new Date().toISOString().split('T')[0],
      formaPagamento: '',
      observacoes: ''
    };
    setParcelas([...parcelas, novaParcela]);
    setQuantidadeParcelas((parcelas.length + 1).toString());
  }, [parcelas]);

  // Remover parcela
  const removerParcela = useCallback((id: string) => {
    const novasParcelas = parcelas
      .filter((p) => p.id !== id)
      .map((p, index) => ({ ...p, numero: index + 1 }));
    setParcelas(novasParcelas);
    setQuantidadeParcelas(novasParcelas.length.toString());
  }, [parcelas]);

  // Atualizar parcela
  const atualizarParcela = useCallback((
    id: string,
    campo: keyof Parcela,
    valor: string | number
  ) => {
    setParcelas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p))
    );
  }, []);

  // Recalcular valores das parcelas quando o total muda
  const recalcularValores = useCallback((novoValorTotal: number) => {
    if (parcelas.length === 0) return;
    const parcelasRecalculadas = recalcularParcelas(parcelas, novoValorTotal);
    setParcelas(parcelasRecalculadas);
  }, [parcelas]);

  // Limpar parcelas
  const limparParcelas = useCallback(() => {
    setParcelas([]);
    setQuantidadeParcelas('0');
  }, []);

  // Definir parcelas (para carregar de uma proposta existente)
  const definirParcelas = useCallback((novasParcelas: Parcela[]) => {
    setParcelas(novasParcelas);
    setQuantidadeParcelas(novasParcelas.length.toString());
  }, []);

  return {
    parcelas,
    quantidadeParcelas,
    isCobrancaRecorrente,
    setQuantidadeParcelas,
    setIsCobrancaRecorrente,
    gerarParcelasDeCondicao,
    adicionarParcela,
    removerParcela,
    atualizarParcela,
    recalcularValores,
    limparParcelas,
    definirParcelas,
  };
}





