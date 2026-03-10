/** Mapeia tamanho_logo (1-10) para classe Tailwind de altura da logo */
const TAMANHO_CLASSES = [
  'h-6',  // 1
  'h-8',  // 2
  'h-10', // 3
  'h-12', // 4
  'h-14', // 5
  'h-16', // 6
  'h-20', // 7
  'h-24', // 8
  'h-28', // 9
  'h-32', // 10
] as const;

export function getQuizLogoClasse(tamanho: number | null | undefined): string {
  const n = Math.min(10, Math.max(1, tamanho ?? 5));
  return TAMANHO_CLASSES[n - 1] ?? 'h-14';
}
