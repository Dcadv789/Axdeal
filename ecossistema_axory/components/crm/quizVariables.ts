import type { Opcao } from '@/types/database';

/** Ordena opções por rótulo: A, B, C ou 1, 2, 3 na ordem correta */
export function ordenarOpcoesPorRotulo(opcoes: Opcao[]): Opcao[] {
  return [...opcoes].sort((a, b) => {
    const ra = (a.rotulo ?? '').trim();
    const rb = (b.rotulo ?? '').trim();
    const na = parseFloat(ra);
    const nb = parseFloat(rb);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    if (!Number.isNaN(na)) return -1;
    if (!Number.isNaN(nb)) return 1;
    if (ra && rb) return ra.localeCompare(rb, undefined, { sensitivity: 'base' });
    if (ra) return -1;
    if (rb) return 1;
    const ca = a.criado_em ?? '';
    const cb = b.criado_em ?? '';
    return ca.localeCompare(cb);
  });
}

/** Valida e-mail: deve ter @ e provedor (ex: usuario@provedor.com) */
export function isValidEmail(email: string): boolean {
  const t = email.trim();
  if (!t) return false;
  const atIdx = t.indexOf('@');
  if (atIdx < 1) return false;
  const depois = t.slice(atIdx + 1);
  return depois.includes('.') && depois.length >= 4;
}

/** Valida WhatsApp: exatamente 11 dígitos (DDD + número) */
export function isValidWhatsApp(whatsapp: string): boolean {
  const digits = whatsapp.replace(/\D/g, '');
  return digits.length === 11;
}

/** Extrai apenas os dígitos do WhatsApp */
export function whatsappApenasDigitos(whatsapp: string): string {
  return whatsapp.replace(/\D/g, '');
}

/** Aplica máscara (00) 00000-0000 no WhatsApp */
export function formatarWhatsApp(valor: string): string {
  const digits = valor.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Substitui variáveis {{nome}}, {{email}}, {{whatsapp}} pelo valor real */
export function interpolarVariaveis(
  texto: string,
  vars: { nome?: string; email?: string; whatsapp?: string; empresa?: string }
): string {
  if (!texto) return texto;
  return texto
    .replace(/\{\{nome\}\}/gi, vars.nome?.trim() || '')
    .replace(/\{\{email\}\}/gi, vars.email?.trim() || '')
    .replace(/\{\{whatsapp\}\}/gi, vars.whatsapp?.trim() || '')
    .replace(/\{\{empresa\}\}/gi, vars.empresa?.trim() || '');
}
