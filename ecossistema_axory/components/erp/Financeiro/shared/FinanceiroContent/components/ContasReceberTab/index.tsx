interface ContasReceberTabProps {
  parcelas: any[];
  carregando: boolean;
}

export default function ContasReceberTab({ parcelas, carregando }: ContasReceberTabProps) {
  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Contas a receber em desenvolvimento. {parcelas.length} parcelas carregadas.
      </p>
    </div>
  );
}
