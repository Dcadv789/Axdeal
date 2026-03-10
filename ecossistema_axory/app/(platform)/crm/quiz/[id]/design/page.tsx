'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function QuizDesignPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string ?? '';

  useEffect(() => {
    if (id) router.replace(`/crm/quiz/${id}?tab=design`);
  }, [id, router]);

  return null;
}
