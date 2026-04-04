import { redirect } from 'next/navigation';

export default function ContasRedirect() {
  redirect('/erp/configuracoes?aba=bancos_contas');
}
