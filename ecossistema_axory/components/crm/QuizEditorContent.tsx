'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  Check,
  HelpCircle,
  CheckSquare,
  User,
  Trophy,
  GitBranch,
  Paintbrush,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  Building2,
  Route,
  List,
  Pencil,
  Info,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import QuizPreview from './QuizPreview';
import { ordenarOpcoesPorRotulo } from './quizVariables';
import type { Quiz, Questao, Opcao, TipoQuestao, QuizResultado, CrmPipeline, CampoContato } from '@/types/database';

interface QuizEditorContentProps {
  quizId: string;
  tabMode?: boolean;
  tituloExterno?: string;
  onTituloChange?: (titulo: string) => void;
}

const TIPO_LABELS: Record<TipoQuestao, string> = {
  multipla_escolha: 'Múltipla escolha',
  multipla_selecao: 'Múltipla seleção',
  contato: 'Contato',
  resultado: 'Resultado',
  informativo: 'Informativo',
};

const TIPO_DESCRICOES: Record<TipoQuestao, string> = {
  multipla_escolha: 'Pergunta com opções para o visitante escolher (uma só)',
  multipla_selecao: 'Pergunta com opções para o visitante marcar várias',
  contato: 'Coleta nome, e-mail, WhatsApp e nome da empresa do visitante',
  resultado: 'Tela final com o resultado do quiz',
  informativo: 'Texto informativo com disclaimer — ao clicar em Continuar o usuário aceita os termos',
};

const TIPO_ICON = {
  multipla_escolha: CheckSquare,
  multipla_selecao: CheckSquare,
  contato: User,
  resultado: Trophy,
  informativo: Info,
};

export interface RotaStep {
  questao: Questao;
  opcaoEntrada: Opcao | null;
}

export interface Rota {
  id: string;
  nome: string;
  steps: RotaStep[];
}

function identificarRotas(questoes: Questao[], opcoes: Opcao[]): Rota[] {
  const inicial = questoes.find((q) => q.is_inicial) ?? questoes[0];
  if (!inicial || questoes.length === 0) return [];

  const opcoesPorQuestao = (id: string) => ordenarOpcoesPorRotulo(opcoes.filter((o) => o.id_questao === id));
  const getQuestaoById = (id: string) => questoes.find((q) => q.id === id);
  const getProximaPorOrdem = (q: Questao) => {
    const idx = questoes.findIndex((x) => x.id === q.id);
    return idx >= 0 && idx < questoes.length - 1 ? questoes[idx + 1] : null;
  };

  const rotas: Rota[] = [];

  function dfs(
    current: Questao,
    pathSoFar: RotaStep[],
    opcaoEntrada: Opcao | null,
    visitedInPath: Set<string>
  ) {
    if (visitedInPath.has(current.id)) return;
    visitedInPath.add(current.id);

    const step: RotaStep = { questao: current, opcaoEntrada };
    const newPath = [...pathSoFar, step];

    if (current.tipo_questao === 'resultado') {
      const firstOp = newPath[1]?.opcaoEntrada;
      const nome = rotas.length === 0 && !firstOp ? 'Caminho único' : firstOp && firstOp.texto.length <= 30 ? `Caminho: ${firstOp.texto}` : `Caminho ${rotas.length + 1}`;
      rotas.push({ id: `rota-${rotas.length}`, nome, steps: newPath });
      return;
    }

    if (current.tipo_questao === 'contato') {
      const contatoFinaliza = (current as { contato_finaliza?: boolean }).contato_finaliza;
      if (contatoFinaliza) {
        const firstOp = newPath[1]?.opcaoEntrada;
        const nome = rotas.length === 0 && !firstOp ? 'Caminho único' : firstOp && firstOp.texto.length <= 30 ? `Caminho: ${firstOp.texto}` : `Caminho ${rotas.length + 1}`;
        rotas.push({ id: `rota-${rotas.length}`, nome, steps: newPath });
        return;
      }
      const proxima = current.id_proxima_questao_contato
        ? getQuestaoById(current.id_proxima_questao_contato)
        : getProximaPorOrdem(current);
      if (proxima) {
        dfs(proxima, newPath, null, new Set(visitedInPath));
      } else {
        const firstOp = newPath[1]?.opcaoEntrada;
        const nome = rotas.length === 0 && !firstOp ? 'Caminho único' : firstOp && firstOp.texto.length <= 30 ? `Caminho: ${firstOp.texto}` : `Caminho ${rotas.length + 1}`;
        rotas.push({ id: `rota-${rotas.length}`, nome, steps: newPath });
      }
      return;
    }

    if (current.tipo_questao === 'multipla_selecao') {
      const proxima = current.id_proxima_questao_selecao ? getQuestaoById(current.id_proxima_questao_selecao) : getProximaPorOrdem(current);
      if (proxima) {
        dfs(proxima, newPath, null, new Set(visitedInPath));
      } else {
        rotas.push({ id: `rota-${rotas.length}`, nome: `Caminho ${rotas.length + 1}`, steps: newPath });
      }
      return;
    }

    if (current.tipo_questao === 'informativo') {
      const proxima = getProximaPorOrdem(current);
      if (proxima) {
        dfs(proxima, newPath, null, new Set(visitedInPath));
      } else {
        rotas.push({ id: `rota-${rotas.length}`, nome: `Caminho ${rotas.length + 1}`, steps: newPath });
      }
      return;
    }

    const opts = opcoesPorQuestao(current.id);
    if (opts.length === 0) {
      const proxima = getProximaPorOrdem(current);
      if (proxima) {
        dfs(proxima, newPath, null, new Set(visitedInPath));
      } else {
        rotas.push({ id: `rota-${rotas.length}`, nome: `Caminho ${rotas.length + 1}`, steps: newPath });
      }
      return;
    }

    const destinos = new Map<string, { questao: Questao; opcao: Opcao }>();
    for (const op of opts) {
      const nextId = op.id_proxima_questao;
      const nextQuestao = nextId ? getQuestaoById(nextId) : getProximaPorOrdem(current);
      if (nextQuestao) {
        const key = nextQuestao.id;
        if (!destinos.has(key)) destinos.set(key, { questao: nextQuestao, opcao: op });
      }
    }

    if (destinos.size === 0) {
      rotas.push({ id: `rota-${rotas.length}`, nome: `Caminho ${rotas.length + 1}`, steps: newPath });
      return;
    }

    Array.from(destinos.values()).forEach(({ questao, opcao }) => {
      dfs(questao, newPath, opcao, new Set(visitedInPath));
    });
  }

  dfs(inicial, [], null, new Set());

  rotas.forEach((r, i) => {
    if (r.nome.startsWith('Caminho ') && r.steps.length > 1) {
      const firstOp = r.steps[1]?.opcaoEntrada;
      if (firstOp && firstOp.texto.length <= 30) r.nome = `Caminho: ${firstOp.texto}`;
    }
  });

  return rotas;
}

export default function QuizEditorContent({ quizId, tabMode, tituloExterno, onTituloChange }: QuizEditorContentProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [resultados, setResultados] = useState<QuizResultado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [idEmpresa, setIdEmpresa] = useState<string | null>(null);
  const [selectedQuestaoId, setSelectedQuestaoId] = useState<string | null>(null);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [selectedRotaId, setSelectedRotaId] = useState<string>('todos');
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);

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
      setIdEmpresa(memberData.id_empresa);

      const { data: pipelinesData, error: pipelinesErr } = await supabase
        .from('crm_pipelines')
        .select('*')
        .eq('id_empresa', memberData.id_empresa)
        .eq('ativo', true)
        .order('criado_em', { ascending: false });
      if (pipelinesErr) {
        console.warn('Tabela de pipelines indisponível (execute a migration):', pipelinesErr.message);
        setPipelines([]);
      } else {
        setPipelines((pipelinesData || []) as CrmPipeline[]);
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
      const q = quizData as Record<string, unknown>;
      setQuiz({
        ...(quizData as Quiz),
        cor_primaria: (q.cor_primaria as string) ?? '#0047FF',
        url_logo: (q.url_logo as string | null) ?? null,
        tema_modo: ((q.tema_modo as 'light' | 'dark') ?? 'light') as 'light' | 'dark',
        rotas_nomes: (q.rotas_nomes as Record<string, string>) ?? {},
        score_max: (q.score_max as number) ?? 1000,
        passos_totais: (q.passos_totais as number) ?? 12,
      });

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

      const { data: rData } = await supabase
        .from('crm_quiz_resultados')
        .select('*')
        .eq('id_quiz', quizId)
        .order('nivel', { ascending: true });
      setResultados((rData || []) as QuizResultado[]);
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

  useEffect(() => {
    if (!selectedQuestaoId && questoes.length > 0) {
      setSelectedQuestaoId(questoes[0].id);
    }
  }, [questoes, selectedQuestaoId]);

  // Sincronizar titulo com o pai (QuizTabsPage) quando em tabMode
  useEffect(() => {
    if (tabMode && quiz?.titulo && onTituloChange) {
      onTituloChange(quiz.titulo);
    }
  }, [tabMode, quiz?.titulo, onTituloChange]);

  // Receber titulo editado no pai (QuizTabsPage) - não sobrescrever com vazio no carregamento inicial
  useEffect(() => {
    if (!tabMode || tituloExterno === undefined || !quiz || tituloExterno === quiz.titulo) return;
    if (tituloExterno === '' && quiz.titulo) return; // evita sobrescrever com "" no load inicial
    setQuiz((p) => (p ? { ...p, titulo: tituloExterno } : null));
  }, [tabMode, tituloExterno, quiz]);

  const opcoesPorQuestao = useCallback(
    (idQuestao: string) => ordenarOpcoesPorRotulo(opcoes.filter((o) => o.id_questao === idQuestao)),
    [opcoes]
  );

  const getQuestaoById = useCallback(
    (id: string) => questoes.find((q) => q.id === id),
    [questoes]
  );

  const rotas = useMemo(() => identificarRotas(questoes, opcoes), [questoes, opcoes]);

  const getNomeRota = useCallback(
    (rota: Rota) => (quiz?.rotas_nomes?.[rota.id]?.trim() || rota.nome),
    [quiz?.rotas_nomes]
  );

  const { questoesFiltradas, rotaAtual, mapaRota } = useMemo(() => {
    if (selectedRotaId === 'todos') {
      return {
        questoesFiltradas: questoes,
        rotaAtual: null as Rota | null,
        mapaRota: [] as RotaStep[],
      };
    }
    const rota = rotas.find((r) => r.id === selectedRotaId);
    if (!rota) {
      return { questoesFiltradas: questoes, rotaAtual: null, mapaRota: [] };
    }
    return {
      questoesFiltradas: rota.steps.map((s) => s.questao),
      rotaAtual: rota,
      mapaRota: rota.steps,
    };
  }, [selectedRotaId, rotas, questoes]);

  const handleSalvarQuiz = async (updates: Partial<Quiz>) => {
    if (!quiz) return;
    try {
      const { error: updErr } = await supabase
        .from('crm_quiz')
        .update(updates)
        .eq('id', quiz.id);

      if (updErr) throw updErr;
      setQuiz((p) => (p ? { ...p, ...updates } : null));
    } catch (err: unknown) {
      console.error('Erro ao salvar quiz:', err);
      setError('Erro ao salvar quiz.');
    }
  };

  const handleSalvarResultado = async (nivel: 1 | 2 | 3 | 4, data: Partial<QuizResultado>) => {
    if (!quizId) return;
    try {
      const existing = resultados.find((r) => r.nivel === nivel);
      if (existing) {
        const { error } = await supabase
          .from('crm_quiz_resultados')
          .update(data)
          .eq('id', existing.id);
        if (error) throw error;
        setResultados((prev) =>
          prev.map((r) => (r.nivel === nivel ? { ...r, ...data } : r))
        );
      } else {
        const { data: inserted, error } = await supabase
          .from('crm_quiz_resultados')
          .insert({ id_quiz: quizId, nivel, ...data })
          .select('*')
          .single();
        if (error) throw error;
        setResultados((prev) =>
          [...prev.filter((r) => r.nivel !== nivel), inserted as QuizResultado].sort((a, b) => a.nivel - b.nivel)
        );
      }
    } catch (err: unknown) {
      console.error('Erro ao salvar resultado:', err);
      setError('Erro ao salvar resultado.');
    }
  };

  const handleSalvarNomeRota = async (rotaId: string, nome: string) => {
    if (!quiz) return;
    const atual = quiz.rotas_nomes ?? {};
    const novo = { ...atual };
    if (nome.trim()) novo[rotaId] = nome.trim();
    else delete novo[rotaId];
    await handleSalvarQuiz({ rotas_nomes: novo });
  };

  const handleSalvarQuestao = async (q: Questao) => {
    try {
      const { error: updErr } = await supabase
        .from('crm_questoes')
        .update({
          titulo: q.titulo,
          subtitulo: q.subtitulo,
          tipo_questao: q.tipo_questao,
          ordem: q.ordem,
          is_inicial: q.is_inicial,
          campos_contato: q.campos_contato ?? null,
          id_proxima_questao_contato: q.id_proxima_questao_contato ?? null,
          contato_finaliza: q.contato_finaliza ?? false,
          id_proxima_questao_selecao: q.id_proxima_questao_selecao ?? null,
        })
        .eq('id', q.id);

      if (updErr) throw updErr;
      setQuestoes((prev) => prev.map((x) => (x.id === q.id ? q : x)));
    } catch (err: unknown) {
      console.error('Erro ao salvar questão:', err);
      setError('Erro ao salvar questão.');
    }
  };

  const handleSalvarOpcao = async (o: Opcao) => {
    try {
      const { error: updErr } = await supabase
        .from('crm_opcoes')
        .update({ texto: o.texto, valor_score: o.valor_score, id_proxima_questao: o.id_proxima_questao, rotulo: o.rotulo ?? null })
        .eq('id', o.id);

      if (updErr) throw updErr;
      setOpcoes((prev) => prev.map((x) => (x.id === o.id ? o : x)));
    } catch (err: unknown) {
      console.error('Erro ao salvar opção:', err);
      setError('Erro ao salvar opção.');
    }
  };

  const handleNovaQuestaoComVinculo = async (idQuestaoAnterior: string) => {
    if (!quiz) return;
    try {
      const ordem = Math.max(0, ...questoes.map((q) => q.ordem)) + 1;
      const { data: nova, error: insErr } = await supabase
        .from('crm_questoes')
        .insert({
          id_quiz: quiz.id,
          titulo: 'Nova pergunta',
          subtitulo: null,
          tipo_questao: 'multipla_escolha',
          ordem,
          is_inicial: false,
        })
        .select('*')
        .single();
      if (insErr) throw insErr;
      const novaQuestao = nova as Questao;
      const opcoesAnterior = opcoes.filter((o) => o.id_questao === idQuestaoAnterior);
      const todasProximoNaOrdem = opcoesAnterior.length > 0 && opcoesAnterior.every((o) => o.id_proxima_questao == null);
      if (!todasProximoNaOrdem) {
        const { data: novaOp, error: opErr } = await supabase
          .from('crm_opcoes')
          .insert({
            id_questao: idQuestaoAnterior,
            texto: 'Nova opção',
            valor_score: 0,
            id_proxima_questao: novaQuestao.id,
            rotulo: null,
          })
          .select('*')
          .single();
        if (opErr) throw opErr;
        setOpcoes((prev) => [...prev, novaOp as Opcao]);
      }
      setQuestoes((prev) => [...prev, novaQuestao].sort((a, b) => a.ordem - b.ordem));
      setSelectedQuestaoId(novaQuestao.id);
      setExpandedBlockId(novaQuestao.id);
    } catch (err: unknown) {
      console.error('Erro ao criar questão com vínculo:', err);
      setError('Erro ao criar questão.');
    }
  };

  const handleNovaQuestao = async () => {
    if (!quiz) return;
    try {
      const ordem = Math.max(0, ...questoes.map((q) => q.ordem)) + 1;
      const { data, error: insErr } = await supabase
        .from('crm_questoes')
        .insert({
          id_quiz: quiz.id,
          titulo: 'Nova pergunta',
          subtitulo: null,
          tipo_questao: 'multipla_escolha',
          ordem,
          is_inicial: questoes.length === 0,
        })
        .select('*')
        .single();

      if (insErr) throw insErr;
      const nova = data as Questao;
      setQuestoes((prev) => [...prev, nova].sort((a, b) => a.ordem - b.ordem));
      setSelectedQuestaoId(nova.id);
      setExpandedBlockId(nova.id);
    } catch (err: unknown) {
      console.error('Erro ao criar questão:', err);
      setError('Erro ao criar questão.');
    }
  };

  const handleNovaOpcao = async (idQuestao: string) => {
    try {
      const { data, error: insErr } = await supabase
        .from('crm_opcoes')
        .insert({
          id_questao: idQuestao,
          texto: 'Nova opção',
          valor_score: 0,
          id_proxima_questao: null,
          rotulo: null,
        })
        .select('*')
        .single();

      if (insErr) throw insErr;
      setOpcoes((prev) => [...prev, data as Opcao]);
    } catch (err: unknown) {
      console.error('Erro ao criar opção:', err);
      setError('Erro ao criar opção.');
    }
  };

  const handleDeletarQuestao = async (id: string) => {
    if (!confirm('Excluir esta questão? As opções que apontavam para ela serão resetadas.')) return;
    try {
      const { error: delErr } = await supabase.from('crm_opcoes').delete().eq('id_questao', id);
      if (delErr) throw delErr;

      const { error: delQErr } = await supabase.from('crm_questoes').delete().eq('id', id);
      if (delQErr) throw delQErr;

      setQuestoes((prev) => prev.filter((q) => q.id !== id));
      setOpcoes((prev) =>
        prev
          .filter((o) => o.id_questao !== id)
          .map((o) => (o.id_proxima_questao === id ? { ...o, id_proxima_questao: null } : o))
      );
      setSuccess('Questão excluída. Opções que apontavam para ela foram resetadas.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error('Erro ao excluir questão:', err);
      setError('Erro ao excluir questão.');
    }
  };

  const handleDeletarOpcao = async (id: string) => {
    try {
      const { error: delErr } = await supabase.from('crm_opcoes').delete().eq('id', id);
      if (delErr) throw delErr;
      setOpcoes((prev) => prev.filter((o) => o.id !== id));
    } catch (err: unknown) {
      console.error('Erro ao excluir opção:', err);
      setError('Erro ao excluir opção.');
    }
  };

  const handleSalvarTudo = async () => {
    setSalvando(true);
    setError(null);
    setSuccess(null);
    try {
      if (quiz) await handleSalvarQuiz(quiz);
      setSuccess('Alterações salvas.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const selectedQuestao = selectedQuestaoId ? getQuestaoById(selectedQuestaoId) : null;

  if (loading) {
    return (
      <div className="py-6 space-y-6 w-full">
        <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="py-6 space-y-6 w-full">
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

  return (
    <div className="space-y-6 w-full">
      {!tabMode && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/crm/quiz')}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <HelpCircle size={28} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <input
                type="text"
                value={quiz.titulo}
                onChange={(e) => setQuiz((p) => (p ? { ...p, titulo: e.target.value } : null))}
                onBlur={() => handleSalvarQuiz({ titulo: quiz.titulo })}
                className="text-2xl font-bold text-gray-900 dark:text-gray-100 bg-transparent border-none focus:outline-none focus:ring-0 px-0 min-w-[200px]"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={quiz.ativo}
              onClick={() => {
                const v = !quiz.ativo;
                setQuiz((p) => (p ? { ...p, ativo: v } : null));
                handleSalvarQuiz({ ativo: v });
              }}
              className="inline-flex items-center gap-2 cursor-pointer"
            >
              <span
                className={`relative inline-block w-11 h-6 shrink-0 rounded-full transition-colors ${
                  quiz.ativo ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-200 dark:bg-neutral-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                    quiz.ativo ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </span>
              <span className={`text-sm font-medium ${quiz.ativo ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {quiz.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </button>
            <Link
              href={`/crm/quiz/${quizId}/design`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800"
            >
              <Paintbrush size={18} />
              Editar design
            </Link>
            <Link
              href={`/crm/quiz/${quizId}/mapa`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800"
            >
              <GitBranch size={18} />
              Ver mapa
            </Link>
            <button
              onClick={handleSalvarTudo}
              disabled={salvando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-white shadow-sm"
              style={{ backgroundColor: quiz.cor_primaria || '#0047FF' }}
            >
              <Save size={18} />
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-4 flex items-center gap-3">
          <Check size={20} className="text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
        </div>
      )}

      {/* Seletor de Caminho do Quiz + Salvar + Ativo (quando tabMode) */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Route size={18} className="text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Caminho do Quiz:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedRotaId('todos')}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
              selectedRotaId === 'todos'
                ? 'bg-[#0047FF] text-white shadow-sm'
                : 'bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-neutral-600'
            }`}
          >
            Todos os blocos
          </button>
          {rotas.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedRotaId(r.id)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all truncate max-w-[200px] flex items-center gap-1.5 ${
                selectedRotaId === r.id
                  ? 'bg-[#0047FF] text-white shadow-sm'
                  : 'bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-neutral-600'
              }`}
              title={getNomeRota(r)}
            >
              {getNomeRota(r)}
            </button>
          ))}
        </div>
        {tabMode && (
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              role="switch"
              aria-checked={quiz.ativo}
              onClick={() => {
                const v = !quiz.ativo;
                setQuiz((p) => (p ? { ...p, ativo: v } : null));
                handleSalvarQuiz({ ativo: v });
              }}
              className="inline-flex items-center gap-2 cursor-pointer"
            >
              <span
                className={`relative inline-block w-11 h-6 shrink-0 rounded-full transition-colors ${
                  quiz.ativo ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-200 dark:bg-neutral-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                    quiz.ativo ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </span>
              <span className={`text-sm font-medium ${quiz.ativo ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {quiz.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </button>
            <button
              onClick={handleSalvarTudo}
              disabled={salvando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-white shadow-sm hover:shadow disabled:opacity-50 transition-all"
              style={{ backgroundColor: quiz.cor_primaria || '#0047FF' }}
            >
              <Save size={18} />
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Pipeline para entrada dos leads deste quiz
            </label>
            <select
              value={quiz.id_pipeline ?? ''}
              onChange={(e) => {
                const idPipeline = e.target.value || null;
                setQuiz((p) => (p ? { ...p, id_pipeline: idPipeline } : null));
                handleSalvarQuiz({ id_pipeline: idPipeline });
              }}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0047FF]/50"
            >
              <option value="">Sem pipeline</option>
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.nome}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              Quando definido, cada novo lead deste quiz entra automaticamente neste pipeline.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[200px_340px_1fr_380px] xl:grid-cols-[220px_360px_1fr_420px] 2xl:grid-cols-[240px_380px_1fr_460px] gap-4 min-h-[600px] w-full">
        {/* Coluna 1: Roteiro Atual (breadcrumbs verticais) */}
        <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-100 dark:border-neutral-800 space-y-2">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <List size={14} />
              Roteiro Atual{rotaAtual ? ` — ${getNomeRota(rotaAtual)}` : ''}
            </h3>
            {rotaAtual && (
              <RotaNomeEditor
                rota={rotaAtual}
                nomeAtual={getNomeRota(rotaAtual)}
                onSalvar={(nome) => handleSalvarNomeRota(rotaAtual.id, nome)}
              />
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {selectedRotaId === 'todos' ? (
              questoes.map((q, idx) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setSelectedQuestaoId(q.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors ${
                    selectedQuestaoId === q.id
                      ? 'bg-[#0047FF]/15 dark:bg-[#0047FF]/20 text-[#0047FF] font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <span className="font-medium text-gray-400">Bloco {idx + 1}</span>
                  <p className="truncate mt-0.5">{q.titulo}</p>
                </button>
              ))
            ) : (
              mapaRota.map((step, idx) => (
                <button
                  key={step.questao.id}
                  type="button"
                  onClick={() => setSelectedQuestaoId(step.questao.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors ${
                    selectedQuestaoId === step.questao.id
                      ? 'bg-[#0047FF]/15 dark:bg-[#0047FF]/20 text-[#0047FF] font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  {idx > 0 && <span className="block text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">↳ {step.opcaoEntrada?.texto}</span>}
                  <span className="font-medium text-gray-400">Bloco {questoes.findIndex((q) => q.id === step.questao.id) + 1}</span>
                  <p className="truncate mt-0.5">{step.questao.titulo}</p>
                </button>
              ))
            )}
            {questoesFiltradas.length === 0 && (
              <p className="px-2 py-4 text-xs text-gray-500 dark:text-gray-400 text-center">Nenhum bloco</p>
            )}
          </div>
        </div>

        {/* Coluna 2: configurações do bloco */}
        <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-100 dark:border-neutral-800">
            <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Configurações do bloco
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {selectedQuestao ? (
              <QuestaoConfigPanel
                questao={selectedQuestao}
                numero={questoes.findIndex((q) => q.id === selectedQuestao.id) + 1}
                onUpdate={(upd) => {
                  setQuestoes((prev) =>
                    prev.map((x) => (x.id === selectedQuestao.id ? { ...selectedQuestao, ...upd } : x))
                  );
                  handleSalvarQuestao({ ...selectedQuestao, ...upd });
                }}
                onDeleteQuestao={() => {
                  handleDeletarQuestao(selectedQuestao.id);
                  setSelectedQuestaoId(null);
                }}
                quiz={quiz}
                resultados={resultados}
                onSalvarResultado={handleSalvarResultado}
                onSalvarQuiz={handleSalvarQuiz}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center text-gray-500 dark:text-gray-400">
                <HelpCircle size={40} className="mb-3 opacity-50" />
                <p className="text-sm">Selecione um bloco ao lado para editar</p>
              </div>
            )}
          </div>
        </div>

        {/* Coluna centro: lista de blocos (filtrada por rota) */}
        <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              {selectedRotaId === 'todos' ? 'Blocos' : `Blocos · ${rotaAtual ? getNomeRota(rotaAtual) : ''}`}
            </h3>
            <button
              onClick={() => {
                if (selectedRotaId !== 'todos' && rotaAtual && rotaAtual.steps.length > 0) {
                  const ultima = rotaAtual.steps[rotaAtual.steps.length - 1].questao;
                  handleNovaQuestaoComVinculo(ultima.id);
                } else {
                  handleNovaQuestao();
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[#0047FF] hover:bg-[#0047FF]/10 dark:hover:bg-[#0047FF]/20 transition-colors"
            >
              <Plus size={14} />
              Novo bloco
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {questoesFiltradas.map((q, idx) => {
              const step = rotaAtual?.steps.find((s) => s.questao.id === q.id);
              return (
                <BlocoItem
                  key={q.id}
                  questao={q}
                  numero={questoes.findIndex((x) => x.id === q.id) + 1}
                  questoes={questoes}
                  opcoes={opcoesPorQuestao(q.id)}
                  opcaoEntrada={step?.opcaoEntrada ?? null}
                  isSelected={selectedQuestaoId === q.id}
                  isExpanded={expandedBlockId === q.id}
                  onSelect={() => setSelectedQuestaoId(q.id)}
                  onToggleExpand={() => setExpandedBlockId((id) => (id === q.id ? null : q.id))}
                  onUpdate={(upd) => {
                    setQuestoes((prev) => prev.map((x) => (x.id === q.id ? { ...q, ...upd } : x)));
                    handleSalvarQuestao({ ...q, ...upd });
                  }}
                  onOpcaoUpdate={(op) => {
                    setOpcoes((prev) => prev.map((x) => (x.id === op.id ? op : x)));
                    handleSalvarOpcao(op);
                  }}
                  onAddOpcao={() => handleNovaOpcao(q.id)}
                  onDeleteOpcao={handleDeletarOpcao}
                  podeDeletarOpcao={q.tipo_questao === 'multipla_escolha' || q.tipo_questao === 'multipla_selecao'}
                  quiz={quiz}
                  resultados={resultados}
                  onSalvarResultado={handleSalvarResultado}
                  onSalvarQuiz={handleSalvarQuiz}
                />
              );
            })}
            {questoesFiltradas.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400 text-center">
                <p className="text-sm mb-2">
                  {selectedRotaId === 'todos' ? 'Nenhum bloco ainda' : 'Nenhum bloco nesta rota'}
                </p>
                <button
                  onClick={handleNovaQuestao}
                  className="text-[#0047FF] hover:underline text-sm font-medium"
                >
                  Criar primeiro bloco
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Coluna direita: preview do funil */}
        <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-100 dark:border-neutral-800">
            <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100">Prévia do funil</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <QuizPreview
              quiz={quiz}
              questoes={questoes}
              opcoesPorQuestao={opcoesPorQuestao}
              resultados={resultados}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface RotaNomeEditorProps {
  rota: Rota;
  nomeAtual: string;
  onSalvar: (nome: string) => void;
}

function RotaNomeEditor({ rota, nomeAtual, onSalvar }: RotaNomeEditorProps) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(nomeAtual);

  useEffect(() => {
    setValor(nomeAtual);
  }, [nomeAtual]);

  const handleBlur = () => {
    setEditando(false);
    if (valor.trim() !== nomeAtual) onSalvar(valor);
  };

  return (
    <div className="flex items-center gap-1.5">
      {editando ? (
        <input
          type="text"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
          placeholder="Nome do roteiro (ex: PF, PJ)"
          className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0047FF]/50"
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors w-full text-left"
        >
          <Pencil size={12} />
          {nomeAtual ? `Editar "${nomeAtual}"` : 'Definir nome do roteiro'}
        </button>
      )}
    </div>
  );
}

interface BlocoItemProps {
  questao: Questao;
  numero: number;
  questoes: Questao[];
  opcoes: Opcao[];
  opcaoEntrada: Opcao | null;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<Questao>) => void;
  onOpcaoUpdate: (op: Opcao) => void;
  onAddOpcao: () => void;
  onDeleteOpcao: (id: string) => void;
  podeDeletarOpcao: boolean;
  quiz?: Quiz | null;
  resultados?: QuizResultado[];
  onSalvarResultado?: (nivel: 1 | 2 | 3 | 4, data: Partial<QuizResultado>) => void;
  onSalvarQuiz?: (updates: Partial<Quiz>) => void;
}

function BlocoItem({
  questao,
  numero,
  questoes,
  opcoes,
  opcaoEntrada,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onUpdate,
  onOpcaoUpdate,
  onAddOpcao,
  onDeleteOpcao,
  podeDeletarOpcao,
  quiz,
  resultados = [],
  onSalvarResultado,
  onSalvarQuiz,
}: BlocoItemProps) {
  const TipoIcon = TIPO_ICON[questao.tipo_questao];

  return (
    <div
      className={`rounded-xl border transition-all overflow-hidden ${
        isSelected
          ? 'border-[#0047FF] bg-[#0047FF]/5 dark:bg-[#0047FF]/10 shadow-sm'
          : 'border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600 hover:bg-gray-50/50 dark:hover:bg-neutral-800/50'
      }`}
    >
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={onSelect}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors text-gray-500 dark:text-gray-400"
          title={isExpanded ? 'Recolher' : 'Expandir'}
        >
          {isExpanded ? (
            <ChevronDown size={18} />
          ) : (
            <ChevronRight size={18} />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-gray-200 dark:bg-neutral-700 text-xs font-bold text-gray-600 dark:text-gray-400">
              Bloco {numero}
            </span>
            {questao.is_inicial && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#0047FF] text-white">
                Inicial
              </span>
            )}
            {opcaoEntrada && (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50">
                Vindo de: {opcaoEntrada.texto}
              </span>
            )}
          </div>
          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{questao.titulo}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
            <TipoIcon size={12} />
            {TIPO_LABELS[questao.tipo_questao]}
          </p>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-neutral-700 p-4 bg-white/50 dark:bg-neutral-900/50 space-y-4">
          {questao.tipo_questao === 'multipla_escolha' && (
            <BlocoOpcoesEditor
              opcoes={opcoes}
              questoes={questoes}
              idQuestaoAtual={questao.id}
              onOpcaoUpdate={onOpcaoUpdate}
              onAddOpcao={onAddOpcao}
              onDeleteOpcao={onDeleteOpcao}
              podeDeletarOpcao={podeDeletarOpcao}
            />
          )}
          {questao.tipo_questao === 'multipla_selecao' && (
            <>
              <BlocoOpcoesEditor
                opcoes={opcoes}
                questoes={questoes}
                idQuestaoAtual={questao.id}
                onOpcaoUpdate={onOpcaoUpdate}
                onAddOpcao={onAddOpcao}
                onDeleteOpcao={onDeleteOpcao}
                podeDeletarOpcao={podeDeletarOpcao}
              />
              <div className="p-4 rounded-xl bg-violet-50/80 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/50">
                <p className="text-sm font-semibold text-violet-800 dark:text-violet-200 mb-2">
                  Após selecionar, direcionar para
                </p>
                <ProximoBlocoDropdown
                  value={questao.id_proxima_questao_selecao ?? ''}
                  outrasQuestoes={questoes
                    .filter((q) => q.id !== questao.id)
                    .map((q) => ({ questao: q, numero: questoes.findIndex((x) => x.id === q.id) + 1 }))}
                  onChange={(v) => onUpdate({ id_proxima_questao_selecao: v || null })}
                />
                <p className="text-[10px] text-violet-600 dark:text-violet-400 mt-1">
                  Se não escolher, segue para o próximo bloco por ordem.
                </p>
              </div>
            </>
          )}
          {questao.tipo_questao === 'contato' && (
            <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
                <User size={16} />
                Campos a exibir
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                Marque os campos que deseja coletar nesta etapa. Cada bloco de contato pode ter campos diferentes.
              </p>
              <div className="space-y-2">
                {(['nome', 'email', 'whatsapp', 'empresa'] as const).map((campo) => {
                  const campos = (questao.campos_contato ?? ['nome', 'email', 'whatsapp']) as string[];
                  const checked = campos.includes(campo);
                  const label =
                    campo === 'nome'
                      ? 'Nome'
                      : campo === 'email'
                        ? 'E-mail'
                        : campo === 'whatsapp'
                          ? 'WhatsApp'
                          : 'Nome da Empresa';
                  const Icon =
                    campo === 'nome'
                      ? User
                      : campo === 'email'
                        ? Mail
                        : campo === 'whatsapp'
                          ? Phone
                          : Building2;
                  return (
                    <label
                      key={campo}
                      className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200 cursor-pointer hover:opacity-90"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const ordemCamposContato: CampoContato[] = ['nome', 'email', 'whatsapp', 'empresa'];
                          const next = e.target.checked
                            ? [...campos.filter((c) => c !== campo), campo].sort((a, b) =>
                                ordemCamposContato.indexOf(a as CampoContato) - ordemCamposContato.indexOf(b as CampoContato)
                              )
                            : campos.filter((c) => c !== campo);
                          onUpdate({ campos_contato: (next.length > 0 ? next : ['nome']) as CampoContato[] });
                        }}
                        className="rounded border-amber-300 dark:border-amber-600 text-amber-600 focus:ring-amber-500"
                      />
                      <Icon size={14} />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-4">
                <label className="block text-xs font-semibold text-amber-800 dark:text-amber-200 mb-2">
                  Após o contato, direcionar para
                </label>
                <ProximoBlocoDropdown
                  value={questao.id_proxima_questao_contato ?? ''}
                  outrasQuestoes={questoes
                    .filter((q) => q.id !== questao.id)
                    .map((q) => ({ questao: q, numero: questoes.findIndex((x) => x.id === q.id) + 1 }))}
                  onChange={(v) => onUpdate({ id_proxima_questao_contato: v || null })}
                  mostrarOpcaoFim
                  contatoFinaliza={!!questao.contato_finaliza}
                  onContatoFinalizaChange={(v) => onUpdate({ contato_finaliza: v })}
                />
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                  Se não escolher, segue para o próximo bloco por ordem.
                </p>
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2">
                Use variáveis nas perguntas: <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30">&#123;&#123;nome&#125;&#125;</code>, <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30">&#123;&#123;email&#125;&#125;</code>, <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30">&#123;&#123;whatsapp&#125;&#125;</code>, <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30">&#123;&#123;empresa&#125;&#125;</code>
              </p>
            </div>
          )}
          {questao.tipo_questao === 'resultado' && (
            <div className="p-4 rounded-xl bg-green-50/80 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50 space-y-4">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                <Trophy size={16} />
                Tela de resultado
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                Exibe gráfico de pontuação (0–1000) e texto/botão por nível. Configure abaixo.
              </p>
              {quiz && onSalvarQuiz && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-green-800 dark:text-green-200 mb-1">
                      Pontuação máxima do quiz (para escalar)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={quiz.score_max ?? 1000}
                      onChange={(e) => onSalvarQuiz({ score_max: parseInt(e.target.value, 10) || 1000 })}
                      className="w-full px-3 py-2 rounded-lg border border-green-200 dark:border-green-800 bg-white dark:bg-neutral-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-green-800 dark:text-green-200 mb-1">
                      Total de passos da barra de progresso
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={quiz.passos_totais ?? 12}
                      onChange={(e) => onSalvarQuiz({ passos_totais: parseInt(e.target.value, 10) || 12 })}
                      className="w-full px-3 py-2 rounded-lg border border-green-200 dark:border-green-800 bg-white dark:bg-neutral-800 text-sm"
                    />
                  </div>
                </div>
              )}
              {onSalvarResultado && ([1, 2, 3, 4] as const).map((nivel) => {
                const r = resultados.find((x) => x.nivel === nivel);
                return (
                  <div key={nivel} className="border-t border-green-200 dark:border-green-800 pt-3">
                    <p className="text-xs font-bold text-green-800 dark:text-green-200 mb-2">
                      {NIVEL_LABELS[nivel]}
                    </p>
                    <label className="block text-[10px] text-green-700 dark:text-green-300 mb-1">Título</label>
                    <input
                      type="text"
                      value={r?.titulo ?? ''}
                      onChange={(e) => onSalvarResultado(nivel, { titulo: e.target.value || null })}
                      onBlur={(e) => onSalvarResultado(nivel, { titulo: e.target.value.trim() || null })}
                      placeholder={`Ex: ${nivel === 1 ? 'Precisamos conversar' : nivel === 2 ? 'Podemos melhorar' : nivel === 3 ? 'Você está no caminho' : 'Excelente!'}`}
                      className="w-full px-2 py-1.5 rounded-lg border border-green-200 dark:border-green-800 bg-white dark:bg-neutral-800 text-xs mb-2"
                    />
                    <label className="block text-[10px] text-green-700 dark:text-green-300 mb-1">Texto (opcional)</label>
                    <textarea
                      value={r?.texto ?? ''}
                      onChange={(e) => onSalvarResultado(nivel, { texto: e.target.value || null })}
                      onBlur={(e) => onSalvarResultado(nivel, { texto: e.target.value.trim() || null })}
                      placeholder="Texto completo do resultado"
                      rows={2}
                      className="w-full px-2 py-1.5 rounded-lg border border-green-200 dark:border-green-800 bg-white dark:bg-neutral-800 text-xs mb-2 resize-none"
                    />
                    <label className="block text-[10px] text-green-700 dark:text-green-300 mb-1">Botão de ação</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={r?.botao_texto ?? ''}
                        onChange={(e) => onSalvarResultado(nivel, { botao_texto: e.target.value || null })}
                        onBlur={(e) => onSalvarResultado(nivel, { botao_texto: e.target.value.trim() || null })}
                        placeholder="Texto do botão"
                        className="flex-1 px-2 py-1.5 rounded-lg border border-green-200 dark:border-green-800 bg-white dark:bg-neutral-800 text-xs"
                      />
                      <input
                        type="text"
                        value={r?.botao_url ?? ''}
                        onChange={(e) => onSalvarResultado(nivel, { botao_url: e.target.value || null })}
                        onBlur={(e) => onSalvarResultado(nivel, { botao_url: e.target.value.trim() || null })}
                        placeholder="URL"
                        className="flex-1 px-2 py-1.5 rounded-lg border border-green-200 dark:border-green-800 bg-white dark:bg-neutral-800 text-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {questao.tipo_questao === 'informativo' && (
            <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                <Info size={16} />
                Bloco informativo
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Exibe texto sobre a empresa e disclaimer. Ao clicar em Continuar o visitante aceita os termos.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TipoBlocoDropdownProps {
  value: TipoQuestao;
  onChange: (value: TipoQuestao) => void;
}

function TipoBlocoDropdown({ value, onChange }: TipoBlocoDropdownProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && triggerRef.current && !triggerRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (open) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [open, updatePosition]);

  const tipos = Object.keys(TIPO_LABELS) as TipoQuestao[];
  const dropdownContent = open && typeof document !== 'undefined' ? (
    <div
      ref={ref}
      className="fixed z-[9999] min-w-[220px] max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 shadow-xl shadow-gray-300/80 dark:shadow-black/50 py-1"
      style={{ top: position.top, left: position.left, width: Math.max(position.width, 220) }}
    >
      {tipos.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => {
            onChange(t);
            setOpen(false);
          }}
          className={`w-full px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-gray-100 dark:hover:bg-neutral-800 ${value === t ? 'bg-[#0047FF]/15 dark:bg-[#0047FF]/25 text-[#0047FF] font-medium' : 'text-gray-700 dark:text-gray-300'}`}
        >
          {TIPO_LABELS[t]}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 pl-4 pr-3 py-3 rounded-xl border-2 border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 text-sm font-medium text-left hover:border-gray-300 dark:hover:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-[#0047FF]/50 focus:border-[#0047FF] transition-colors"
      >
        <span className="truncate flex-1">{TIPO_LABELS[value]}</span>
        <ChevronDown size={18} strokeWidth={2.5} className={`shrink-0 text-gray-600 dark:text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {dropdownContent && typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </div>
  );
}

interface ProximoBlocoDropdownProps {
  value: string;
  outrasQuestoes: { questao: Questao; numero: number }[];
  onChange: (value: string | null) => void;
  /** No bloco contato: exibe opção "Enviar e finalizar" e recebe contatoFinaliza */
  mostrarOpcaoFim?: boolean;
  contatoFinaliza?: boolean;
  onContatoFinalizaChange?: (v: boolean) => void;
}

function ProximoBlocoDropdown({ value, outrasQuestoes, onChange, mostrarOpcaoFim, contatoFinaliza, onContatoFinalizaChange }: ProximoBlocoDropdownProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && triggerRef.current && !triggerRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (open) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [open, updatePosition]);

  const selecionado = value ? outrasQuestoes.find(({ questao: oq }) => oq.id === value) : null;
  const label = contatoFinaliza
    ? 'Enviar e finalizar'
    : selecionado
      ? `Bloco ${selecionado.numero}: ${selecionado.questao.titulo}`
      : 'Próximo na ordem';

  const dropdownContent = open && typeof document !== 'undefined' ? (
    <div
      ref={ref}
      className="fixed z-[9999] min-w-[220px] max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 shadow-xl shadow-gray-300/80 dark:shadow-black/50 py-1"
      style={{ top: position.top, left: position.left, width: Math.max(position.width, 220) }}
    >
      {mostrarOpcaoFim && onContatoFinalizaChange && (
        <>
          <button
            type="button"
            onClick={() => {
              onContatoFinalizaChange(true);
              onChange(null);
              setOpen(false);
            }}
            className={`w-full px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-gray-100 dark:hover:bg-neutral-800 ${contatoFinaliza ? 'bg-[#0047FF]/15 dark:bg-[#0047FF]/25 text-[#0047FF] font-medium' : 'text-gray-700 dark:text-gray-300'}`}
          >
            Enviar e finalizar
          </button>
          <div className="my-0.5 border-t border-gray-100 dark:border-neutral-700" />
        </>
      )}
      <button
        type="button"
        onClick={() => {
          mostrarOpcaoFim && onContatoFinalizaChange && onContatoFinalizaChange(false);
          onChange(null);
          setOpen(false);
        }}
        className={`w-full px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-gray-100 dark:hover:bg-neutral-800 ${!value && !contatoFinaliza ? 'bg-[#0047FF]/15 dark:bg-[#0047FF]/25 text-[#0047FF] font-medium' : 'text-gray-700 dark:text-gray-300'}`}
      >
        Próximo na ordem
      </button>
      <div className="my-0.5 border-t border-gray-100 dark:border-neutral-700" />
      {outrasQuestoes.map(({ questao: oq, numero }) => (
        <button
          key={oq.id}
          type="button"
          onClick={() => {
            mostrarOpcaoFim && onContatoFinalizaChange && onContatoFinalizaChange(false);
            onChange(oq.id);
            setOpen(false);
          }}
          className={`w-full px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-gray-100 dark:hover:bg-neutral-800 ${value === oq.id ? 'bg-[#0047FF]/15 dark:bg-[#0047FF]/25 text-[#0047FF] font-medium' : 'text-gray-700 dark:text-gray-300'}`}
        >
          <span className="text-gray-500 dark:text-gray-400 font-medium">Bloco {numero}:</span>{' '}
          {oq.titulo}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="relative">
      <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
        Quando clicar, vai para
      </label>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 pl-2.5 pr-2 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 text-xs text-left hover:border-gray-300 dark:hover:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-[#0047FF]/50 focus:border-[#0047FF] transition-colors"
      >
        <span className="truncate flex-1">{label}</span>
        <ChevronDown size={14} strokeWidth={2.5} className={`shrink-0 text-gray-600 dark:text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {dropdownContent && typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </div>
  );
}

interface BlocoOpcoesEditorProps {
  opcoes: Opcao[];
  questoes: Questao[];
  idQuestaoAtual: string;
  onOpcaoUpdate: (op: Opcao) => void;
  onAddOpcao: () => void;
  onDeleteOpcao: (id: string) => void;
  podeDeletarOpcao: boolean;
}

function BlocoOpcoesEditor({
  opcoes,
  questoes,
  idQuestaoAtual,
  onOpcaoUpdate,
  onAddOpcao,
  onDeleteOpcao,
  podeDeletarOpcao,
}: BlocoOpcoesEditorProps) {
  const outrasQuestoes = questoes
    .filter((q) => q.id !== idQuestaoAtual)
    .map((q) => ({ questao: q, numero: questoes.findIndex((x) => x.id === q.id) + 1 }));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Opções</span>
        <button
          onClick={onAddOpcao}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-[#0047FF] hover:bg-[#0047FF]/10 dark:hover:bg-[#0047FF]/20 transition-colors"
        >
          <Plus size={12} />
          Adicionar
        </button>
      </div>
      <div className="space-y-3">
        {opcoes.map((op, opIdx) => (
            <div
              key={op.id}
              className="p-2.5 rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50/50 dark:bg-neutral-800/50"
            >
              <div className="flex items-start gap-2">
                <div className="w-9 shrink-0">
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Opção
                  </label>
                  <input
                    type="text"
                    value={op.rotulo ?? ''}
                    onChange={(e) => onOpcaoUpdate({ ...op, rotulo: e.target.value || null })}
                    onBlur={() => onOpcaoUpdate(op)}
                    placeholder={String(opIdx + 1)}
                    maxLength={3}
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-[#0047FF]/50"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Texto que o visitante vê
                  </label>
                  <input
                    type="text"
                    value={op.texto}
                    onChange={(e) => onOpcaoUpdate({ ...op, texto: e.target.value })}
                    onBlur={() => onOpcaoUpdate(op)}
                    placeholder="Ex: Quero emagrecer"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0047FF]/50"
                  />
                  <p className="mt-0.5 text-[9px] text-gray-400 dark:text-gray-500">
                    Use &#123;&#123;nome&#125;&#125;, &#123;&#123;email&#125;&#125;, &#123;&#123;whatsapp&#125;&#125;
                  </p>
                </div>
                <div className="flex shrink-0 items-end gap-2">
                  <div className="w-14">
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Pontuação
                    </label>
                    <input
                      type="number"
                      value={op.valor_score}
                      onChange={(e) => onOpcaoUpdate({ ...op, valor_score: parseInt(e.target.value, 10) || 0 })}
                      onBlur={() => onOpcaoUpdate(op)}
                      placeholder="0"
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#0047FF]/50"
                    />
                  </div>
                  <div className="w-[180px]">
                    <ProximoBlocoDropdown
                      value={op.id_proxima_questao ?? ''}
                      outrasQuestoes={outrasQuestoes}
                      onChange={(v) => onOpcaoUpdate({ ...op, id_proxima_questao: v || null })}
                    />
                  </div>
                  {podeDeletarOpcao && (
                    <button
                      onClick={() => onDeleteOpcao(op.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors flex-shrink-0 self-end mb-0.5"
                      title="Excluir opção"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
        ))}
      </div>
    </div>
  );
}

const NIVEL_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: '0–300 (Baixo)',
  2: '301–600 (Regular)',
  3: '601–850 (Bom)',
  4: '851–1000 (Excelente)',
};

interface QuestaoConfigPanelProps {
  questao: Questao;
  numero: number;
  onUpdate: (updates: Partial<Questao>) => void;
  onDeleteQuestao: () => void;
  quiz?: Quiz | null;
  resultados?: QuizResultado[];
  onSalvarResultado?: (nivel: 1 | 2 | 3 | 4, data: Partial<QuizResultado>) => void;
  onSalvarQuiz?: (updates: Partial<Quiz>) => void;
}

function QuestaoConfigPanel({
  questao,
  numero,
  onUpdate,
  onDeleteQuestao,
  quiz,
  resultados = [],
  onSalvarResultado,
  onSalvarQuiz,
}: QuestaoConfigPanelProps) {
  const [tituloLocal, setTituloLocal] = useState(questao.titulo);
  const [subtituloLocal, setSubtituloLocal] = useState(questao.subtitulo ?? '');

  useEffect(() => {
    setTituloLocal(questao.titulo);
    setSubtituloLocal(questao.subtitulo ?? '');
  }, [questao.titulo, questao.subtitulo]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-neutral-700 text-sm font-bold text-gray-600 dark:text-gray-400">
          Bloco {numero}
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-neutral-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors">
            <input
              type="checkbox"
              checked={questao.is_inicial}
              onChange={(e) => onUpdate({ is_inicial: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Inicial</span>
          </label>
          <button
            onClick={onDeleteQuestao}
            className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-950/30 rounded-lg transition-colors"
            title="Excluir bloco"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          Tipo do bloco
        </label>
        <TipoBlocoDropdown
          value={questao.tipo_questao}
          onChange={(t) => onUpdate({
            tipo_questao: t,
            ...(t === 'contato' && !questao.campos_contato ? { campos_contato: ['nome', 'email', 'whatsapp'] } : {}),
          })}
        />
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {TIPO_DESCRICOES[questao.tipo_questao]}
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          {questao.tipo_questao === 'informativo' ? 'Texto de saudação' : 'Nome do bloco'}
        </label>
        <>
          <input
            type="text"
            value={tituloLocal}
            onChange={(e) => setTituloLocal(e.target.value)}
            onBlur={() => onUpdate({ titulo: tituloLocal })}
            placeholder={questao.tipo_questao === 'informativo' ? 'Ex: Olá! Bem-vindo ao nosso quiz.' : 'Ex: Qual é o seu objetivo?'}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0047FF]/50"
          />
          {questao.tipo_questao === 'informativo' && (
            <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
              Use <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-neutral-800">**texto**</code> para negrito.
            </p>
          )}
          {questao.tipo_questao !== 'informativo' && (
            <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
              Variáveis: <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-neutral-800">&#123;&#123;nome&#125;&#125;</code>, <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-neutral-800">&#123;&#123;email&#125;&#125;</code>, <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-neutral-800">&#123;&#123;whatsapp&#125;&#125;</code>, <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-neutral-800">&#123;&#123;empresa&#125;&#125;</code>
            </p>
          )}
        </>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          {questao.tipo_questao === 'informativo' ? 'Segundo texto' : 'Descrição'} <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        {questao.tipo_questao === 'informativo' ? (
          <>
            <textarea
              value={subtituloLocal}
              onChange={(e) => setSubtituloLocal(e.target.value)}
              onBlur={() => onUpdate({ subtitulo: subtituloLocal.trim() || null })}
              placeholder="Ex: Conheça mais sobre nossa empresa e nossos serviços."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0047FF]/50 resize-none"
            />
            <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
              Use <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-neutral-800">**texto**</code> para negrito.
            </p>
          </>
        ) : (
          <input
            type="text"
            value={subtituloLocal}
            onChange={(e) => setSubtituloLocal(e.target.value)}
            onBlur={() => onUpdate({ subtitulo: subtituloLocal || null })}
            placeholder="Texto de apoio que aparece abaixo do título"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0047FF]/50"
          />
        )}
      </div>
    </div>
  );
}
