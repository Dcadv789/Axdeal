'use client';

import { useParams } from 'next/navigation';
import CrmPlaybookEditorContent from '@/components/crm/CrmPlaybookEditorContent';

export default function CrmConfiguracaoPlaybookPage() {
  const params = useParams<{ id: string }>();
  const playbookId = params?.id || '';

  return <CrmPlaybookEditorContent playbookId={playbookId} />;
}
