import { FileText, ShoppingCart, Users } from 'lucide-react';

export interface CreateNewItem {
  id: 'proposta' | 'venda' | 'cliente';
  label: string;
  icon: typeof FileText;
}

export const CREATE_NEW_ITEMS: CreateNewItem[] = [
  { id: 'proposta', label: 'Nova Proposta', icon: FileText },
  { id: 'venda', label: 'Nova Venda', icon: ShoppingCart },
  { id: 'cliente', label: 'Novo Cliente', icon: Users },
];
