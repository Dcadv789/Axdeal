import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { isSupabaseConfigured, supabase, supabaseConfigMessage } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  idEmpresa: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [idEmpresa, setIdEmpresa] = useState<string | null>(null);

  const buscarIdEmpresa = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('sis_membros_equipe')
        .select('id_empresa')
        .eq('id_usuario', userId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar id_empresa:', error);
        return null;
      }

      return data?.id_empresa || null;
    } catch (error) {
      console.error('Erro ao buscar id_empresa:', error);
      return null;
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(null);
      setUser(null);
      setIdEmpresa(null);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user?.id) {
        const empresa = await buscarIdEmpresa(session.user.id);
        setIdEmpresa(empresa);
      } else {
        setIdEmpresa(null);
      }

      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user?.id) {
          const empresa = await buscarIdEmpresa(session.user.id);
          setIdEmpresa(empresa);
        } else {
          setIdEmpresa(null);
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sortTooltipDismissed');
    }
  };

  const value = {
    user,
    session,
    loading,
    idEmpresa,
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
