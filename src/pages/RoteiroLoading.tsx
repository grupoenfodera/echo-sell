import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, RotateCcw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { svpApi } from '@/lib/api-svp';
import Header from '@/components/Header';

const MAX_ATTEMPTS = 100; // 100 × 3s = 5 min
const POLL_INTERVAL = 3000;

const TIPS = [
  'Analisando o perfil do decisor...',
  'Construindo a estrutura do roteiro...',
  'Calibrando técnicas de persuasão...',
  'Mapeando objeções previstas...',
  'Gerando scripts personalizados...',
  'Finalizando empilhamento de valor...',
];

export default function RoteiroLoading() {
  const { sessao_id } = useParams<{ sessao_id: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'gerando' | 'erro' | 'timeout'>('gerando');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tipIdx, setTipIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptRef = useRef(0);

  // Rotate tips
  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 4000);
    return () => clearInterval(t);
  }, []);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const poll = useCallback(async () => {
    if (!sessao_id) return;
    attemptRef.current += 1;

    if (attemptRef.current > MAX_ATTEMPTS) {
      stopPolling();
      setStatus('timeout');
      return;
    }

    try {
      const res = await svpApi.roteiroStatus(sessao_id);

      if (res.pronto || res.status === 'pronto') {
        stopPolling();
        navigate(`/roteiro/${sessao_id}`, { replace: true });
        return;
      }

      if (res.status === 'erro') {
        stopPolling();
        setStatus('erro');
        setErrorMsg(res.erro || 'Houve um erro ao gerar o roteiro. Tente novamente.');
        return;
      }
    } catch (err) {
      console.warn('Polling error:', err);
    }
  }, [sessao_id, navigate, stopPolling]);

  useEffect(() => {
    if (!sessao_id) return;
    attemptRef.current = 0;
    setStatus('gerando');
    setErrorMsg(null);

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => stopPolling();
  }, [sessao_id, poll, stopPolling]);

  return (
    <>
      <Header />
      <main className="pt-[70px] min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          {status === 'gerando' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Animated spinner */}
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-heading font-bold text-foreground">
                  Gerando seu roteiro...
                </h2>
                <p className="text-sm text-muted-foreground">
                  O Claude está analisando o perfil do lead e criando scripts personalizados. Isso leva cerca de 60 segundos.
                </p>
              </div>

              {/* Animated tip */}
              <motion.p
                key={tipIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-sm text-primary font-medium"
              >
                {TIPS[tipIdx]}
              </motion.p>

              {/* Indeterminate progress bar */}
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full w-1/3"
                  animate={{ x: ['-100%', '400%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Você pode fechar esta aba — o roteiro ficará salvo no histórico.
              </p>
            </motion.div>
          )}

          {status === 'erro' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-heading font-bold text-foreground">
                  Erro na geração
                </h2>
                <p className="text-sm text-muted-foreground">
                  {errorMsg || 'Houve um erro ao gerar o roteiro. Tente novamente.'}
                </p>
              </div>

              <Button onClick={() => navigate('/gerar', { replace: true })} className="w-full">
                <RotateCcw className="mr-2 h-4 w-4" />
                Tentar novamente
              </Button>
            </motion.div>
          )}

          {status === 'timeout' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-8 w-8 text-amber-500" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-heading font-bold text-foreground">
                  Tempo esgotado
                </h2>
                <p className="text-sm text-muted-foreground">
                  A geração está demorando mais que o esperado. Verifique o histórico em alguns minutos.
                </p>
              </div>

              <Button onClick={() => navigate('/historico')} className="w-full">
                <Clock className="mr-2 h-4 w-4" />
                Ver histórico
              </Button>
            </motion.div>
          )}
        </div>
      </main>
    </>
  );
}
