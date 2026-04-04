import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { isSupabaseConfigured, supabase, supabaseConfigMessage } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  idEmpresa: string | null;
  companyName: string | null;
  memberName: string | null;
  memberRole: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

interface MemberData {
  idEmpresa: string | null;
  companyName: string | null;
  memberName: string | null;
  memberRole: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const memberCache = new Map<string, MemberData>();
const memberPromiseCache = new Map<string, Promise<MemberData>>();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [idEmpresa, setIdEmpresa] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [memberName, setMemberName] = useState<string | null>(null);
  const [memberRole, setMemberRole] = useState<string | null>(null);

  const buscarMembro = async (userId: string): Promise<MemberData> => {
    const cachedMember = memberCache.get(userId);
    if (cachedMember) return cachedMember;

    const pendingPromise = memberPromiseCache.get(userId);
    if (pendingPromise) return pendingPromise;

    const nextPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('sis_membros_equipe')
        .select('id_empresa, nome_completo, id_cargo, sis_empresas(nome_razao_social)')
        .eq('id_usuario', userId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar membro:', error);
        return { idEmpresa: null, companyName: null, memberName: null, memberRole: null };
      }

      const memberData = {
        idEmpresa: data?.id_empresa || null,
        companyName:
          (data?.sis_empresas as { nome_razao_social?: string | null } | null)?.nome_razao_social || null,
        memberName: data?.nome_completo || null,
        memberRole: data?.id_cargo || null,
      };
      memberCache.set(userId, memberData);
      return memberData;
    } catch (error) {
      console.error('Erro ao buscar membro:', error);
      return { idEmpresa: null, companyName: null, memberName: null, memberRole: null };
    } finally {
      memberPromiseCache.delete(userId);
    }
    })();

    memberPromiseCache.set(userId, nextPromise);
    return nextPromise;
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(null);
      setUser(null);
      setIdEmpresa(null);
      setCompanyName(null);
      setMemberName(null);
      setMemberRole(null);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user?.id) {
        const membro = await buscarMembro(session.user.id);
        setIdEmpresa(membro.idEmpresa);
        setCompanyName(membro.companyName);
        setMemberName(membro.memberName);
        setMemberRole(membro.memberRole);
      } else {
        setIdEmpresa(null);
        setCompanyName(null);
        setMemberName(null);
        setMemberRole(null);
      }

      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user?.id) {
          const membro = await buscarMembro(session.user.id);
          setIdEmpresa(membro.idEmpresa);
          setCompanyName(membro.companyName);
          setMemberName(membro.memberName);
          setMemberRole(membro.memberRole);
        } else {
          setIdEmpresa(null);
          setCompanyName(null);
          setMemberName(null);
          setMemberRole(null);
        }

        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error(supabaseConfigMessage) };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[AuthContext] signIn error:', error.message, error.status);
      } else {
        console.log('[AuthContext] signIn success, user:', data.user?.email);
      }

      return { error };
    } catch (error) {
      console.error('[AuthContext] signIn exception:', error);
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error(supabaseConfigMessage) };
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    idEmpresa,
    companyName,
    memberName,
    memberRole,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
