import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import CardResumo from '../shared/CardResumo';
import AcoesDoDia from './AcoesDoDia';
import { calcularValoresCards } from '../../utils/calculosFinanceiros';
import type { ParcelaComDados, AcaoItem, FeedTab } from '../../types';

interface PainelTabProps {
  parcelas: ParcelaComDados[];
  acoesReais: AcaoItem[];
  buscarNotificacoesPendentes: () => Promise<void>;
}

export default function PainelTab({ parcelas, acoesReais, buscarNotificacoesPendentes }: PainelTabProps) {
  const [feedTabAtiva, setFeedTabAtiva] = useState<FeedTab>('fazer');

  // Calcular valores dos cards
  const valoresCards = useMemo(() => {
    return calcularValoresCards(parcelas);
  }, [parcelas]);

  // Filtrar ações baseado na tab ativa
  const getAcoesAtivas = () => {
    switch (feedTabAtiva) {
      case 'fazer':
        return acoesReais.filter((a) => a._isHoje === true);
      case 'pendencias':
        return acoesReais.filter((a) => a._isHoje === false);
      case 'feitos':
        return [];
      default:
        return acoesReais.filter((a) => a._isHoje === true);
    }
  };

  const handleWhatsApp = async (acao: AcaoItem) => {
    try {
      const mensagem = encodeURIComponent(acao.mensagem);
      const numero = acao.destino.replace(/\D/g, '');
      window.open(`https://wa.me/${numero}?text=${mensagem}`, '_blank');

      // Inserir no log
      const { error: logError } = await supabase
        .from('sis_notificacao_logs')
        .insert({
          id_parcela: acao.idParcela,
          id_regua: acao.idRegua,
          etapa_index: acao.etapaIndex,
          canal_envio: 'WHATSAPP',
          data_envio: new Date().toISOString(),
          destino: acao.destino,
        });

      if (logError) {
        console.error('Erro ao inserir no log:', logError);
        return;
      }

      // Remover da fila
      const { error: deleteError } = await supabase
        .from('sis_fila_notificacoes')
        .delete()
        .eq('id', acao.notificacaoFilaId);

      if (deleteError) {
        console.error('Erro ao remover da fila:', deleteError);
        return;
      }

      // Atualizar lista
      await buscarNotificacoesPendentes();
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      alert('Erro ao enviar mensagem. Tente novamente.');
    }
  };

  const handleMarcarPago = (id: string) => {
    console.log('Marcar como pago:', id);
    // Implementar lógica
  };

  const handleAcaoMenu = (id: string) => {
    console.log('Mais ações:', id);
    // Implementar lógica
  };

  return (
    <>
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CardResumo
          titulo="Atrasado"
          valor={valoresCards.atrasado}
          descricao="Até hoje"
          corIcone="bg-red-100 dark:bg-red-900/30"
          icone={
            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <CardResumo
          titulo="A receber"
          valor={valoresCards.aReceberHoje}
          descricao="Hoje"
          corIcone="bg-blue-100 dark:bg-blue-900/30"
          icone={
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <CardResumo
          titulo="Previsão 7D"
          valor={valoresCards.previsao7Dias}
          descricao="Próx. 07 Dias"
          corIcone="bg-amber-100 dark:bg-amber-900/30"
          icone={
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <CardResumo
          titulo="Previsão 30D"
          valor={valoresCards.previsao30Dias}
          descricao="Próx. 30 Dias"
          corIcone="bg-green-100 dark:bg-green-900/30"
          icone={
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      {/* Ações do Dia */}
      <AcoesDoDia
        acoes={getAcoesAtivas()}
        feedTabAtiva={feedTabAtiva}
        setFeedTabAtiva={setFeedTabAtiva}
        onWhatsApp={handleWhatsApp}
        onMarcarPago={handleMarcarPago}
        onAcaoMenu={handleAcaoMenu}
      />
    </>
  );
}





