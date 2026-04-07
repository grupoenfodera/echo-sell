import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

interface UsuarioData {
  id: string;
  nome: string;
  email: string;
  plano: string | null;
  ativo: boolean | null;
  primeiro_acesso: boolean | null;
  consultas_mes: number | null;
  consultas_total: number | null;
  acesso_svp_expira: string | null;
  tipo_acesso: string | null;
  cancelamento_solicitado: boolean | null;
  pagamento_atrasado: boolean | null;
  motivo_bloqueio: string | null;
  scripts_restantes: number | null;
  regeneracoes_restantes: number | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  usuario: UsuarioData | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUsuario: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<UsuarioData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsuario = async (userId: string) => {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setUsuario(data as UsuarioData);
  };

  const refreshUsuario = async () => {
    if (user?.id) await fetchUsuario(user.id);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          // Use setTimeout to avoid Supabase client deadlock
          setTimeout(() => fetchUsuario(newSession.user.id), 0);
        } else {
          setUsuario(null);
        }
        setLoading(false);
      }
    );

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        fetchUsuario(existingSession.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, usuario, loading, signOut, refreshUsuario }}>
      {children}
    </AuthContext.Provider>
  );
};
