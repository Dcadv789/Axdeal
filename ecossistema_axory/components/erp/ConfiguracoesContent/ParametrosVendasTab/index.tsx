interface ParametrosVendasTabProps {
  onNavigateToCondicoes: () => void;
}

export default function ParametrosVendasTab({ onNavigateToCondicoes }: ParametrosVendasTabProps) {
  return (
    <div className="p-6">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Parâmetros de vendas em desenvolvimento.</p>
      <button
        type="button"
        onClick={onNavigateToCondicoes}
        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        Ver Condições de Pagamento
      </button>
    </div>
  );
}
