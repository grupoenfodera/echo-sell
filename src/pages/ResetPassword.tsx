import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const getStrength = (pw: string): { label: string; color: string; width: string } => {
  if (pw.length < 8) return { label: 'fraco', color: 'bg-destructive', width: 'w-1/3' };
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const score = [hasUpper, hasNumber, hasSpecial, pw.length >= 12].filter(Boolean).length;
  if (score >= 3) return { label: 'forte', color: 'bg-accent', width: 'w-full' };
  if (score >= 1) return { label: 'médio', color: 'bg-[hsl(var(--warn))]', width: 'w-2/3' };
  return { label: 'fraco', color: 'bg-destructive', width: 'w-1/3' };
};

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      setReady(true);
    } else {
      // Also check if user has a valid session from recovery link
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setReady(true);
        else navigate('/login');
      });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        toast.success('Senha redefinida com sucesso.');
        await supabase.auth.signOut();
        navigate('/login');
      }
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrength(password);

  if (!ready) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(220_100%_50%/0.08)_0%,transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm px-6"
      >
        <div className="text-center mb-10">
          <h1 className="font-heading font-bold text-2xl tracking-tight text-foreground">
            Criar nova senha
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Nova senha (mín. 8 caracteres)"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                className="h-12 bg-card border-border font-ui pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
                </div>
                <p className="text-[10px] text-muted-foreground font-ui text-right">{strength.label}</p>
              </div>
            )}
          </div>

          <div className="relative">
            <Input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirmar nova senha"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(''); }}
              className="h-12 bg-card border-border font-ui pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Button
            type="submit"
            className="w-full rounded-pill h-11 font-heading font-semibold"
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </Button>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-destructive text-sm text-center font-ui">
              {error}
            </motion.p>
          )}
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
