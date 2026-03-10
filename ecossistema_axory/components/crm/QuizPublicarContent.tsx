'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  Plus,
  Trash2,
  Code2,
  QrCode,
  Download,
  Link2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface LinkRastreamento {
  id: string;
  nome: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

interface QuizPublicarContentProps {
  quizId: string;
}

const STORAGE_KEY = (quizId: string) => `quiz-tracking-links-${quizId}`;

function buildUrlComUtm(baseUrl: string, link: LinkRastreamento): string {
  const params = new URLSearchParams();
  if (link.utm_source) params.set('utm_source', link.utm_source);
  if (link.utm_medium) params.set('utm_medium', link.utm_medium);
  if (link.utm_campaign) params.set('utm_campaign', link.utm_campaign);
  if (link.utm_content) params.set('utm_content', link.utm_content);
  if (link.utm_term) params.set('utm_term', link.utm_term);
  const qs = params.toString();
  return qs ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${qs}` : baseUrl;
}

export default function QuizPublicarContent({ quizId }: QuizPublicarContentProps) {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<{ slug: string; titulo: string; ativo: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [linksRastreamento, setLinksRastreamento] = useState<LinkRastreamento[]>([]);
  const [mostrarNovoLink, setMostrarNovoLink] = useState(false);
  const [novoLink, setNovoLink] = useState<Partial<LinkRastreamento>>({
    nome: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
    utm_term: '',
  });

  useEffect(() => {
    if (!user || !quizId) return;
    (async () => {
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
        const { data, error: err } = await supabase
          .from('crm_quiz')
          .select('slug, titulo, ativo')
          .eq('id', quizId)
          .eq('id_empresa', memberData.id_empresa)
          .maybeSingle();
        if (err) throw err;
        if (!data) {
          setError('Quiz não encontrado.');
          return;
        }
        setQuiz(data);
      } catch {
        setError('Erro ao carregar quiz.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, quizId]);

  useEffect(() => {
    if (!quizId) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY(quizId));
      if (stored) {
        const parsed = JSON.parse(stored) as LinkRastreamento[];
        setLinksRastreamento(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setLinksRastreamento([]);
    }
  }, [quizId]);

  useEffect(() => {
    if (!quizId || linksRastreamento.length === 0) return;
    localStorage.setItem(STORAGE_KEY(quizId), JSON.stringify(linksRastreamento));
  }, [quizId, linksRastreamento]);

  const publicUrl = typeof window !== 'undefined' && quiz
    ? `${window.location.origin}/f/${quiz.slug}`
    : '';

  const embedCode = publicUrl
    ? `<iframe src="${publicUrl}" width="100%" height="600" frameborder="0" style="border: none; border-radius: 8px;"></iframe>`
    : '';

  const qrCodeUrl = publicUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicUrl)}`
    : '';

  const handleCopyLink = useCallback(async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setError('Não foi possível copiar.');
    }
  }, [publicUrl]);

  const handleCopyCode = useCallback(async () => {
    if (!embedCode) return;
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setError('Não foi possível copiar.');
    }
  }, [embedCode]);

  const handleDownloadQr = useCallback(async () => {
    if (!qrCodeUrl) return;
    try {
      const res = await fetch(qrCodeUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-quiz-${quiz?.slug ?? 'funil'}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Não foi possível baixar o QR Code.');
    }
  }, [qrCodeUrl, quiz?.slug]);

  const handleAddLink = useCallback(() => {
    const nome = (novoLink.nome ?? '').trim() || `Link ${linksRastreamento.length + 1}`;
    const link: LinkRastreamento = {
      id: crypto.randomUUID(),
      nome,
      utm_source: novoLink.utm_source?.trim() || undefined,
      utm_medium: novoLink.utm_medium?.trim() || undefined,
      utm_campaign: novoLink.utm_campaign?.trim() || undefined,
      utm_content: novoLink.utm_content?.trim() || undefined,
      utm_term: novoLink.utm_term?.trim() || undefined,
    };
    setLinksRastreamento((prev) => [...prev, link]);
    setNovoLink({
      nome: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_content: '',
      utm_term: '',
    });
    setMostrarNovoLink(false);
  }, [novoLink, linksRastreamento.length]);

  const handleRemoveLink = useCallback((id: string) => {
    setLinksRastreamento((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const handleCopyTrackingLink = useCallback(
    async (link: LinkRastreamento) => {
      const url = buildUrlComUtm(publicUrl, link);
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        setError('Não foi possível copiar.');
      }
    },
    [publicUrl]
  );

  if (loading) {
    return (
      <div className="py-6 animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="py-6">
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error || 'Quiz não encontrado.'}</p>
        </div>
      </div>
    );
  }

  const cardClass =
    'rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden';

  return (
    <div className="py-6 space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Link do seu Funil */}
      <div className={cardClass}>
        <div className="p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Link do seu Funil
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <input
              type="text"
              readOnly
              value={publicUrl}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/50 text-gray-900 dark:text-gray-100 text-sm font-mono"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
              >
                {copiedLink ? <Check size={18} /> : <Copy size={18} />}
                {copiedLink ? 'Copiado!' : 'Copiar'}
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
              >
                <ExternalLink size={18} />
                Abrir em Nova Aba
              </a>
            </div>
          </div>
          {!quiz.ativo && (
            <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
              O quiz está inativo. Ative-o na aba Editar para que o link funcione.
            </p>
          )}
        </div>
      </div>

      {/* Links de Rastreamento */}
      <div className={cardClass}>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Links de Rastreamento
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Crie links personalizados com parâmetros UTM para rastrear suas campanhas
              </p>
            </div>
            <button
              onClick={() => setMostrarNovoLink(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
            >
              <Plus size={18} />
              Novo Link
            </button>
          </div>

          {mostrarNovoLink && (
            <div className="mt-4 p-4 rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50/50 dark:bg-neutral-800/50 space-y-3">
              <input
                type="text"
                placeholder="Nome do link (ex: Campanha Instagram)"
                value={novoLink.nome ?? ''}
                onChange={(e) => setNovoLink((p) => ({ ...p, nome: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm"
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="utm_source"
                  value={novoLink.utm_source ?? ''}
                  onChange={(e) => setNovoLink((p) => ({ ...p, utm_source: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-mono"
                />
                <input
                  type="text"
                  placeholder="utm_medium"
                  value={novoLink.utm_medium ?? ''}
                  onChange={(e) => setNovoLink((p) => ({ ...p, utm_medium: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-mono"
                />
                <input
                  type="text"
                  placeholder="utm_campaign"
                  value={novoLink.utm_campaign ?? ''}
                  onChange={(e) => setNovoLink((p) => ({ ...p, utm_campaign: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddLink}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Adicionar
                </button>
                <button
                  onClick={() => setMostrarNovoLink(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {linksRastreamento.length === 0 && !mostrarNovoLink ? (
            <div className="mt-6 py-12 flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
              <Link2 size={32} className="mb-2 opacity-50" />
              <p className="text-sm">Nenhum link de rastreamento criado ainda</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {linksRastreamento.map((link) => {
                const urlCompleta = buildUrlComUtm(publicUrl, link);
                return (
                  <li
                    key={link.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50/50 dark:bg-neutral-800/30"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {link.nome}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono">
                        {urlCompleta}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleCopyTrackingLink(link)}
                        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-700"
                        title="Copiar link"
                      >
                        <Copy size={16} />
                      </button>
                      <a
                        href={urlCompleta}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-700"
                        title="Abrir"
                      >
                        <ExternalLink size={16} />
                      </a>
                      <button
                        onClick={() => handleRemoveLink(link.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Incorporar no seu Site + QR Code */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incorporar no seu Site */}
        <div className={cardClass}>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <Code2 size={20} className="text-gray-600 dark:text-gray-400" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Incorporar no seu Site
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Cole este código no HTML da sua página
            </p>
            <textarea
              readOnly
              value={embedCode}
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/50 text-gray-900 dark:text-gray-100 text-xs font-mono resize-none"
            />
            <button
              onClick={handleCopyCode}
              className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 transition-colors"
            >
              {copiedCode ? <Check size={18} /> : <Copy size={18} />}
              {copiedCode ? 'Copiado!' : 'Copiar Código'}
            </button>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Dica: O iframe se adapta automaticamente ao tamanho do container
            </p>
          </div>
        </div>

        {/* QR Code para Impressos */}
        <div className={cardClass}>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <QrCode size={20} className="text-gray-600 dark:text-gray-400" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                QR Code para Impressos
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Perfeito para materiais físicos
            </p>
            <div className="flex flex-col items-center">
              {qrCodeUrl && (
                <img
                  src={qrCodeUrl}
                  alt="QR Code do funil"
                  className="w-40 h-40 rounded-lg border border-gray-200 dark:border-neutral-700"
                />
              )}
              <button
                onClick={handleDownloadQr}
                className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
              >
                <Download size={18} />
                Baixar PNG
              </button>
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Dica: Use o QR Code em cartões de visita, flyers e banners
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
