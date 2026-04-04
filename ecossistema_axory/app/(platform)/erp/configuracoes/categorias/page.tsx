import { redirect } from 'next/navigation';

export default function CategoriasRedirect() {
  redirect('/erp/configuracoes?aba=estrutura_financeira&tab=categorias-dre');
}
