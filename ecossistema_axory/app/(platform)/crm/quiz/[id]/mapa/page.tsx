'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function QuizMapaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string ?? '';

  useEffect(() => {
    if (id) router.replace(`/crm/quiz/${id}?tab=mapa`);
  }, [id, router]);

  return null;
}
