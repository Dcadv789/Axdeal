import { Card } from '@axdeal/ui';

interface EmptyPageProps {
  title: string;
}

export default function EmptyPage({ title }: EmptyPageProps) {
  return (
    <div className="py-6">
      <Card padding="lg" className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h2>
        <p className="text-gray-500 dark:text-gray-400">Esta página está em desenvolvimento</p>
      </Card>
    </div>
  );
}
