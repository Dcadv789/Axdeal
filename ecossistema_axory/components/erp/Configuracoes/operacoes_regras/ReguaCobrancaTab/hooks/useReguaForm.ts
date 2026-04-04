import { useState, useCallback } from 'react';
import type { ReguaFormData, Notificacao, ModoEdicao } from '../types';

const formDataInicial: ReguaFormData = {
  nome: '',
  descricao: '',
  padrao: false
};

const notificacaoInicial: Notificacao = {
  numero: 1,
  offset: 0,
  unit: 'dias',
  direction: 'vencimento',
  channels: [],
  subject: '',
  message: ''
};

export function useReguaForm() {
  const [modoEdicao, setModoEdicao] = useState<ModoEdicao>('lista');
  const [formData, setFormData] = useState<ReguaFormData>(formDataInicial);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [reguaEditandoId, setReguaEditandoId] = useState<string | null>(null);

  const iniciarCriacao = useCallback(() => {
    setModoEdicao('criar');
    setFormData(formDataInicial);
    setNotificacoes([]);
    setReguaEditandoId(null);
  }, []);

  const iniciarEdicao = useCallback((regua: any) => {
    setModoEdicao('editar');
    setReguaEditandoId(regua.id);
    setFormData({
      nome: regua.nome || '',
      descricao: regua.descricao || '',
      padrao: regua.padrao || false
    });
    
    // Garantir que etapas seja sempre um array
    let etapas = regua.etapas || [];
    if (!Array.isArray(etapas)) {
      etapas = [etapas];
    }
    
    // Garantir que channels seja sempre um array
    const etapasFormatadas = etapas.map((etapa: any, index: number) => ({
      ...etapa,
      numero: index + 1,
      channels: Array.isArray(etapa.channels) ? etapa.channels : []
    }));

    setNotificacoes(etapasFormatadas);
  }, []);

  const cancelar = useCallback(() => {
    setModoEdicao('lista');
    setFormData(formDataInicial);
    setNotificacoes([]);
    setReguaEditandoId(null);
  }, []);

  const adicionarNotificacao = useCallback(() => {
    setNotificacoes((prev) => {
      const novoNumero = prev.length + 1;
      return [...prev, { ...notificacaoInicial, numero: novoNumero }];
    });
  }, []);

  const removerNotificacao = useCallback((index: number) => {
    setNotificacoes((prev) => {
      const filtradas = prev.filter((_, i) => i !== index);
      return filtradas.map((n, i) => ({ ...n, numero: i + 1 }));
    });
  }, []);

  const atualizarNotificacao = useCallback((index: number, campo: keyof Notificacao, valor: any) => {
    setNotificacoes(prev => prev.map((n, i) => 
      i === index ? { ...n, [campo]: valor } : n
    ));
  }, []);

  const toggleCanal = useCallback((index: number, canal: string) => {
    setNotificacoes(prev => prev.map((n, i) => {
      if (i === index) {
        const channels = Array.isArray(n.channels) ? n.channels : [];
        const novoChannels = channels.includes(canal)
          ? channels.filter(c => c !== canal)
          : [...channels, canal];
        return { ...n, channels: novoChannels };
      }
      return n;
    }));
  }, []);

  return {
    modoEdicao,
    formData,
    setFormData,
    notificacoes,
    reguaEditandoId,
    iniciarCriacao,
    iniciarEdicao,
    cancelar,
    adicionarNotificacao,
    removerNotificacao,
    atualizarNotificacao,
    toggleCanal
  };
}





