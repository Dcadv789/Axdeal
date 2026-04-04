import { redirect } from 'next/navigation';

export default function ParametrosVendasRedirect() {
  redirect('/erp/configuracoes?aba=operacoes_regras&tab=parametros-vendas');
}
