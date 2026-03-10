import { redirect } from 'next/navigation';

export default function ConfiguracaoPlaybookLegacyPage({ params }: { params: { id: string } }) {
  redirect(`/crm/configuracoes/playbooks/${params.id}`);
}
