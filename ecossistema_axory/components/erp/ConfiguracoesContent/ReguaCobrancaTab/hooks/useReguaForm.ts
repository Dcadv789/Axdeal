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
    const etapasFormatadas = etapas.map((etapa: any) => ({
      ...etapa,
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
    const novoNumero = notificacoes.length > 0 
      ? Math.max(...notificacoes.map(n => n.numero)) + 1 
      : 1;
    
    setNotificacoes(prev => [...prev, { ...notificacaoInicial, numero: novoNumero }]);
  }, [notificacoes]);

  const removerNotificacao = useCallback((numero: number) => {
    setNotificacoes(prev => prev.filter(n => n.numero !== numero));
  }, []);

  const atualizarNotificacao = useCallback((numero: number, campo: keyof Notificacao, valor: any) => {
    setNotificacoes(prev => prev.map(n => 
      n.numero === numero ? { ...n, [campo]: valor } : n
    ));
  }, []);

  const toggleCanal = useCallback((numero: number, canal: string) => {
    setNotificacoes(prev => prev.map(n => {
      if (n.numero === numero) {
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





