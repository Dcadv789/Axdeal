'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';

interface Company {
  id: string;
  nome_razao_social: string;
}

interface CompanyContextType {
  companyId: string | null;
  companyName: string | null;
  role: UserRole;
  isSuperAdmin: boolean;
  companies: Company[];
  loadingCompanies: boolean;
  setActiveCompany: (id: string) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user, idEmpresa } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>('MEMBER');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  const isSuperAdmin = role === 'SUPER_ADMIN';

  const fetchCompanyName = useCallback(async (id: string) => {
    const { data } = await supabase
      .from('sis_empresas')
      .select('nome_razao_social')
      .eq('id', id)
      .maybeSingle();
    return data?.nome_razao_social ?? 'Empresa';
  }, []);

  useEffect(() => {
    if (!user) {
      setCompanyId(null);
      setCompanyName(null);
      setRole('MEMBER');
      setCompanies([]);
      return;
    }

    const init = async () => {
      const { data: membro } = await supabase
        .from('sis_membros_equipe')
        .select('id_empresa, role')
        .eq('id_usuario', user.id)
        .maybeSingle();

      const userRole: UserRole = (membro?.role as UserRole) ?? 'MEMBER';
      setRole(userRole);

      const activeId = membro?.id_empresa ?? idEmpresa;
      if (activeId) {
        setCompanyId(activeId);
        const name = await fetchCompanyName(activeId);
        setCompanyName(name);
      }

      if (userRole === 'SUPER_ADMIN') {
        setLoadingCompanies(true);
        const { data: allCompanies } = await supabase
          .from('sis_empresas')
          .select('id, nome_razao_social')
          .order('nome_razao_social');
        setCompanies(allCompanies ?? []);
        setLoadingCompanies(false);
      }
    };

    init();
  }, [user, idEmpresa, fetchCompanyName]);

  const setActiveCompany = useCallback(
    async (id: string) => {
      setCompanyId(id);
      const name = await fetchCompanyName(id);
      setCompanyName(name);
    },
    [fetchCompanyName],
  );

  return (
    <CompanyContext.Provider
      value={{
        companyId,
        companyName,
        role,
        isSuperAdmin,
        companies,
        loadingCompanies,
        setActiveCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be used within CompanyProvider');
  return ctx;
}
