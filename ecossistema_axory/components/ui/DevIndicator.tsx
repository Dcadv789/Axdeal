'use client';

/**
 * Indicador visual em desenvolvimento: mostra que o app está rodando em Next.js.
 * Só aparece quando NODE_ENV === 'development'. Não é exibido em produção.
 */
export default function DevIndicator() {
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-white dark:text-black"
      title="Next.js (modo desenvolvimento)"
      aria-hidden
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      Next.js
    </div>
  );
}
