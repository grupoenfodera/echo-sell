import type { HistoryItem } from '@/types/svp';
import { modalityLabels } from '@/types/svp';
import { Clock } from 'lucide-react';

interface Props {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
}

const HistorySection = ({ items, onSelect }: Props) => {
  if (items.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="text-xs font-ui font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" /> Histórico
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="text-left text-xs bg-card border border-border rounded-lg px-3 py-2 hover:border-primary/30 transition-colors font-ui"
          >
            <span className="text-foreground font-medium">{item.formData.produto}</span>
            <span className="text-muted-foreground ml-1.5">· {item.formData.nicho}</span>
            <span className="text-primary/60 ml-1.5">({modalityLabels[item.modality].split(' ')[0]})</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HistorySection;
