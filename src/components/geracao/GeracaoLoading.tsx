import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, Loader2, Circle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface GeracaoLoadingProps {
  tipo: 'roteiro' | 'proposta';
  faseAtual: number;
}

const FASES: Record<'roteiro' | 'proposta', string[]> = {
  roteiro: [
    'Analisando perfil do cliente...',
    'Construindo estrutura do roteiro...',
    'Finalizando e calculando score...',
  ],
  proposta: [
    'Analisando perfil do cliente...',
    'Gerando roteiro da reunião...',
    'Elaborando proposta comercial...',
    'Criando email e mapeando objeções...',
  ],
};

export default function GeracaoLoading({ tipo, faseAtual }: GeracaoLoadingProps) {
  const fases = FASES[tipo];
  const textoAtual = fases[Math.min(faseAtual, fases.length - 1)];

  return (
    <div className="w-full max-w-[560px] mx-auto">
      <Card className="shadow-md">
        <CardContent className="p-8 flex flex-col items-center gap-6">
          {/* Ícone animado */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="h-10 w-10 text-primary" />
          </motion.div>

          {/* Texto da fase atual */}
          <AnimatePresence mode="wait">
            <motion.p
              key={textoAtual}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="text-base font-medium text-foreground text-center"
            >
              {textoAtual}
            </motion.p>
          </AnimatePresence>

          {/* Lista de fases */}
          <div className="w-full flex flex-col gap-3">
            {fases.map((fase, i) => (
              <div key={i} className="flex items-center gap-3">
                {faseAtual > i ? (
                  <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                ) : faseAtual === i ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />
                )}
                <span
                  className={
                    faseAtual > i
                      ? 'text-sm text-muted-foreground line-through'
                      : faseAtual === i
                        ? 'text-sm text-foreground font-medium'
                        : 'text-sm text-muted-foreground/50'
                  }
                >
                  {fase}
                </span>
              </div>
            ))}
          </div>

          {/* Rodapé */}
          <p className="text-xs text-muted-foreground">
            Isso pode levar alguns instantes...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
