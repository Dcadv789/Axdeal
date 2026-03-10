'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import FooterCopyright from '@/components/ui/FooterCopyright';
import { QuizTextWithBold } from './QuizTextWithBold';
import { getQuizLogoClasse } from './quizLogoUtils';
import {
  interpolarVariaveis,
  ordenarOpcoesPorRotulo,
  isValidEmail,
  isValidWhatsApp,
  formatarWhatsApp,
} from './quizVariables';
import QuizScoreGauge, { getScoreNivel } from './QuizScoreGauge';
import { supabase } from '@/lib/supabase';
import type { Quiz, Questao, Opcao, RespostaLog, QuizResultado } from '@/types/database';

interface QuizContentProps {
  slug: string;
}

const SCORE_MAXIMO = 1000;
const DEBUG_SCORE = true;

function normalizarValorScore(valor: unknown): number {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  if (typeof valor === 'string') {
    const normalizado = valor.replace(',', '.').trim();
    if (!normalizado) return 0;
    const parsed = Number(normalizado);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function calcularScoreTotal(respostas: RespostaLog[]): number {
  const vistos = new Set<string>();
  const total = respostas.reduce((acc, r) => {
    const chave = `${r.id_questao}:${r.id_opcao}`;
    if (vistos.has(chave)) return acc;
    vistos.add(chave);
    return acc + normalizarValorScore(r.valor_score);
  }, 0);

  return Math.max(0, Math.min(SCORE_MAXIMO, Math.round(total)));
}

function logCalculoScore(evento: string, respostas: RespostaLog[], detalhe?: Record<string, unknown>) {
  if (!DEBUG_SCORE) return;
  const linhas = respostas.map((r) => ({
    questao: r.id_questao,
    opcao: r.id_opcao,
    valor: normalizarValorScore(r.valor_score),
  }));
  const somaBruta = linhas.reduce((acc, item) => acc + item.valor, 0);
  const scoreFinal = calcularScoreTotal(respostas);

  console.groupCollapsed(`[QuizScore] ${evento}`);
  if (detalhe) console.log('detalhe:', detalhe);
  console.table(linhas);
  console.log('somaBruta:', somaBruta);
  console.log('scoreFinal(c/ limite e dedupe):', scoreFinal);
  console.groupEnd();
}

export default function QuizContent({ slug }: QuizContentProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [resultados, setResultados] = useState<QuizResultado[]>([]);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [opcoesMap, setOpcoesMap] = useState<Record<string, Opcao[]>>({});
  const [questaoAtual, setQuestaoAtual] = useState<Questao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setScoreTotal] = useState(0);
  const [respostasLog, setRespostasLog] = useState<RespostaLog[]>([]);
  const [direction, setDirection] = useState(0);
  const [historico, setHistorico] = useState<Questao[]>([]);
  const [selecionadosMultipla, setSelecionadosMultipla] = useState<Set<string>>(new Set());
  const [transicaoEmAndamento, setTransicaoEmAndamento] = useState(false);
  // Formulário de contato
  const [formContato, setFormContato] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    empresa: '',
  });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  // Loading de 1.5s ao exibir bloco de resultado
  const [resultadoLoading, setResultadoLoading] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const leadIdRef = useRef<string | null>(null);
  const leadCriacaoEmAndamentoRef = useRef<Promise<string | null> | null>(null);
  const ultimoPayloadContatoRef = useRef<string>('');
  const ultimoScorePersistidoRef = useRef<number | null>(null);
  const leadPipelineVinculadoRef = useRef<string | null>(null);
  const utmCaptura = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        utm_source: null as string | null,
        utm_medium: null as string | null,
        utm_campaign: null as string | null,
        utm_term: null as string | null,
        utm_content: null as string | null,
        utm_id: null as string | null,
      };
    }
    const params = new URLSearchParams(window.location.search);
    const ler = (chave: string) => {
      const valor = params.get(chave);
      const normalizado = valor?.trim();
      return normalizado ? normalizado : null;
    };
    return {
      utm_source: ler('utm_source'),
      utm_medium: ler('utm_medium'),
      utm_campaign: ler('utm_campaign'),
      utm_term: ler('utm_term'),
      utm_content: ler('utm_content'),
      utm_id: ler('utm_id'),
    };
  }, []);

  useEffect(() => {
    leadIdRef.current = leadId;
  }, [leadId]);

  const montarOpcoesSnapshot = useCallback(
    (idQuestao: string) =>
      (opcoesMap[idQuestao] ?? []).map((o) => ({
        id: o.id,
        texto: o.texto,
        valor_score: normalizarValorScore(o.valor_score),
        rotulo: o.rotulo,
      })),
    [opcoesMap]
  );

  const vincularLeadNoPipeline = useCallback(
    async (idLead: string, idPipeline: string | null | undefined) => {
      if (!idPipeline) return;
      const key = `${idLead}:${idPipeline}`;
      if (leadPipelineVinculadoRef.current === key) return;

      const { data: etapaInicial, error: etapaErr } = await supabase
        .from('crm_pipeline_etapas')
        .select('id')
        .eq('id_pipeline', idPipeline)
        .eq('ativo', true)
        .order('ordem', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (etapaErr) {
        console.warn('Erro ao buscar etapa inicial do pipeline. Lead seguir\u00e1 sem etapa inicial:', etapaErr);
      }

      const payload = {
        id_pipeline: idPipeline,
        id_etapa: (etapaInicial as { id?: string } | null)?.id ?? null,
        id_lead: idLead,
      };

      const { error: upsertErr } = await supabase
        .from('crm_pipeline_leads')
        .upsert(payload, { onConflict: 'id_lead', ignoreDuplicates: true });
      if (upsertErr) {
        console.error('Erro ao vincular lead no pipeline:', upsertErr);
        return;
      }

      leadPipelineVinculadoRef.current = key;
    },
    []
  );

  const criarOuObterLeadInicial = useCallback(async (): Promise<string | null> => {
    if (leadIdRef.current) return leadIdRef.current;
    if (leadCriacaoEmAndamentoRef.current) return leadCriacaoEmAndamentoRef.current;
    if (!quiz) return null;

    const scoreInicial = calcularScoreTotal(respostasLog);
    const payload = {
      id_empresa: quiz.id_empresa,
      id_quiz: quiz.id,
      nome: formContato.nome.trim() || 'Novo Lead',
      email: formContato.email.trim() || null,
      whatsapp: formContato.whatsapp.trim() || null,
      empresa_prospect: formContato.empresa.trim() || null,
      utm_source: utmCaptura.utm_source,
      utm_medium: utmCaptura.utm_medium,
      utm_campaign: utmCaptura.utm_campaign,
      utm_term: utmCaptura.utm_term,
      utm_content: utmCaptura.utm_content,
      utm_id: utmCaptura.utm_id,
      score_qualificacao: scoreInicial,
      origem: 'Quiz',
      status_conversao: 'novo',
      dados_extras: { origem_quiz: true, id_quiz: quiz.id, slug_quiz: quiz.slug },
    };

    const promessa = (async () => {
      const { data, error: insertError } = await supabase
        .from('crm_leads')
        .insert(payload)
        .select('id')
        .single();

      if (insertError) {
        console.error('Erro ao criar lead inicial:', insertError, payload);
        return null;
      }

      const novoLeadId = (data as { id: string }).id;
      setLeadId(novoLeadId);
      leadIdRef.current = novoLeadId;
      await vincularLeadNoPipeline(novoLeadId, quiz.id_pipeline);
      ultimoPayloadContatoRef.current = JSON.stringify({
        nome: payload.nome,
        email: payload.email,
        whatsapp: payload.whatsapp,
        empresa_prospect: payload.empresa_prospect,
      });
      ultimoScorePersistidoRef.current = payload.score_qualificacao;
      return novoLeadId;
    })();

    leadCriacaoEmAndamentoRef.current = promessa;
    try {
      return await promessa;
    } finally {
      leadCriacaoEmAndamentoRef.current = null;
    }
  }, [quiz, respostasLog, formContato.nome, formContato.email, formContato.whatsapp, formContato.empresa, utmCaptura.utm_source, utmCaptura.utm_medium, utmCaptura.utm_campaign, utmCaptura.utm_term, utmCaptura.utm_content, utmCaptura.utm_id, vincularLeadNoPipeline]);

  const persistirRespostasQuestao = useCallback(
    async (idQuestao: string, respostasQuestao: RespostaLog[]) => {
      const idLead = await criarOuObterLeadInicial();
      if (!idLead) return;

      const questao = questoes.find((q) => q.id === idQuestao);
      if (!questao) return;

      const { error: deleteError } = await supabase
        .from('crm_quiz_respostas')
        .delete()
        .eq('id_lead', idLead)
        .eq('id_pergunta', idQuestao);
      if (deleteError) {
        console.error('Erro ao limpar respostas anteriores da pergunta:', deleteError);
        return;
      }

      if (respostasQuestao.length === 0) return;

      const opcoesDaQuestao = opcoesMap[idQuestao] ?? [];
      const opcoesSnapshot = montarOpcoesSnapshot(idQuestao);
      const payload = respostasQuestao
        .map((r) => {
          const opcao = opcoesDaQuestao.find((o) => o.id === r.id_opcao);
          return {
            id_lead: idLead,
            id_pergunta: idQuestao,
            pergunta_texto: questao.titulo,
            resposta_texto: opcao?.texto ?? '',
            opcoes_snapshot: opcoesSnapshot,
            valor_score: normalizarValorScore(r.valor_score),
          };
        })
        .filter((linha) => linha.resposta_texto);

      if (payload.length === 0) return;

      const { error: insertError } = await supabase.from('crm_quiz_respostas').insert(payload);
      if (insertError) {
        console.error('Erro ao inserir respostas granulares:', insertError);
      }
    },
    [criarOuObterLeadInicial, questoes, opcoesMap, montarOpcoesSnapshot]
  );

  const carregarQuiz = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: quizData, error: quizError } = await supabase
        .from('crm_quiz')
        .select('*')
        .eq('slug', slug)
        .eq('ativo', true)
        .maybeSingle();

      if (quizError) throw quizError;
      if (!quizData) {
        setError('Quiz não encontrado.');
        return;
      }

      setQuiz(quizData as Quiz);

      const { data: questoesData, error: questoesError } = await supabase
        .from('crm_questoes')
        .select('*')
        .eq('id_quiz', quizData.id)
        .order('ordem', { ascending: true });

      if (questoesError) throw questoesError;
      const questoesList = (questoesData || []) as Questao[];
      setQuestoes(questoesList);

      if (questoesList.length === 0) {
        setError('Quiz sem perguntas configuradas.');
        return;
      }

      const { data: opcoesData, error: opcoesError } = await supabase
        .from('crm_opcoes')
        .select('*')
        .in('id_questao', questoesList.map((q) => q.id));

      if (opcoesError) throw opcoesError;

      const map: Record<string, Opcao[]> = {};
      (opcoesData || []).forEach((o: Opcao) => {
        if (!map[o.id_questao]) map[o.id_questao] = [];
        map[o.id_questao].push(o);
      });
      setOpcoesMap(map);

      const { data: resultadosData } = await supabase
        .from('crm_quiz_resultados')
        .select('*')
        .eq('id_quiz', quizData.id)
        .order('nivel', { ascending: true });
      setResultados((resultadosData || []) as QuizResultado[]);

      const inicial = questoesList.find((q) => q.is_inicial) ?? questoesList[0];
      setQuestaoAtual(inicial);
    } catch (err: unknown) {
      console.error('Erro ao carregar quiz:', err);
      setError('Erro ao carregar o quiz. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    carregarQuiz();
  }, [carregarQuiz]);

  useEffect(() => {
    if (!quiz || leadIdRef.current) return;
    void criarOuObterLeadInicial();
  }, [quiz, criarOuObterLeadInicial]);

  useEffect(() => {
    if (!leadId || !quiz?.id_pipeline) return;
    void vincularLeadNoPipeline(leadId, quiz.id_pipeline);
  }, [leadId, quiz?.id_pipeline, vincularLeadNoPipeline]);

  useEffect(() => {
    if (!quiz) return;
    const timeout = setTimeout(() => {
      void (async () => {
        const payloadContato = {
          nome: formContato.nome.trim() || 'Novo Lead',
          email: formContato.email.trim() || null,
          whatsapp: formContato.whatsapp.trim() || null,
          empresa_prospect: formContato.empresa.trim() || null,
        };
        const payloadKey = JSON.stringify(payloadContato);
        if (payloadKey === ultimoPayloadContatoRef.current) return;

        const idLead = await criarOuObterLeadInicial();
        if (!idLead) return;

        const { error: updateError } = await supabase
          .from('crm_leads')
          .update(payloadContato)
          .eq('id', idLead);
        if (updateError) {
          console.error('Erro ao atualizar dados do lead:', updateError);
          return;
        }
        ultimoPayloadContatoRef.current = payloadKey;
      })();
    }, 250);

    return () => clearTimeout(timeout);
  }, [quiz, formContato.nome, formContato.email, formContato.whatsapp, formContato.empresa, criarOuObterLeadInicial]);

  useEffect(() => {
    if (!quiz) return;
    const scoreCalculado = calcularScoreTotal(respostasLog);
    if (ultimoScorePersistidoRef.current === scoreCalculado) return;

    void (async () => {
      const idLead = await criarOuObterLeadInicial();
      if (!idLead) return;

      const { error: updateError } = await supabase
        .from('crm_leads')
        .update({ score_qualificacao: scoreCalculado })
        .eq('id', idLead);
      if (updateError) {
        console.error('Erro ao atualizar score do lead:', updateError);
        return;
      }
      ultimoScorePersistidoRef.current = scoreCalculado;
    })();
  }, [quiz, respostasLog, criarOuObterLeadInicial]);

  // Loading de 1.5s ao exibir bloco de resultado
  useEffect(() => {
    if (questaoAtual?.tipo_questao === 'resultado') {
      setResultadoLoading(true);
      const t = setTimeout(() => setResultadoLoading(false), 1500);
      return () => clearTimeout(t);
    } else {
      setResultadoLoading(false);
    }
  }, [questaoAtual?.id, questaoAtual?.tipo_questao]);

  useEffect(() => {
    setTransicaoEmAndamento(false);
  }, [questaoAtual?.id, questaoAtual?.tipo_questao]);

  const obterProximaQuestao = useCallback(
    (opcao: Opcao): Questao | null => {
      if (!questoes.length) return null;

      if (opcao.id_proxima_questao) {
        const proxima = questoes.find((q) => q.id === opcao.id_proxima_questao);
        return proxima ?? null;
      }

      const idxAtual = questoes.findIndex((q) => q.id === questaoAtual?.id);
      if (idxAtual < 0 || idxAtual >= questoes.length - 1) return null;
      return questoes[idxAtual + 1];
    },
    [questoes, questaoAtual]
  );

  const obterProximaPorOrdem = useCallback(
    (atual: Questao): Questao | null => {
      const idx = questoes.findIndex((q) => q.id === atual.id);
      if (idx < 0 || idx >= questoes.length - 1) return null;
      return questoes[idx + 1];
    },
    [questoes]
  );

  const handleSelecionarOpcao = useCallback(
    (opcao: Opcao) => {
      if (!questaoAtual || transicaoEmAndamento) return;
      setTransicaoEmAndamento(true);

      const valorOpcao = normalizarValorScore(opcao.valor_score);
      setScoreTotal((s) => Math.max(0, Math.min(SCORE_MAXIMO, s + valorOpcao)));
      setRespostasLog((prev) => {
        const semRespostaAnteriorDaQuestao = prev.filter((r) => r.id_questao !== questaoAtual.id);
        const atualizadas = [
          ...semRespostaAnteriorDaQuestao,
          {
            id_questao: questaoAtual.id,
            id_opcao: opcao.id,
            valor_score: valorOpcao,
          },
        ];
        logCalculoScore('Clique opcao (multipla_escolha)', atualizadas, {
          questaoAtualId: questaoAtual.id,
          opcaoId: opcao.id,
          valorOpcao,
        });
        return atualizadas;
      });
      void persistirRespostasQuestao(questaoAtual.id, [
        { id_questao: questaoAtual.id, id_opcao: opcao.id, valor_score: valorOpcao },
      ]);

      const proxima = obterProximaQuestao(opcao);

      if (proxima) {
        setHistorico((h) => [...h, questaoAtual]);
        setDirection(1);
        setQuestaoAtual(proxima);
      } else {
        setHistorico((h) => [...h, questaoAtual]);
        setDirection(1);
        setQuestaoAtual(null);
      }
    },
    [questaoAtual, obterProximaQuestao, transicaoEmAndamento, persistirRespostasQuestao]
  );

  const handleContinuarInformativo = useCallback(() => {
    if (!questaoAtual || transicaoEmAndamento) return;
    setTransicaoEmAndamento(true);
    logCalculoScore('Clique continuar (informativo)', respostasLog, {
      questaoAtualId: questaoAtual.id,
    });
    const proxima = obterProximaPorOrdem(questaoAtual);
    setHistorico((h) => [...h, questaoAtual]);
    setDirection(1);
    if (proxima) {
      setQuestaoAtual(proxima);
    } else {
      setQuestaoAtual(null);
    }
  }, [questaoAtual, obterProximaPorOrdem, respostasLog, transicaoEmAndamento]);

  const handleToggleOpcaoMultipla = useCallback((idOpcao: string) => {
    if (transicaoEmAndamento) return;
    setSelecionadosMultipla((prev) => {
      const next = new Set(prev);
      if (next.has(idOpcao)) next.delete(idOpcao);
      else next.add(idOpcao);
      return next;
    });
  }, [transicaoEmAndamento]);

  const handleContinuarMultiplaSelecao = useCallback(
    (q: Questao) => {
      if (transicaoEmAndamento) return;
      setTransicaoEmAndamento(true);
      const opcoes = opcoesMap[q.id] ?? [];
      const ids = Array.from(selecionadosMultipla);
      const toAdd = ids
        .map((idOpcao) => {
          const op = opcoes.find((o) => o.id === idOpcao);
          return op
            ? {
                id_questao: q.id,
                id_opcao: op.id,
                valor_score: normalizarValorScore(op.valor_score),
              }
            : null;
        })
        .filter((r): r is RespostaLog => r !== null);
      setRespostasLog((prev) => {
        const atualizadas = [...prev, ...toAdd];
        logCalculoScore('Clique continuar (multipla_selecao)', atualizadas, {
          questaoAtualId: q.id,
          opcoesSelecionadas: toAdd.map((x) => x.id_opcao),
        });
        return atualizadas;
      });
      void persistirRespostasQuestao(q.id, toAdd);
      setScoreTotal((s) => s + toAdd.reduce((acc, r) => acc + normalizarValorScore(r.valor_score), 0));
      setSelecionadosMultipla(new Set());
      const proxima = q.id_proxima_questao_selecao
        ? questoes.find((x) => x.id === q.id_proxima_questao_selecao)
        : obterProximaPorOrdem(q);
      if (proxima) {
        setHistorico((h) => [...h, q]);
        setDirection(1);
        setQuestaoAtual(proxima);
      } else {
        setHistorico((h) => [...h, q]);
        setDirection(1);
        setQuestaoAtual(null);
      }
    },
    [selecionadosMultipla, opcoesMap, questoes, obterProximaPorOrdem, transicaoEmAndamento, persistirRespostasQuestao]
  );

  const handleVoltar = useCallback(() => {
    const anterior = historico[historico.length - 1];
    if (!anterior) return;
    const veioDeInformativo = anterior.tipo_questao === 'informativo';
    const veioDeMultiplaSelecao = anterior.tipo_questao === 'multipla_selecao';
    setHistorico((h) => h.slice(0, -1));
    if (!veioDeInformativo) {
      if (veioDeMultiplaSelecao) {
        const entradasQuestao = respostasLog.filter((r) => r.id_questao === anterior.id);
        const scoreARemover = entradasQuestao.reduce(
          (s, r) => s + normalizarValorScore(r.valor_score),
          0
        );
        const respostasAposVoltar = respostasLog.filter((r) => r.id_questao !== anterior.id);
        setRespostasLog(respostasAposVoltar);
        void persistirRespostasQuestao(anterior.id, []);
        setScoreTotal((s) => s - scoreARemover);
        setSelecionadosMultipla(new Set(entradasQuestao.map((r) => r.id_opcao)));
        logCalculoScore('Clique voltar', respostasAposVoltar, {
          voltaParaQuestaoId: anterior.id,
          scoreRemovido: scoreARemover,
        });
      } else {
        const ultimaResposta = respostasLog[respostasLog.length - 1];
        const scoreARemover = normalizarValorScore(ultimaResposta?.valor_score);
        const respostasAposVoltar = respostasLog.slice(0, -1);
        setRespostasLog(respostasAposVoltar);
        if (ultimaResposta) {
          void persistirRespostasQuestao(ultimaResposta.id_questao, []);
        }
        setScoreTotal((s) => s - scoreARemover);
        logCalculoScore('Clique voltar', respostasAposVoltar, {
          voltaParaQuestaoId: anterior.id,
          scoreRemovido: scoreARemover,
        });
      }
    } else {
      logCalculoScore('Clique voltar (informativo)', respostasLog, {
        voltaParaQuestaoId: anterior.id,
      });
    }
    setDirection(-1);
    setQuestaoAtual(anterior);
  }, [historico, respostasLog, persistirRespostasQuestao]);

  const handleEnviarContato = useCallback(async () => {
    if (!quiz) return;
    const nome = formContato.nome.trim() || 'Novo Lead';
    const scoreCalculado = calcularScoreTotal(respostasLog);
    logCalculoScore('Clique enviar contato', respostasLog, { scoreCalculado });

    setEnviando(true);
    try {
      const idLead = await criarOuObterLeadInicial();
      if (!idLead) throw new Error('Não foi possível criar/obter lead.');

      const payloadLead = {
        nome,
        email: formContato.email.trim() || null,
        whatsapp: formContato.whatsapp.trim() || null,
        empresa_prospect: formContato.empresa.trim() || null,
        score_qualificacao: scoreCalculado,
      };
      const { error: updateError } = await supabase
        .from('crm_leads')
        .update(payloadLead)
        .eq('id', idLead);

      if (updateError) throw updateError;
      ultimoPayloadContatoRef.current = JSON.stringify(payloadLead);
      ultimoScorePersistidoRef.current = scoreCalculado;
      setEnviado(true);
    } catch (err: unknown) {
      console.error('Erro ao salvar lead:', err);
      setError('Erro ao enviar. Tente novamente.');
    } finally {
      setEnviando(false);
      setTransicaoEmAndamento(false);
    }
  }, [quiz, formContato, respostasLog, criarOuObterLeadInicial]);

  const handleContatoContinuar = useCallback(
    (proxima: Questao | null) => {
      if (transicaoEmAndamento) return;
      setTransicaoEmAndamento(true);
      logCalculoScore('Clique continuar (contato)', respostasLog, {
        questaoAtualId: questaoAtual?.id ?? null,
        temProxima: Boolean(proxima),
      });
      if (proxima) {
        setHistorico((h) => [...h, questaoAtual!]);
        setDirection(1);
        setQuestaoAtual(proxima);
      } else {
        handleEnviarContato();
      }
    },
    [questaoAtual, handleEnviarContato, respostasLog, transicaoEmAndamento]
  );

  const totalPassosConfigurado = Number(quiz?.passos_totais ?? 12);
  const totalPassos = Number.isFinite(totalPassosConfigurado)
    ? Math.max(1, Math.round(totalPassosConfigurado))
    : 12;
  const passosPercorridos = questaoAtual ? historico.length + 1 : historico.length;
  const progresso = Math.min(Math.max(passosPercorridos / totalPassos, 0), 1);

  const temaModo = quiz ? ((quiz as { tema_modo?: 'light' | 'dark' }).tema_modo || 'light') : 'light';
  const isDark = temaModo === 'dark';
  const themeClass = isDark ? 'dark' : '';
  const bgClass = isDark ? 'bg-neutral-950' : 'bg-gray-50';
  const cardBgClass = isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200 dark:border-neutral-800 dark:bg-neutral-900';
  const textClass = isDark ? 'text-gray-100' : 'text-gray-900 dark:text-gray-100';
  const textMutedClass = isDark ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400';

  const FooterEl = (
    <footer className={`fixed bottom-0 left-0 right-0 py-3 ${isDark ? 'bg-neutral-950' : 'bg-gray-50'}`}>
      <FooterCopyright />
    </footer>
  );

  if (loading) {
    return (
      <div className={`min-h-[100dvh] sm:min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 pb-14 ${bgClass} ${themeClass}`}>
        <div className="animate-pulse space-y-4 w-full max-w-md">
          <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full" />
          <div className="h-8 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="space-y-3 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 w-full bg-gray-200 dark:bg-gray-800 rounded-xl" />
            ))}
          </div>
        </div>
        {FooterEl}
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className={`min-h-[100dvh] sm:min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 pb-14 ${bgClass} ${themeClass}`}>
        <div className="text-center max-w-md">
          <p className={`text-lg ${textMutedClass}`}>{error || 'Quiz não encontrado.'}</p>
        </div>
        {FooterEl}
      </div>
    );
  }

  if (enviado) {
    return (
      <div className={`min-h-[100dvh] sm:min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 pb-14 ${bgClass} ${themeClass}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md mx-auto"
        >
          <div className={`rounded-xl border shadow-sm p-6 sm:p-8 text-center ${cardBgClass}`}>
            <h2 className={`text-xl font-semibold mb-2 ${textClass}`}>
              Obrigado!
            </h2>
            <p className={textMutedClass}>
              Suas informações foram recebidas. Em breve entraremos em contato.
            </p>
          </div>
        </motion.div>
        {FooterEl}
      </div>
    );
  }

  const corPrimaria = (quiz as { cor_primaria?: string })?.cor_primaria || '#0047FF';
  const urlLogo = (quiz as { url_logo?: string | null })?.url_logo;
  const tamanhoLogo = (quiz as { tamanho_logo?: number })?.tamanho_logo;

  const podeVoltar = historico.length > 0;

  const vars = {
    nome: formContato.nome,
    email: formContato.email,
    whatsapp: formContato.whatsapp,
    empresa: formContato.empresa,
  };
  const interpolar = (t: string) => interpolarVariaveis(t, vars);

  return (
    <div className={`min-h-[100dvh] sm:min-h-screen flex flex-col items-center p-4 sm:p-6 pb-14 ${bgClass} ${themeClass}`}>
      <div className="w-full max-w-md flex flex-col mx-auto flex-1 min-h-0">
        {/* Logo e barra de progresso fixos no topo */}
        <div className="flex-shrink-0 w-full">
        <div className="w-full flex items-center mt-6 mb-5">
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
            {podeVoltar && (
              <button
                onClick={handleVoltar}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Voltar"
              >
                <ArrowLeft size={20} />
              </button>
            )}
          </div>
          {urlLogo ? (
            <div className="flex-1 flex justify-center items-center min-h-[48px]">
              <img
                src={urlLogo}
                alt="Logo"
                className={`${getQuizLogoClasse(tamanhoLogo)} object-contain`}
              />
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <div className="w-12 flex-shrink-0" />
        </div>
        {/* Barra de progresso — largura alinhada ao conteúdo */}
        <div className="w-full px-6 sm:px-8">
          <div className={`h-1.5 rounded-full overflow-hidden mb-3 ${isDark ? 'bg-neutral-800' : 'bg-gray-200'}`}>
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: corPrimaria }}
              initial={{ width: 0 }}
              animate={{ width: `${progresso * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
        </div>

        {/* Área de conteúdo: centralizado verticalmente */}
        <div className="flex-1 flex flex-col justify-center w-full py-4">
          <AnimatePresence mode="wait">
            {questaoAtual && questaoAtual.tipo_questao === 'informativo' ? (
              <motion.div
                key="informativo"
                className="w-full"
                initial={{ opacity: 0, x: direction >= 0 ? 24 : -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction >= 0 ? -24 : 24 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="px-6 sm:px-8 pt-3 pb-6 sm:pb-8">
                <h2 className={`text-xl font-semibold mb-5 text-center ${textClass}`}>
                  <QuizTextWithBold text={interpolar(questaoAtual.titulo)} />
                </h2>
                {questaoAtual.subtitulo && (
                  <p className={`mb-8 whitespace-pre-line text-justify ${textMutedClass}`}>
                    <QuizTextWithBold text={interpolar(questaoAtual.subtitulo)} />
                  </p>
                )}
                <button
                  onClick={handleContinuarInformativo}
                  disabled={transicaoEmAndamento}
                  className="w-full py-3 px-4 rounded-lg font-medium text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: corPrimaria }}
                >
                  {questaoAtual.id === (questoes.find((q) => q.is_inicial) ?? questoes[0])?.id
                    ? 'Iniciar Mapeamento'
                    : 'Continuar'}
                </button>
                <p className={`text-[11px] mt-3 text-center leading-tight max-w-sm mx-auto ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Ao clicar em alguma das opções, você concorda com os Termos de utilização e serviço, Política de privacidade, Política de subscrição e Política de cookies.
                </p>
              </div>
            </motion.div>
          ) : questaoAtual && questaoAtual.tipo_questao === 'contato' ? (
            (() => {
              const campos = (questaoAtual.campos_contato ?? ['nome', 'email', 'whatsapp']) as string[];
              const proxima = questaoAtual.contato_finaliza
                ? null
                : (questaoAtual.id_proxima_questao_contato
                    ? questoes.find((q) => q.id === questaoAtual.id_proxima_questao_contato)
                    : null) ?? obterProximaPorOrdem(questaoAtual);
              const isUltimo = !proxima;
              const nomeOk = !campos.includes('nome') || formContato.nome.trim().length > 0;
              const emailOk = !campos.includes('email') || isValidEmail(formContato.email);
              const whatsappOk = !campos.includes('whatsapp') || isValidWhatsApp(formContato.whatsapp);
              const empresaOk = !campos.includes('empresa') || formContato.empresa.trim().length > 0;
              const podeEnviar = nomeOk && emailOk && whatsappOk && empresaOk;
              const inputCls = `w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${isDark ? 'border-neutral-600 bg-neutral-800 text-gray-100 placeholder-gray-500 focus:ring-neutral-500' : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:ring-[#0047FF]'}`;
              return (
                <motion.div
                  key="contato"
                  className="w-full"
                  initial={{ opacity: 0, x: direction >= 0 ? 24 : -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction >= 0 ? -24 : 24 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <div className="px-6 sm:px-8 pt-3 pb-6 sm:pb-8">
                    <h2 className={`text-xl font-semibold mb-3 text-center ${textClass}`}>
                      {interpolar(questaoAtual.titulo)}
                    </h2>
                    {questaoAtual.subtitulo && (
                      <p className={`mb-8 text-center ${textMutedClass}`}>{interpolar(questaoAtual.subtitulo)}</p>
                    )}
                    <div className="space-y-4">
                      {campos.includes('nome') && (
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${textMutedClass}`}>
                            Nome *
                          </label>
                          <input
                            type="text"
                            value={formContato.nome}
                            onChange={(e) => setFormContato((p) => ({ ...p, nome: e.target.value }))}
                            placeholder="Seu nome"
                            className={inputCls}
                          />
                        </div>
                      )}
                      {campos.includes('email') && (
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${textMutedClass}`}>E-mail *</label>
                          <input
                            type="email"
                            value={formContato.email}
                            onChange={(e) => setFormContato((p) => ({ ...p, email: e.target.value }))}
                            placeholder="seu@email.com"
                            className={inputCls}
                          />
                        </div>
                      )}
                      {campos.includes('whatsapp') && (
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${textMutedClass}`}>WhatsApp *</label>
                          <input
                            type="tel"
                            value={formContato.whatsapp}
                            onChange={(e) =>
                              setFormContato((p) => ({ ...p, whatsapp: formatarWhatsApp(e.target.value) }))
                            }
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                            className={inputCls}
                          />
                        </div>
                      )}
                      {campos.includes('empresa') && (
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${textMutedClass}`}>
                            Nome da Empresa *
                          </label>
                          <input
                            type="text"
                            value={formContato.empresa}
                            onChange={(e) => setFormContato((p) => ({ ...p, empresa: e.target.value }))}
                            placeholder="Nome da empresa"
                            className={inputCls}
                          />
                        </div>
                      )}
                      <button
                        onClick={() => handleContatoContinuar(proxima)}
                        disabled={enviando || !podeEnviar || transicaoEmAndamento}
                        className="w-full py-3 px-4 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: corPrimaria }}
                      >
                        {enviando ? 'Enviando...' : isUltimo ? 'Enviar' : 'Continuar'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })()
          ) : questaoAtual && questaoAtual.tipo_questao === 'multipla_selecao' ? (
            <motion.div
              key={questaoAtual.id}
              className="w-full"
              initial={{ opacity: 0, x: direction >= 0 ? 24 : -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction >= 0 ? -24 : 24 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="px-6 sm:px-8 pt-3 pb-6 sm:pb-8">
                <h2 className={`text-xl font-semibold mb-5 text-center ${textClass}`}>
                  <QuizTextWithBold text={interpolar(questaoAtual.titulo)} />
                </h2>
                {questaoAtual.subtitulo && (
                  <p className={`mb-10 text-center ${textMutedClass}`}>{interpolar(questaoAtual.subtitulo)}</p>
                )}
                <div className="space-y-3">
                  {ordenarOpcoesPorRotulo(opcoesMap[questaoAtual.id] || []).map((opcao) => {
                    const checked = selecionadosMultipla.has(opcao.id);
                    return (
                      <button
                        key={opcao.id}
                        type="button"
                        onClick={() => handleToggleOpcaoMultipla(opcao.id)}
                        disabled={transicaoEmAndamento}
                        className={`w-full py-4 px-4 rounded-xl border text-left font-medium transition-colors flex items-center gap-3 ${
                          isDark
                            ? 'border-neutral-600 bg-neutral-800/60 text-gray-100 hover:border-neutral-500 hover:bg-neutral-700/70'
                            : 'border-gray-200 bg-white text-gray-900'
                        }`}
                        style={
                          !isDark
                            ? { borderColor: checked ? corPrimaria : `${corPrimaria}40` }
                            : undefined
                        }
                      >
                        <span
                          className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center ${
                            isDark ? 'border-neutral-500' : ''
                          }`}
                          style={
                            checked
                              ? { borderColor: corPrimaria, backgroundColor: corPrimaria }
                              : !isDark
                                ? { borderColor: `${corPrimaria}80` }
                                : undefined
                          }
                        >
                          {checked && (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </span>
                        {opcao.rotulo?.trim() ? (
                          <span
                            className={`flex-shrink-0 w-9 h-9 rounded-lg border-2 flex items-center justify-center text-sm font-semibold ${
                              isDark ? 'border-neutral-500 text-neutral-300' : ''
                            }`}
                            style={!isDark ? { borderColor: `${corPrimaria}80`, color: corPrimaria } : undefined}
                          >
                            {opcao.rotulo.trim()}
                          </span>
                        ) : null}
                        <span className="flex-1">{interpolar(opcao.texto)}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handleContinuarMultiplaSelecao(questaoAtual)}
                  disabled={transicaoEmAndamento}
                  className="w-full py-3 px-4 rounded-lg font-medium text-white transition-colors hover:opacity-90 mt-6"
                  style={{ backgroundColor: corPrimaria }}
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          ) : questaoAtual && questaoAtual.tipo_questao === 'resultado' ? (
            (() => {
              const scoreTotalResultado = calcularScoreTotal(respostasLog);
              const range = getScoreNivel(scoreTotalResultado);
              const resultado = resultados.find((r) => r.nivel === range.nivel);
              const tituloResultado = resultado?.titulo ?? questaoAtual.titulo;
              const textoResultado = resultado?.texto ?? questaoAtual.subtitulo ?? '';
              const botaoTexto = resultado?.botao_texto ?? null;
              const botaoUrl = resultado?.botao_url ?? null;
              if (resultadoLoading) {
                return (
                  <motion.div
                    key={`${questaoAtual.id}-loading`}
                    className="w-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="px-6 sm:px-8 pt-3 pb-6 sm:pb-8 flex flex-col items-center justify-center min-h-[280px]">
                      <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${corPrimaria}40`, borderTopColor: corPrimaria }} />
                      <p className={`mt-4 text-sm font-medium ${textMutedClass}`}>Calculando seu resultado...</p>
                    </div>
                  </motion.div>
                );
              }
              return (
                <motion.div
                  key={`${questaoAtual.id}-resultado`}
                  className="w-full"
                  initial={{ opacity: 0, y: 14, scale: 0.985, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -6, scale: 0.99, filter: 'blur(2px)' }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                >
                  <motion.div
                    className="px-6 sm:px-8 pt-3 pb-6 sm:pb-8 text-center flex flex-col items-center gap-4"
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: {},
                      show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
                    }}
                  >
                    <motion.div
                      className="flex flex-col items-center w-full gap-0"
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
                      }}
                    >
                      <h2 className={`text-xl font-semibold w-full m-0 p-0 leading-tight block ${textClass}`} style={{ marginBottom: 0 }}>
                        <QuizTextWithBold text={interpolar(tituloResultado || '')} />
                      </h2>
                      <div className="w-full flex justify-center mt-7">
                        <QuizScoreGauge
                          score={scoreTotalResultado}
                          corPrimaria={corPrimaria}
                          isDark={isDark}
                          size={260}
                          label={range.label}
                        />
                      </div>
                    </motion.div>
                    {textoResultado && (
                      <motion.p
                        className={`w-full max-w-md text-sm whitespace-pre-line ${textMutedClass}`}
                        variants={{
                          hidden: { opacity: 0, y: 8 },
                          show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
                        }}
                      >
                        <QuizTextWithBold text={interpolar(textoResultado)} />
                      </motion.p>
                    )}
                    {botaoTexto && (
                      botaoUrl ? (
                        <motion.a
                          href={botaoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-full py-3 px-4 rounded-lg font-medium text-white transition-colors hover:opacity-90"
                          style={{ backgroundColor: corPrimaria }}
                          variants={{
                            hidden: { opacity: 0, y: 8 },
                            show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
                          }}
                        >
                          {botaoTexto}
                        </motion.a>
                      ) : (
                        <motion.button
                          type="button"
                          className="inline-flex items-center justify-center w-full py-3 px-4 rounded-lg font-medium text-white transition-colors hover:opacity-90"
                          style={{ backgroundColor: corPrimaria }}
                          variants={{
                            hidden: { opacity: 0, y: 8 },
                            show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
                          }}
                        >
                          {botaoTexto}
                        </motion.button>
                      )
                    )}
                  </motion.div>
                </motion.div>
              );
            })()
          ) : questaoAtual ? (
            <motion.div
              key={questaoAtual.id}
              className="w-full"
              initial={{ opacity: 0, x: direction >= 0 ? 24 : -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction >= 0 ? -24 : 24 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="px-6 sm:px-8 pt-3 pb-6 sm:pb-8">
                <h2 className={`text-xl font-semibold mb-5 text-center ${textClass}`}>
                  {interpolar(questaoAtual.titulo)}
                </h2>
                {questaoAtual.subtitulo && (
                  <p className={`mb-10 text-center ${textMutedClass}`}>{interpolar(questaoAtual.subtitulo)}</p>
                )}
                <div className="space-y-3">
                  {ordenarOpcoesPorRotulo(opcoesMap[questaoAtual.id] || []).map((opcao) => (
                    <button
                      key={opcao.id}
                      onClick={() => handleSelecionarOpcao(opcao)}
                      disabled={transicaoEmAndamento}
                      className={`w-full py-4 px-4 rounded-xl border text-left font-medium transition-colors flex items-center gap-3 ${
                        isDark
                          ? 'border-neutral-600 bg-neutral-800/60 text-gray-100 hover:border-neutral-500 hover:bg-neutral-700/70'
                          : 'border-gray-200 bg-white text-gray-900'
                      }`}
                      style={
                        !isDark
                          ? {
                              borderColor: `${corPrimaria}40`,
                            }
                          : undefined
                      }
                      onMouseEnter={(e) => {
                        if (!isDark) {
                          e.currentTarget.style.borderColor = `${corPrimaria}80`;
                          e.currentTarget.style.backgroundColor = `${corPrimaria}0D`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isDark) {
                          e.currentTarget.style.borderColor = `${corPrimaria}40`;
                          e.currentTarget.style.backgroundColor = '';
                        }
                      }}
                    >
                      {opcao.rotulo?.trim() ? (
                        <span
                          className={`flex-shrink-0 w-9 h-9 rounded-lg border-2 flex items-center justify-center text-sm font-semibold ${
                            isDark
                              ? 'border-neutral-500 text-neutral-300'
                              : ''
                          }`}
                          style={!isDark ? { borderColor: `${corPrimaria}80`, color: corPrimaria } : undefined}
                        >
                          {opcao.rotulo.trim()}
                        </span>
                      ) : null}
                      <span className="flex-1">{interpolar(opcao.texto)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : null}
          </AnimatePresence>
        </div>
      </div>

      {FooterEl}
    </div>
  );
}
