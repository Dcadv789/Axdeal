import { useState, useCallback } from 'react';
import { buscarDadosCNPJ, mapearDadosReceitaWS } from '../utils/apiHelpers';
import type { ClienteFormData } from '../types';

export function useReceitaWS() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const buscarCNPJ = useCallback(async (
    cnpj: string,
    setFormData: React.Dispatch<React.SetStateAction<ClienteFormData>>
  ): Promise<boolean> => {
    try {
      setCarregando(true);
      setErro(null);

      const dados = await buscarDadosCNPJ(cnpj);
      
      if (!dados) {
        throw new Error('Nenhum dado retornado');
      }

      const dadosMapeados = mapearDadosReceitaWS(dados);
      
      setFormData((prev) => ({
        ...prev,
        ...dadosMapeados,
      }));

      return true;
    } catch (error: any) {
      const mensagemErro = error.message || 'Erro ao buscar dados do CNPJ';
      setErro(mensagemErro);
      console.error('Erro ReceitaWS:', error);
      return false;
    } finally {
      setCarregando(false);
    }
  }, []);

  const limparErro = useCallback(() => {
    setErro(null);
  }, []);

  return {
    buscarCNPJ,
    carregando,
    erro,
    limparErro,
  };
}





