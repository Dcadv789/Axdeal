'use client';

export default function PublicFunnelContent({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="text-lg text-gray-700 dark:text-gray-300">
        Rota do Funil Público: {slug || '[slug]'}
      </p>
    </div>
  );
}
