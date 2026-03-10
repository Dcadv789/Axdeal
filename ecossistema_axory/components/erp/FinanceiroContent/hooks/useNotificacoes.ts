import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import type { AcaoItem } from '../types';

export function useNotificacoes(idEmpresa: string | null, shouldFetch: boolean = true) {
  const [acoesReais, setAcoesReais] = useState<AcaoItem[]>([]);
  const [carregando, setCarregando] = useState(false);

  const buscarNotificacoesPendentes = async () => {
    if (!idEmpresa) return;

    try {
      setCarregando(true);

      // Buscar todas as notificações pendentes
      const { data: notificacoes, error: notifError } = await supabase
        .from('sis_fila_notificacoes')
        .select('*')
        .eq('status', 'PENDENTE')
        .order('criado_em', { ascending: true });

      if (notifError) {
        logger.error('Erro ao buscar notificações', notifError, { component: 'useNotificacoes' });
        return;
      }

      if (!notificacoes || notificacoes.length === 0) {
        setAcoesReais([]);
        return;
      }

      // Filtrar apenas notificações de WhatsApp
      const notificacoesWhatsApp = notificacoes.filter(n => 
        n.canal && n.canal.toUpperCase() === 'WHATSAPP'
      );

      if (notificacoesWhatsApp.length === 0) {
        setAcoesReais([]);
        return;
      }

      // Buscar parcelas relacionadas
      const idsParc = notificacoesWhatsApp.map(n => n.id_parcela).filter(Boolean);
      const { data: parcelas, error: parcelasError } = await supabase
        .from('erp_parcelas')
        .select('id, numero_parcela, valor_original, data_vencimento, id_fatura')
        .in('id', idsParc);

      if (parcelasError) {
        logger.error('Erro ao buscar parcelas', parcelasError, { component: 'useNotificacoes' });
        return;
      }

      const parcelasMap = new Map(parcelas?.map(p => [p.id, p]) || []);

      // Buscar id_regua e etapa_index do log mais recente de cada parcela
      const { data: logs, error: logsError } = await supabase
        .from('sis_notificacao_logs')
        .select('id_parcela, id_regua, etapa_index')
        .in('id_parcela', idsParc)
        .order('data_envio', { ascending: false });

      if (logsError) {
        logger.error('Erro ao buscar logs', logsError, { component: 'useNotificacoes' });
      }

      const logsMap = new Map<string, { id_regua: string; etapa_index: number }>();
      logs?.forEach(log => {
        if (!logsMap.has(log.id_parcela)) {
          logsMap.set(log.id_parcela, {
            id_regua: log.id_regua,
            etapa_index: log.etapa_index,
          });
        }
      });

      // Montar as ações
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const acoes: AcaoItem[] = notificacoesWhatsApp.map(notif => {
        const parcela = parcelasMap.get(notif.id_parcela);
        const logInfo = logsMap.get(notif.id_parcela);

        const criadoEm = notif.criado_em ? new Date(notif.criado_em) : new Date();
        criadoEm.setHours(0, 0, 0, 0);
        const isHoje = criadoEm.getTime() === hoje.getTime();

        return {
          id: notif.id,
          tipo: 'cobranca' as const,
          cliente: notif.cliente_nome || 'Cliente',
          valor: parcela?.valor_original || 0,
          vencimento: parcela?.data_vencimento || '',
          parcela: parcela ? `Parcela ${parcela.numero_parcela}` : 'Parcela',
          mensagem: notif.mensagem_whatsapp || notif.mensagem_corpo || '',
          destino: notif.destino || '',
          _isHoje: isHoje,
          notificacaoFilaId: notif.id,
          idParcela: notif.id_parcela,
          idRegua: logInfo?.id_regua,
          etapaIndex: logInfo?.etapa_index,
        };
      });

      setAcoesReais(acoes);
    } catch (error) {
      logger.error('Erro ao buscar notificações pendentes', error, { component: 'useNotificacoes' });
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (shouldFetch && idEmpresa) {
      buscarNotificacoesPendentes();
    }
  }, [idEmpresa, shouldFetch]);

  return {
    acoesReais,
    carregando,
    buscarNotificacoesPendentes,
  };
}

