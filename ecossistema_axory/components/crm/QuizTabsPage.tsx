'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pencil, Paintbrush, GitBranch, Share2, HelpCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import QuizEditorContent from './QuizEditorContent';
import QuizDesignContent from './QuizDesignContent';
import QuizMapaContent from './QuizMapaContent';
import QuizPublicarContent from './QuizPublicarContent';

export type QuizTab = 'editar' | 'design' | 'mapa' | 'publicar';

const TAB_CONFIG: { id: QuizTab; label: string; icon: typeof Pencil }[] = [
  { id: 'editar', label: 'Editar', icon: Pencil },
  { id: 'design', label: 'Design', icon: Paintbrush },
  { id: 'mapa', label: 'Ver mapa', icon: GitBranch },
  { id: 'publicar', label: 'Publicar', icon: Share2 },
];

interface QuizTabsPageProps {
  quizId: string;
}

export default function QuizTabsPage({ quizId }: QuizTabsPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<QuizTab>('editar');
  const [titulo, setTitulo] = useState<string>('');

  useEffect(() => {
    const tab = searchParams?.get('tab') as QuizTab | null;
    if (tab && TAB_CONFIG.some((t) => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user || !quizId) return;
    (async () => {
      const { data: memberData } = await supabase
        .from('sis_membros_equipe')
        .select('id_empresa')
        .eq('id_usuario', user.id)
        .maybeSingle();
      if (!memberData) return;
      const { data } = await supabase
        .from('crm_quiz')
        .select('titulo')
        .eq('id', quizId)
        .eq('id_empresa', memberData.id_empresa)
        .maybeSingle();
      if (data) setTitulo(data.titulo || '');
    })();
  }, [user, quizId]);

  const handleTabChange = (tab: QuizTab) => {
    setActiveTab(tab);
    router.replace(`/crm/quiz/${quizId}?tab=${tab}`, { scroll: false });
  };

  const handleTituloChange = (novo: string) => {
    setTitulo(novo);
  };

  const handleTituloSave = async (novo: string) => {
    if (!user || !quizId || novo === titulo) return;
    const { data: memberData } = await supabase.from('sis_membros_equipe').select('id_empresa').eq('id_usuario', user.id).maybeSingle();
    if (!memberData) return;
    await supabase.from('crm_quiz').update({ titulo: novo }).eq('id', quizId).eq('id_empresa', memberData.id_empresa);
    setTitulo(novo);
  };

  return (
    <div className="py-6 space-y-6">
      {/* Título da página - acima das tabs (igual erp/financeiro) */}
      <div className="flex items-center gap-2">
        <HelpCircle size={28} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <input
          type="text"
          value={titulo || ''}
          onChange={(e) => setTitulo(e.target.value)}
          onBlur={(e) => handleTituloSave(e.target.value.trim() || 'Quiz')}
          placeholder="Nome do quiz"
          className="text-2xl font-bold text-gray-900 dark:text-gray-100 bg-transparent border-none focus:outline-none focus:ring-0 px-0 min-w-[200px] placeholder:text-gray-400"
        />
      </div>

      {/* Tabs - linha cinza em toda largura, azul só na aba ativa */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6 -mb-px">
          {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={`relative pb-3 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === id
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={16} />
              {label}
              {activeTab === id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Conteúdo das Tabs - Caminho do Quiz fica diretamente abaixo das tabs (dentro do Editar) */}
      {activeTab === 'editar' && (
        <QuizEditorContent
          quizId={quizId}
          tabMode
          tituloExterno={titulo}
          onTituloChange={handleTituloChange}
        />
      )}
      {activeTab === 'design' && <QuizDesignContent quizId={quizId} onBackToEditor={() => handleTabChange('editar')} />}
      {activeTab === 'mapa' && <QuizMapaContent quizId={quizId} onBackToEditor={() => handleTabChange('editar')} />}
      {activeTab === 'publicar' && <QuizPublicarContent quizId={quizId} />}
    </div>
  );
}
