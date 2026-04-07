import { useState } from 'react';
import logoSvp from '@/assets/logo-svp.png';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('E-mail ou senha incorretos.');
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      // Check user status
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('ativo, motivo_bloqueio, acesso_svp_expira')
        .eq('id', authData.user.id)
        .single();

      if (usuario && !usuario.ativo) {
        await supabase.auth.signOut();
        const motivo = usuario.motivo_bloqueio;
        if (motivo === 'reembolso' || motivo === 'chargeback') {
          setError('Conta suspensa. Fale com o suporte.');
        } else {
          setError('Conta desativada. Fale com o suporte.');
        }
        setLoading(false);
        return;
      }

      if (usuario?.acesso_svp_expira && new Date(usuario.acesso_svp_expira) < new Date()) {
        await supabase.auth.signOut();
        setError('Seu acesso expirou. Renove sua assinatura.');
        setLoading(false);
        return;
      }

      // Update last access
      await supabase
        .from('usuarios')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('id', authData.user.id);

      navigate('/');
    } catch {
      setError('Erro ao conectar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 60% 40%, #0d2a6b 0%, #071630 55%, #000000 100%)',
      }}
    >
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 70%, #0a1f5c 0%, transparent 60%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm px-6"
      >
        <div className="text-center mb-4">
          <img src={logoSvp} alt="Método SVP" className="h-[300px] mx-auto" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            className="h-12 font-ui border-0 placeholder:text-white/40 text-white"
            style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
            autoComplete="email"
          />
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              className="h-12 font-ui pr-10 border-0 placeholder:text-white/40 text-white"
              style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Button
            type="submit"
            className="w-full rounded-pill h-11 font-heading font-semibold"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-destructive text-sm text-center font-ui"
            >
              {error}
            </motion.p>
          )}

          <div className="text-center">
            <Link
              to="/esqueci-senha"
              className="text-[11px] text-white/50 hover:text-white transition-colors font-ui"
            >
              Esqueci minha senha
            </Link>
          </div>
        </form>

        <p className="text-center text-[10px] text-white/30 mt-8 font-ui">
          Acesso exclusivo para alunos SVP
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
