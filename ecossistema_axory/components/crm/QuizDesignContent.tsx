'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  Palette,
  Image,
  Save,
  Upload,
  Loader2,
  Sun,
  Moon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import QuizPreview from './QuizPreview';
import { getQuizLogoClasse } from './quizLogoUtils';
import type { Quiz, Questao, Opcao, QuizResultado } from '@/types/database';
import { ordenarOpcoesPorRotulo } from './quizVariables';

interface QuizDesignContentProps {
  quizId: string;
  onBackToEditor?: () => void;
}

export default function QuizDesignContent({ quizId, onBackToEditor }: QuizDesignContentProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [resultados, setResultados] = useState<QuizResultado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [nomeEmpresaSlug, setNomeEmpresaSlug] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const slugEmpresa = (nome: string) =>
    nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .toLowerCase()
      .slice(0, 50) || 'empresa';

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
      const { data: empData } = await supabase
        .from('sis_empresas')
        .select('nome_fantasia, nome_razao_social')
        .eq('id', (quizData as { id_empresa: string }).id_empresa)
        .maybeSingle();
      const nomeEmp = (empData as { nome_fantasia?: string; nome_razao_social?: string } | null)?.nome_fantasia
        || (empData as { nome_fantasia?: string; nome_razao_social?: string } | null)?.nome_razao_social
        || 'empresa';
      setNomeEmpresaSlug(slugEmpresa(nomeEmp));

      const q = quizData as Record<string, unknown>;
      setQuiz({
        ...(quizData as Quiz),
        cor_primaria: (q.cor_primaria as string) ?? '#0047FF',
        url_logo: (q.url_logo as string | null) ?? null,
        tema_modo: ((q.tema_modo as 'light' | 'dark') ?? 'light') as 'light' | 'dark',
        tamanho_logo: ((q.tamanho_logo as number) ?? 5) as number,
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

  const handleSalvar = async () => {
    if (!quiz) return;
    setSalvando(true);
    setSalvo(false);
    try {
      const { error: updErr } = await supabase
        .from('crm_quiz')
        .update({
          cor_primaria: quiz.cor_primaria || '#0047FF',
          url_logo: quiz.url_logo || null,
          tema_modo: quiz.tema_modo || 'light',
          tamanho_logo: quiz.tamanho_logo ?? 5,
        })
        .eq('id', quiz.id);

      if (updErr) throw updErr;
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    } catch (err: unknown) {
      console.error('Erro ao salvar:', err);
      setError('Erro ao salvar design.');
    } finally {
      setSalvando(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !quiz) return;
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      setError('Formato inválido. Use PNG, JPG, WebP ou SVG.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 5MB.');
      return;
    }
    setUploadingLogo(true);
    setError(null);
    try {
      // Apagar logo antiga do storage (se for do nosso bucket)
      const urlAntiga = quiz.url_logo;
      if (urlAntiga && urlAntiga.includes('quiz-logos')) {
        const match = urlAntiga.match(/\/quiz-logos\/(.+?)(?:\?|$)/);
        if (match?.[1]) {
          await supabase.storage.from('quiz-logos').remove([match[1]]);
        }
      }

      const ext = file.name.split('.').pop() || 'png';
      const pastaEmpresa = nomeEmpresaSlug || slugEmpresa('empresa');
      const path = `${pastaEmpresa}/${quiz.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error: uploadErr } = await supabase.storage
        .from('quiz-logos')
        .upload(path, file, { upsert: false });

      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('quiz-logos').getPublicUrl(data.path);
      const novaUrl = urlData.publicUrl;
      setQuiz((p) => (p ? { ...p, url_logo: novaUrl } : null));
      const { error: updErr } = await supabase
        .from('crm_quiz')
        .update({ url_logo: novaUrl })
        .eq('id', quiz.id);
      if (updErr) throw updErr;
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    } catch (err: unknown) {
      console.error('Erro ao fazer upload:', err);
      setError('Erro ao enviar logo. Tente novamente.');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-96 w-[600px] bg-gray-200 dark:bg-gray-700 rounded-xl" />
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

  return (
    <div className="py-6 flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-140px)]">
      {/* Painel de opções de design */}
      <div className="lg:w-80 flex-shrink-0">
        <div className="rounded-2xl border-2 border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-6 sticky top-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
            <Palette size={20} style={{ color: quiz.cor_primaria || '#0047FF' }} />
            Design do funil
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            As alterações aparecem na prévia ao lado em tempo real.
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tema do funil
              </label>
              <div className="flex items-center gap-2 p-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/50">
                <button
                  type="button"
                  onClick={() => setQuiz((p) => (p ? { ...p, tema_modo: 'light' as const } : null))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    (quiz.tema_modo || 'light') === 'light'
                      ? 'bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-neutral-700/50'
                  }`}
                >
                  <Sun size={18} />
                  Claro
                </button>
                <button
                  type="button"
                  onClick={() => setQuiz((p) => (p ? { ...p, tema_modo: 'dark' as const } : null))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    quiz.tema_modo === 'dark'
                      ? 'bg-neutral-800 dark:bg-neutral-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
                  }`}
                >
                  <Moon size={18} />
                  Escuro
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cor primária
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={quiz.cor_primaria || '#0047FF'}
                  onChange={(e) =>
                    setQuiz((p) => (p ? { ...p, cor_primaria: e.target.value } : null))
                  }
                  className="w-12 h-12 rounded-xl border-2 border-gray-200 dark:border-neutral-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={quiz.cor_primaria || '#0047FF'}
                  onChange={(e) =>
                    setQuiz((p) => (p ? { ...p, cor_primaria: e.target.value } : null))
                  }
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Image size={18} />
                Logo do funil
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                onChange={handleUploadLogo}
                className="hidden"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-800/50 text-gray-700 dark:text-gray-300 hover:border-[#0047FF] hover:bg-[#0047FF]/5 dark:hover:bg-[#0047FF]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {uploadingLogo ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Upload da logo
                    </>
                  )}
                </button>
              </div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                PNG, JPG, WebP ou SVG — máx. 5MB
              </label>
              <input
                type="url"
                value={quiz.url_logo || ''}
                onChange={(e) =>
                  setQuiz((p) => (p ? { ...p, url_logo: e.target.value || null } : null))
                }
                placeholder="Ou cole a URL da logo"
                className="mt-2 w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 text-sm"
              />
              {quiz.url_logo && (
                <div className="mt-2 p-3 rounded-xl bg-gray-50 dark:bg-neutral-800/50 border border-gray-200 dark:border-neutral-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Prévia da logo:</p>
                  <img
                    src={quiz.url_logo}
                    alt="Logo"
                    className={`${getQuizLogoClasse(quiz.tamanho_logo)} object-contain max-w-full`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Tamanho da logo
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={quiz.tamanho_logo ?? 5}
                    onChange={(e) =>
                      setQuiz((p) =>
                        p ? { ...p, tamanho_logo: parseInt(e.target.value, 10) } : null
                      )
                    }
                    className="flex-1 h-2 rounded-lg appearance-none bg-gray-200 dark:bg-neutral-700 accent-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-8">
                    {quiz.tamanho_logo ?? 5}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  1 = menor, 10 = maior
                </p>
              </div>
            </div>

            <button
              onClick={handleSalvar}
              disabled={salvando}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: quiz.cor_primaria || '#0047FF' }}
            >
              <Save size={18} />
              {salvando ? 'Salvando...' : salvo ? 'Salvo!' : 'Salvar design'}
            </button>
          </div>
        </div>
      </div>

      {/* Funil em tela cheia - centro */}
      <div className="flex-1 flex flex-col items-center justify-start min-w-0">
        <div className="w-full max-w-2xl">
          <div className="rounded-2xl border-2 border-gray-200 dark:border-neutral-800 bg-gray-100 dark:bg-neutral-950 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Prévia do funil — teste clicando nas opções
              </p>
              {onBackToEditor ? (
                <button
                  onClick={onBackToEditor}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
                >
                  <ArrowLeft size={16} />
                  Voltar ao editor
                </button>
              ) : (
                <Link
                  href={`/crm/quiz/${quizId}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
                >
                  <ArrowLeft size={16} />
                  Voltar ao editor
                </Link>
              )}
            </div>
            <div className="min-h-[500px] flex items-center justify-center p-6">
              <div className="w-full max-w-lg">
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
      </div>
    </div>
  );
}
