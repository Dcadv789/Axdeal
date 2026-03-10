'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle, Plus, Edit2, ExternalLink, AlertCircle, LayoutGrid, Copy, Check } from 'lucide-react';
import PageTitle from '@/components/ui/PageTitle';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Quiz } from '@/types/database';

export default function QuizListContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [idEmpresa, setIdEmpresa] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  useEffect(() => {
    if (user) carregar();
  }, [user]);

  const carregar = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: memberData } = await supabase
        .from('sis_membros_equipe')
        .select('id_empresa')
        .eq('id_usuario', user?.id)
        .maybeSingle();

      if (!memberData) {
        setError('Empresa não encontrada.');
        return;
      }

      setIdEmpresa(memberData.id_empresa);

      const { data, error: fetchError } = await supabase
        .from('crm_quiz')
        .select('*')
        .eq('id_empresa', memberData.id_empresa)
        .order('criado_em', { ascending: false });

      if (fetchError) throw fetchError;
      setQuizzes((data || []) as Quiz[]);
    } catch (err: unknown) {
      console.error('Erro ao carregar quizzes:', err);
      setError('Erro ao carregar quizzes.');
    } finally {
      setLoading(false);
    }
  };

  const handleNovoQuiz = async () => {
    if (!idEmpresa) return;
    setCriando(true);
    try {
      const slug = `quiz-${Date.now()}`;
      const { data, error: insertError } = await supabase
        .from('crm_quiz')
        .insert({
          id_empresa: idEmpresa,
          titulo: 'Novo Quiz',
          slug,
          ativo: false,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      if (data?.id) router.push(`/crm/quiz/${data.id}`);
    } catch (err: unknown) {
      console.error('Erro ao criar quiz:', err);
      setError('Erro ao criar quiz.');
    } finally {
      setCriando(false);
    }
  };

  const urlPublica = (slug: string) =>
    typeof window !== 'undefined' ? `${window.location.origin}/f/${slug}` : `/f/${slug}`;

  const handleCopiarLink = async (slug: string) => {
    const url = urlPublica(slug);
    await navigator.clipboard.writeText(url);
    setCopiadoId(slug);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const handleToggleAtivo = async (quiz: Quiz) => {
    try {
      const { error: updErr } = await supabase
        .from('crm_quiz')
        .update({ ativo: !quiz.ativo })
        .eq('id', quiz.id);
      if (updErr) throw updErr;
      setQuizzes((prev) => prev.map((q) => (q.id === quiz.id ? { ...q, ativo: !q.ativo } : q)));
    } catch (err: unknown) {
      console.error('Erro ao atualizar quiz:', err);
      setError('Erro ao atualizar status.');
    }
  };

  if (loading) {
    return (
      <div className="py-6 space-y-6 w-full">
        <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6 w-full">
      <PageTitle
        icon={<HelpCircle size={28} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />}
        title="Quiz Interativo"
        rightContent={
          <button
            onClick={handleNovoQuiz}
            disabled={criando}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#0047FF' }}
          >
            <Plus size={18} />
            Novo Quiz
          </button>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {quizzes.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-12 text-center">
          <HelpCircle size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Nenhum quiz cadastrado
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Crie um quiz interativo para capturar leads e qualificar visitantes
          </p>
          <button
            onClick={handleNovoQuiz}
            disabled={criando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
            style={{ backgroundColor: '#0047FF' }}
          >
            <Plus size={18} />
            Criar Primeiro Quiz
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="group rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden hover:shadow-md hover:border-gray-300 dark:hover:border-neutral-600 transition-all duration-200"
            >
              <div className="p-5 flex gap-4">
                {/* Ícone / Logo */}
                <div
                  className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: (quiz.cor_primaria || '#0047FF') + '20',
                    border: `2px solid ${(quiz.cor_primaria || '#0047FF')}40`,
                  }}
                >
                  {quiz.url_logo ? (
                    <img
                      src={quiz.url_logo}
                      alt=""
                      className="w-10 h-10 object-contain"
                    />
                  ) : (
                    <LayoutGrid size={26} style={{ color: quiz.cor_primaria || '#0047FF' }} />
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {quiz.titulo}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <code className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded font-mono">
                      /f/{quiz.slug}
                    </code>
                    <button
                      onClick={() => handleCopiarLink(quiz.slug)}
                      className="p-1 text-gray-400 hover:text-[#0047FF] dark:hover:text-blue-400 rounded transition-colors"
                      title="Copiar link"
                    >
                      {copiadoId === quiz.slug ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Barra inferior com ações e toggle */}
              <div className="px-5 py-3 bg-gray-50/80 dark:bg-neutral-800/50 border-t border-gray-100 dark:border-neutral-700/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={quiz.ativo}
                    onClick={() => handleToggleAtivo(quiz)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0047FF]/50 focus:ring-offset-2 ${
                      quiz.ativo
                        ? 'bg-emerald-500 dark:bg-emerald-600'
                        : 'bg-gray-300 dark:bg-neutral-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                        quiz.ativo ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {quiz.ativo ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Ativo</span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-500">Inativo</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={urlPublica(quiz.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-[#0047FF] dark:hover:text-blue-400 rounded-lg hover:bg-[#0047FF]/10 dark:hover:bg-[#0047FF]/20 transition-colors"
                    title="Abrir quiz público"
                  >
                    <ExternalLink size={14} />
                    Abrir
                  </a>
                  <button
                    onClick={() => router.push(`/crm/quiz/${quiz.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors"
                    style={{ backgroundColor: quiz.cor_primaria || '#0047FF' }}
                  >
                    <Edit2 size={14} />
                    Editar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
