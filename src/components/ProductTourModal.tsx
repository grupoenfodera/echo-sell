import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, FileText, Copy, Star, RotateCcw, Users, Dna, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductTourModalProps {
  onComplete: (action: 'configure' | 'explore') => void;
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

/* ── Slide content components ─────────────────── */

const Slide1 = () => (
  <div className="flex flex-col items-center text-center gap-4">
    <img src="/favicon.svg" alt="SVP" className="w-16 h-16" />
    <h2 className="text-2xl font-bold text-foreground">
      Bem-vindo ao Gerador de Roteiros de Vendas SVP
    </h2>
    <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
      A IA SVP gera scripts de vendas personalizados com base no Método SVP de Thammy Manuella — no seu tom, para o seu nicho.
    </p>
  </div>
);

const etapas = [
  { nome: 'Abertura', cor: 'bg-blue-500' },
  { nome: 'Diagnóstico', cor: 'bg-amber-500' },
  { nome: 'Solução', cor: 'bg-green-500' },
  { nome: 'Objeções', cor: 'bg-orange-500' },
  { nome: 'Fechamento', cor: 'bg-primary' },
];

const Slide2 = () => (
  <div className="flex flex-col items-center text-center gap-4">
    <Zap size={40} className="text-primary" />
    <h2 className="text-xl font-bold text-foreground">Gere roteiros em segundos</h2>
    <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
      Informe o cliente, o produto e o contexto. A IA SVP monta um roteiro completo seguindo o Método SVP.
    </p>
    <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
      {etapas.map((e) => (
        <div key={e.nome} className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm text-foreground">
          <span className={`w-2.5 h-2.5 rounded-full ${e.cor} shrink-0`} />
          {e.nome}
        </div>
      ))}
    </div>
  </div>
);

const funcionalidades = [
  { icon: Copy, titulo: 'Copiar bloco', desc: 'Copie o script do bloco e use direto na reunião' },
  { icon: Star, titulo: 'Avaliar roteiro', desc: 'A IA SVP pontua clareza, tom, objeções e personalização' },
  { icon: FileText, titulo: 'Materiais', desc: 'Gere e-mail de follow-up, proposta comercial e mais' },
  { icon: RotateCcw, titulo: 'Regenerar bloco', desc: 'Não gostou de um trecho? Refaça só aquele bloco' },
];

const Slide3 = () => (
  <div className="flex flex-col items-center text-center gap-4">
    <FileText size={40} className="text-primary" />
    <h2 className="text-xl font-bold text-foreground">Use na reunião, bloco por bloco</h2>
    <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
      Cada roteiro gerado vem com ferramentas para você usar na hora e acompanhar depois.
    </p>
    <div className="flex flex-col gap-3 w-full max-w-sm mt-2 text-left">
      {funcionalidades.map((f) => (
        <div key={f.titulo} className="flex items-start gap-3">
          <f.icon size={18} className="text-primary mt-0.5 shrink-0" />
          <div>
            <span className="text-sm font-semibold text-foreground">{f.titulo}</span>
            <p className="text-xs text-muted-foreground">{f.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const pipelineCols = [
  { titulo: 'Prospecção', cards: ['Tech Solutions', 'Nova Empresa'] },
  { titulo: 'Proposta', cards: ['Agência Digital'] },
  { titulo: 'Fechamento', cards: ['Consultoria XYZ', 'Startup ABC'] },
];

const Slide4 = () => (
  <div className="flex flex-col items-center text-center gap-4">
    <Users size={40} className="text-primary" />
    <h2 className="text-xl font-bold text-foreground">Gerencie seus clientes no CRM</h2>
    <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
      Acompanhe cada oportunidade no pipeline de vendas. Registre interações, evolua o status e acesse o histórico completo.
    </p>
    <div className="grid grid-cols-3 gap-2 w-full max-w-sm mt-2">
      {pipelineCols.map((col) => (
        <div key={col.titulo} className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-center">
            {col.titulo}
          </span>
          {col.cards.map((c) => (
            <div key={c} className="rounded-md border border-border bg-muted/50 px-2 py-1.5 text-[11px] text-foreground text-center truncate">
              {c}
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

const Slide5 = ({ onComplete }: { onComplete: ProductTourModalProps['onComplete'] }) => (
  <div className="flex flex-col items-center text-center gap-4">
    <Dna size={40} className="text-primary" />
    <h2 className="text-xl font-bold text-foreground">Configure seu DNA Comercial</h2>
    <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
      Defina seu tom de voz, nicho e perfil de cliente. Cada roteiro gerado será adaptado automaticamente ao seu estilo de venda.
    </p>
    <div className="flex flex-col items-center gap-3 mt-2 w-full">
      <Button onClick={() => onComplete('configure')} className="w-full max-w-xs">
        Configurar meu DNA agora <ChevronRight size={16} />
      </Button>
      <button
        onClick={() => onComplete('explore')}
        className="text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
      >
        Explorar o app primeiro
      </button>
    </div>
  </div>
);

/* ── Main modal ───────────────────────────────── */

const ProductTourModal = ({ onComplete }: ProductTourModalProps) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const totalSteps = 5;

  const goNext = useCallback(() => {
    if (step < totalSteps - 1) { setDirection(1); setStep((s) => s + 1); }
  }, [step]);

  const goPrev = useCallback(() => {
    if (step > 0) { setDirection(-1); setStep((s) => s - 1); }
  }, [step]);

  const slides = [
    <Slide1 key="s1" />,
    <Slide2 key="s2" />,
    <Slide3 key="s3" />,
    <Slide4 key="s4" />,
    <Slide5 key="s5" onComplete={onComplete} />,
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative bg-card border border-border rounded-2xl max-w-lg w-full mx-4 p-8 shadow-xl">
        {/* Pular tour */}
        <button
          onClick={() => onComplete('configure')}
          className="absolute top-4 right-4 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          Pular tour
        </button>

        {/* Slide content */}
        <div className="min-h-[340px] flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="w-full"
            >
              {slides[step]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Stepper dots */}
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>

        {/* Navigation */}
        {step < totalSteps - 1 && (
          <div className="flex justify-between items-center mt-6">
            <div>
              {step > 0 && (
                <Button variant="ghost" size="sm" onClick={goPrev}>
                  <ChevronLeft size={16} /> Anterior
                </Button>
              )}
            </div>
            <Button size="sm" onClick={step === 0 ? goNext : goNext}>
              {step === 0 ? 'Começar tour' : 'Próximo'} <ChevronRight size={16} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductTourModal;
