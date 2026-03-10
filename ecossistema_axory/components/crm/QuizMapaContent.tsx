'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  AlertCircle,
  CheckSquare,
  User,
  Trophy,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Quiz, Questao, Opcao, TipoQuestao } from '@/types/database';
import { ordenarOpcoesPorRotulo } from './quizVariables';

interface QuizMapaContentProps {
  quizId: string;
  onBackToEditor?: () => void;
}

const TIPO_ICON: Record<TipoQuestao, typeof CheckSquare> = {
  multipla_escolha: CheckSquare,
  multipla_selecao: CheckSquare,
  contato: User,
  resultado: Trophy,
  informativo: AlertCircle,
};

const TIPO_STYLE: Record<TipoQuestao, string> = {
  multipla_escolha:
    'border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/30 dark:to-neutral-900',
  multipla_selecao:
    'border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-950/30 dark:to-neutral-900',
  contato:
    'border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50 to-white dark:from-amber-950/30 dark:to-neutral-900',
  resultado:
    'border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white dark:from-green-950/30 dark:to-neutral-900',
  informativo:
    'border-l-4 border-l-violet-500 bg-gradient-to-r from-violet-50 to-white dark:from-violet-950/30 dark:to-neutral-900',
};

interface Nivel {
  nivel: number;
  questao: Questao;
  opcaoOrigem?: Opcao;
  questaoOrigem?: Questao;
}

export default function QuizMapaContent({ quizId, onBackToEditor }: QuizMapaContentProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!user || !quizId) return;
    try {
      setLoading(true);
      setError(null);

      const { data: memberData } = await supabase
        .from('sis_membros_equipe')
        .select('id_empresa')
        .eq('id_usuario', user.id)
        .maybeSingle();

      if (!memberData) {
        setError('Empresa não encontrada.');
        return;
      }

      const { data: quizData, error: quizErr } = await supabase
        .from('crm_quiz')
        .select('*')
        .eq('id', quizId)
        .eq('id_empresa', memberData.id_empresa)
        .maybeSingle();

      if (quizErr) throw quizErr;
      if (!quizData) {
        setError('Quiz não encontrado.');
        return;
      }
      setQuiz(quizData as Quiz);

      const { data: qData, error: qErr } = await supabase
        .from('crm_questoes')
        .select('*')
        .eq('id_quiz', quizId)
        .order('ordem', { ascending: true });

      if (qErr) throw qErr;
      setQuestoes((qData || []) as Questao[]);

      const { data: oData, error: oErr } = await supabase
        .from('crm_opcoes')
        .select('*')
        .in('id_questao', (qData || []).map((q: Questao) => q.id));

      if (oErr) throw oErr;
      setOpcoes((oData || []) as Opcao[]);
    } catch (err: unknown) {
      console.error('Erro ao carregar quiz:', err);
      setError('Erro ao carregar quiz.');
    } finally {
      setLoading(false);
    }
  }, [user, quizId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const opcoesPorQuestao = useCallback(
    (id: string) => ordenarOpcoesPorRotulo(opcoes.filter((o) => o.id_questao === id)),
    [opcoes]
  );

  const getQuestaoById = useCallback(
    (id: string) => questoes.find((q) => q.id === id),
    [questoes]
  );

  const getNumeroQuestao = useCallback(
    (id: string) => {
      const idx = questoes.findIndex((q) => q.id === id);
      return idx >= 0 ? idx + 1 : 0;
    },
    [questoes]
  );

  const construirNiveis = useCallback((): Nivel[][] => {
    if (questoes.length === 0) return [];

    const inicial = questoes.find((q) => q.is_inicial) ?? questoes[0];
    const visitados = new Set<string>();
    const niveis: Nivel[][] = [];
    let fila: Nivel[] = [{ nivel: 0, questao: inicial }];

    while (fila.length > 0) {
      const atual = fila.shift()!;
      if (visitados.has(atual.questao.id)) continue;
      visitados.add(atual.questao.id);

      if (!niveis[atual.nivel]) niveis[atual.nivel] = [];
      niveis[atual.nivel].push(atual);

      const opts = opcoesPorQuestao(atual.questao.id);
      for (const op of opts) {
        if (op.id_proxima_questao) {
          const prox = getQuestaoById(op.id_proxima_questao);
          if (prox && !visitados.has(prox.id)) {
            fila.push({
              nivel: atual.nivel + 1,
              questao: prox,
              opcaoOrigem: op,
              questaoOrigem: atual.questao,
            });
          }
        } else {
          const idx = questoes.findIndex((q) => q.id === atual.questao.id);
          if (idx >= 0 && idx < questoes.length - 1) {
            const prox = questoes[idx + 1];
            if (!visitados.has(prox.id)) {
              fila.push({
                nivel: atual.nivel + 1,
                questao: prox,
                questaoOrigem: atual.questao,
              });
            }
          }
        }
      }
    }

    questoes.forEach((q) => {
      if (!visitados.has(q.id)) {
        const nivel = niveis.length;
        if (!niveis[nivel]) niveis[nivel] = [];
        niveis[nivel].push({ nivel, questao: q });
      }
    });

    return niveis;
  }, [questoes, opcoesPorQuestao, getQuestaoById]);

  const niveis = construirNiveis();

  if (loading) {
    return (
      <div className="py-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-64 w-96 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="py-6 space-y-6">
        <button
          onClick={() => router.push('/crm/quiz')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <ArrowLeft size={18} />
          Voltar
        </button>
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error || 'Quiz não encontrado.'}</p>
        </div>
      </div>
    );
  }

  const corPrimaria = quiz.cor_primaria || '#0047FF';

  return (
    <div className="py-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToEditor ?? (() => router.push(`/crm/quiz/${quizId}`))}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors font-medium"
          >
            <ArrowLeft size={18} />
            Voltar ao editor
          </button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Mapa do fluxo — {quiz.titulo}
          </h1>
        </div>
      </div>

      <div className="overflow-x-auto pb-6">
        <div className="flex gap-0 min-w-max">
          {niveis.map((grupo, nivelIdx) => (
            <div key={nivelIdx} className="flex items-stretch">
              {/* Coluna: questões do nível */}
              <div
                className={`flex flex-col gap-4 min-w-[300px] px-4 py-4 rounded-2xl border border-gray-100 dark:border-neutral-800/50 ${
                  nivelIdx % 2 === 1 ? 'bg-gray-50/50 dark:bg-neutral-900/30' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-lg"
                    style={{
                      backgroundColor: `${corPrimaria}15`,
                      color: corPrimaria,
                    }}
                  >
                    Etapa {nivelIdx + 1}
                  </span>
                  <div
                    className="flex-1 h-px rounded-full"
                    style={{ backgroundColor: `${corPrimaria}25` }}
                  />
                </div>
                {grupo.map((item) => {
                  const Icon = TIPO_ICON[item.questao.tipo_questao];
                  const opts = opcoesPorQuestao(item.questao.id);
                  const numOrigem = item.questaoOrigem ? getNumeroQuestao(item.questaoOrigem.id) : 0;
                  return (
                    <div key={item.questao.id} className="space-y-2">
                      <div
                        className={`rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm overflow-hidden ${TIPO_STYLE[item.questao.tipo_questao]}`}
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <div
                              className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm"
                              style={{ backgroundColor: `${corPrimaria}20`, color: corPrimaria }}
                            >
                              {getNumeroQuestao(item.questao.id)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                                Questão {getNumeroQuestao(item.questao.id)}
                              </p>
                              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight">
                                {item.questao.titulo}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {item.questao.tipo_questao === 'multipla_escolha' &&
                                  `${opts.length} opção${opts.length !== 1 ? 'ões' : ''}`}
                                {item.questao.tipo_questao === 'contato' && 'Formulário de contato'}
                                {item.questao.tipo_questao === 'resultado' && 'Tela final'}
                              </p>
                              {item.questao.is_inicial && (
                                <span
                                  className="inline-block mt-2 px-2 py-0.5 rounded-md text-xs font-semibold text-white"
                                  style={{ backgroundColor: corPrimaria }}
                                >
                                  Início
                                </span>
                              )}
                              {item.opcaoOrigem && numOrigem > 0 && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  ← vindo de Questão {numOrigem} ({item.opcaoOrigem.texto})
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        {opts.length > 0 && (
                          <div className="px-4 pb-3 pt-0 space-y-1.5">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              Próximas perguntas:
                            </p>
                            {opts.map((op) => {
                              const prox = op.id_proxima_questao
                                ? getQuestaoById(op.id_proxima_questao)
                                : null;
                              const numProx = prox ? getNumeroQuestao(prox.id) : 0;
                              return (
                                <div
                                  key={op.id}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 font-medium truncate max-w-[140px]">
                                    {op.texto}
                                  </span>
                                  <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                                  {prox ? (
                                    <span className="text-gray-600 dark:text-gray-300 truncate max-w-[140px]">
                                      <span className="font-semibold" style={{ color: corPrimaria }}>
                                        Questão {numProx}
                                      </span>
                                      {' — '}
                                      {prox.titulo}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic">próxima na ordem</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Divisor / seta entre níveis */}
              {nivelIdx < niveis.length - 1 && (
                <div className="flex items-center justify-center min-w-[48px] px-2">
                  <div
                    className="flex flex-col items-center gap-1"
                    style={{ color: corPrimaria }}
                  >
                    <ArrowRight size={24} className="opacity-60" />
                    <div
                      className="w-0.5 flex-1 min-h-[40px] rounded-full opacity-40"
                      style={{ backgroundColor: corPrimaria }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {questoes.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-neutral-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Adicione questões no editor para visualizar o fluxo.
          </p>
        </div>
      )}
    </div>
  );
}
