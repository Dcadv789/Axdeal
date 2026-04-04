import { redirect } from 'next/navigation';

export default function ConfiguracoesPropostaRedirect() {
  redirect('/erp/configuracoes?aba=operacoes_regras&tab=configuracoes-proposta');
}
