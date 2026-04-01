import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const maskedEmail = (e: string) => {
    const [user, domain] = e.split('@');
    if (!domain) return e;
    return user.slice(0, 2) + '***@' + domain;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/redefinir-senha` }
      );

      if (resetError) {
        setError(resetError.message);
      } else {
        setSent(true);
        setCountdown(30);
      }
    } catch {
      setError('Erro ao enviar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      setCountdown(30);
    } catch {
      setError('Erro ao reenviar.');
    } finally {
      setLoading(false);
    }
  };

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
            Recuperar acesso
          </h1>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              className="h-12 bg-card border-border font-ui"
              autoComplete="email"
            />

            <Button
              type="submit"
              className="w-full rounded-pill h-11 font-heading font-semibold"
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </Button>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-destructive text-sm text-center font-ui">
                {error}
              </motion.p>
            )}

            <div className="text-center">
              <Link to="/login" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors font-ui">
                Voltar ao login
              </Link>
            </div>
          </form>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
            <div className="text-accent text-3xl">✓</div>
            <p className="text-foreground font-heading font-semibold">Verifique seu e-mail.</p>
            <p className="text-muted-foreground text-sm font-ui">
              Enviamos um link para <span className="text-foreground">{maskedEmail(email)}</span>.
            </p>
            <p className="text-muted-foreground/60 text-xs font-ui">O link expira em 1 hora.</p>

            {countdown > 0 ? (
              <p className="text-muted-foreground text-xs font-ui">
                Reenviar em <span className="text-foreground font-semibold">{countdown}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={loading}
                className="text-primary text-xs font-ui hover:underline"
              >
                Reenviar
              </button>
            )}

            <div className="pt-4">
              <Link to="/login" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors font-ui">
                Voltar ao login
              </Link>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
