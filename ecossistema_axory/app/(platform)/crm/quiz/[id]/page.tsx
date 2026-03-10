'use client';

import { Suspense } from 'react';
import QuizTabsPage from '@/components/crm/QuizTabsPage';

type Props = { params: { id: string } };

export default function QuizEditorPage({ params }: Props) {
  const id = params?.id ?? '';
  return (
    <Suspense fallback={<div className="py-6 animate-pulse h-12 w-48 bg-gray-200 dark:bg-gray-700 rounded" />}>
      <QuizTabsPage quizId={id} />
    </Suspense>
  );
}
