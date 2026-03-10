/** Renderiza texto com suporte a **negrito** (markdown simples) */
export function QuizTextWithBold({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
      )}
    </span>
  );
}
