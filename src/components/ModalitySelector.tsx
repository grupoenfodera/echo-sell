import { motion } from 'framer-motion';
import type { Modality } from '@/types/svp';

interface Props {
  selected: Modality | null;
  onSelect: (m: Modality) => void;
}

const modalities: { id: Modality; icon: string; title: string; sub: string }[] = [
  { id: 'm1', icon: '🎯', title: 'Diagnóstico + Fechamento', sub: 'Script completo com objeções e proposta' },
  { id: 'm2a', icon: '🔍', title: 'Primeiro Contato', sub: 'Descoberta — sem preço, sem proposta' },
  { id: 'm2b', icon: '📋', title: 'Reunião de Proposta', sub: 'Apresentação Primeiro Contato' },
];

const ModalitySelector = ({ selected, onSelect }: Props) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {modalities.map((m, i) => (
        <motion.button
          key={m.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          onClick={() => onSelect(m.id)}
          className={`p-5 rounded-xl border text-left transition-all duration-200 ${
            selected === m.id
              ? 'border-primary card-glow-active bg-primary/5'
              : 'border-border card-glow bg-card hover:border-primary/30'
          }`}
        >
          <span className="text-2xl mb-3 block">{m.icon}</span>
          <h3 className="font-heading font-semibold text-sm text-foreground mb-1">{m.title}</h3>
          <p className="text-xs text-muted-foreground font-body leading-relaxed">{m.sub}</p>
        </motion.button>
      ))}
    </div>
  );
};

export default ModalitySelector;
