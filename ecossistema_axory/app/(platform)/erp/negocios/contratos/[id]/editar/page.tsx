import ContratoDetalheRoutePage from '../../ContratoDetalheRoutePage';

interface EditarContratoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarContratoPage({ params }: EditarContratoPageProps) {
  const { id } = await params;
  return <ContratoDetalheRoutePage mode="edit" contratoId={id} />;
}
