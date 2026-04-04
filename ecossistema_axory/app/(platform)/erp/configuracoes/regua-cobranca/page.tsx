import { redirect } from 'next/navigation';

export default function ReguaCobrancaRedirect() {
  redirect('/erp/configuracoes?aba=operacoes_regras&tab=regua-cobranca');
}
