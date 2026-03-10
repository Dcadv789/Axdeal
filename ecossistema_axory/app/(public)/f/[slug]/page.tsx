'use client';

import QuizContent from '@/components/crm/QuizContent';

type Props = { params: { slug: string } };

export default function PublicQuizPage({ params }: Props) {
  const slug = params?.slug ?? '';
  return <QuizContent slug={slug} />;
}
