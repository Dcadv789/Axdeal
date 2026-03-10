import { Home, Briefcase, DollarSign, Users, Settings, Moon, HelpCircle } from 'lucide-react';
import { MenuItem } from '../types';

export const MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', label: 'Início', icon: Home },
  { id: 'negocios', label: 'Negócios', icon: Briefcase },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'clientes', label: 'Clientes', icon: Users },
];

export const SYSTEM_ITEMS: MenuItem[] = [
  { id: 'config', label: 'Configurações', icon: Settings },
  { id: 'support', label: 'Suporte', icon: HelpCircle },
  { id: 'dark', label: 'Modo Escuro', icon: Moon },
];
