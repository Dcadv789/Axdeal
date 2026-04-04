'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ErpVisualizarPropostaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  useEffect(() => {
    if (id) {
      router.replace(`/erp/negocios/propostas/${id}/editar`);
    }
  }, [id, router]);

  return null;
}
