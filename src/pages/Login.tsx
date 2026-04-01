import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

const PASSWORD = 'svp2025';

const Login = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === PASSWORD) {
      sessionStorage.setItem('svp-auth', '1');
      navigate('/');
    } else {
      setError('Senha incorreta. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Radial gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(220_100%_50%/0.08)_0%,transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm px-6"
      >
        <div className="text-center mb-10">
          <h1 className="font-heading font-bold text-3xl tracking-tight text-foreground">SVP</h1>
          <p className="font-heading font-normal text-xl text-muted-foreground mt-2">
            Sistema de Vendas Persuasivas
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Digite a senha"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            className="text-center tracking-widest h-12 bg-card border-border font-ui"
          />
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-err text-sm text-center font-ui"
            >
              {error}
            </motion.p>
          )}
          <Button type="submit" className="w-full rounded-pill h-11 font-heading font-semibold">
            Entrar
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
