import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Clock } from 'lucide-react';

const steps = [
  { label: 'Analisando o perfil...', time: 0 },
  { label: 'Construindo roteiro SVP...', time: 5000 },
  { label: 'Finalizando scripts...', time: 15000 },
];

const LoadingState = () => {
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(85, (elapsed / 30000) * 85);
      setProgress(p);

      if (elapsed > steps[2].time) setActiveStep(2);
      else if (elapsed > steps[1].time) setActiveStep(1);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-6 card-glow"
    >
      {/* Progress bar */}
      <div className="h-1 w-full bg-muted rounded-pill overflow-hidden mb-6">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-primary-hover rounded-pill animate-progress-glow"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            {i < activeStep ? (
              <Check className="h-4 w-4 text-ok shrink-0" />
            ) : i === activeStep ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
            ) : (
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className={`text-sm font-ui ${
              i <= activeStep ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default LoadingState;
