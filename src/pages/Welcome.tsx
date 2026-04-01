import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const Welcome = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const firstName = usuario?.nome?.split(' ')[0] || '';

  const handleConfigure = () => {
    navigate('/onboarding');
  };

  const handleSkip = async () => {
    if (usuario?.id) {
      await supabase
        .from('usuarios')
        .update({ primeiro_acesso: false })
        .eq('id', usuario.id);
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(220_100%_50%/0.08)_0%,transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md px-6 text-center"
      >
        <h1 className="font-heading font-normal text-[28px] text-foreground">
          Bem-vindo ao SVP{firstName ? `, ${firstName}` : ''}
        </h1>

        <p className="font-body text-[13px] text-muted-foreground mt-4 leading-relaxed">
          Configure seu perfil comercial em 3 minutos
          e os scripts serão gerados no seu estilo de venda.
        </p>

        <div className="mt-10 space-y-3">
          <Button
            onClick={handleConfigure}
            className="w-full max-w-xs mx-auto rounded-pill h-11 font-heading font-semibold"
          >
            Configurar meu perfil
          </Button>

          <button
            onClick={handleSkip}
            className="block mx-auto text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors font-ui"
          >
            Fazer isso depois
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Welcome;
