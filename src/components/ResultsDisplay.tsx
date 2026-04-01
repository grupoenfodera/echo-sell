import { useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Copy, FileText, ChevronDown, ChevronUp, Lightbulb, Zap, Mic } from 'lucide-react';
import type { Modality, SvpResult, Phase, Beat } from '@/types/svp';
import { toast } from 'sonner';

interface Props {
  result: SvpResult;
  modality: Modality;
  onReset: () => void;
}

const phaseColors: Record<string, string> = {
  voss: 'border-phase-voss bg-phase-voss/5 text-phase-voss',
  belfort: 'border-phase-belfort bg-phase-belfort/5 text-phase-belfort',
  hybrid: 'border-phase-hybrid bg-phase-hybrid/5 text-phase-hybrid',
  close: 'border-phase-close bg-phase-close/5 text-phase-close',
};

const badgeColors: Record<string, string> = {
  voss: 'bg-phase-voss/15 text-phase-voss border-phase-voss/20',
  belfort: 'bg-phase-belfort/15 text-phase-belfort border-phase-belfort/20',
  hybrid: 'bg-phase-hybrid/15 text-phase-hybrid border-phase-hybrid/20',
  close: 'bg-phase-close/15 text-phase-close border-phase-close/20',
};

// Parse **bold** and [pausa]
const parseScript = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*|\[pausa\])/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-primary font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part === '[pausa]') {
      return <em key={i} className="text-muted-foreground text-sm italic">[pausa]</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
};

// Parse [HL1]...[/HL1] etc
const parseEmail = (text: string) => {
  const parts = text.split(/(\[HL[123]\][\s\S]*?\[\/HL[123]\])/g);
  return parts.map((part, i) => {
    const m = part.match(/\[HL([123])\]([\s\S]*?)\[\/HL[123]\]/);
    if (m) {
      const cls = m[1] === '1' ? 'bg-primary/10 text-primary' : m[1] === '2' ? 'bg-warn/10 text-warn' : 'bg-ok/10 text-ok';
      return <span key={i} className={`${cls} px-1 rounded`}>{m[2]}</span>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
};

const CollapsibleSection = ({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-ui">
        {icon} {label} {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="text-xs text-muted-foreground mt-1.5 pl-5 leading-relaxed font-body">{children}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BeatCard = ({ beat, phaseColor }: { beat: Beat; phaseColor: string }) => (
  <div className="pl-4 border-l-2 border-border py-3 space-y-2">
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`text-[10px] font-ui font-semibold uppercase tracking-wider px-2 py-0.5 rounded-pill border ${badgeColors[phaseColor] || badgeColors.voss}`}>
        {beat.tag}
      </span>
      <span className="text-xs font-heading font-medium text-foreground">{beat.titulo}</span>
    </div>
    <div className="bg-muted/40 rounded-lg p-3.5 font-ui text-[13px] leading-[1.9] text-foreground">
      {parseScript(beat.script)}
    </div>
    {beat.tom && (
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Mic className="h-3 w-3" /> {beat.tom}
      </p>
    )}
    {beat.por_que && <CollapsibleSection label="Por quê" icon={<Lightbulb className="h-3 w-3" />}>{beat.por_que}</CollapsibleSection>}
    {beat.se_cliente_reagir && <CollapsibleSection label="Se o cliente reagir" icon={<Zap className="h-3 w-3" />}>{beat.se_cliente_reagir}</CollapsibleSection>}
  </div>
);

const PhaseCard = ({ phase, defaultOpen }: { phase: Phase; defaultOpen: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  const colorClass = phaseColors[phase.phase_color] || phaseColors.voss;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-xl overflow-hidden ${colorClass} mb-4`}
    >
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 text-left">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-medium opacity-60">F{phase.num}</span>
          <span className="font-heading font-semibold text-sm text-foreground">{phase.titulo}</span>
          <span className="text-[10px] font-ui bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-pill">{phase.tempo}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-4">
              {phase.phase_goal && <p className="text-xs text-muted-foreground font-ui italic">{phase.phase_goal}</p>}
              {phase.beats.map((beat, j) => (
                <BeatCard key={j} beat={beat} phaseColor={phase.phase_color} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const copyRoteiro = (result: SvpResult) => {
  let text = `PERFIL DO DECISOR:\n${result.perfil_decisor}\n\nMAIOR MEDO: ${result.maior_medo}\nTOM IDEAL: ${result.tom_ideal}\nDECISÃO: ${result.decisao}\n\n`;
  result.roteiro.forEach(phase => {
    text += `\n--- FASE ${phase.num}: ${phase.titulo} (${phase.tempo}) ---\n`;
    phase.beats.forEach(beat => {
      text += `\n[${beat.tag}] ${beat.titulo}\n${beat.script.replace(/\*\*/g, '')}\n`;
      if (beat.tom) text += `Tom: ${beat.tom}\n`;
    });
  });
  navigator.clipboard.writeText(text);
  toast.success('Roteiro copiado!');
};

const copyProposta = (result: SvpResult) => {
  if (!result.proposta) return;
  let text = '';
  result.proposta.forEach(s => {
    text += `${s.num}. ${s.titulo}${s.tempo ? ` (${s.tempo})` : ''}\n${s.conteudo}\n\n`;
  });
  navigator.clipboard.writeText(text);
  toast.success('Proposta copiada!');
};

const copyEmail = (result: SvpResult) => {
  const body = result.email.corpo.replace(/\[HL[123]\]/g, '').replace(/\[\/HL[123]\]/g, '');
  navigator.clipboard.writeText(`Assunto: ${result.email.assunto}\n\n${body}`);
  toast.success('E-mail copiado!');
};

const ResultsDisplay = ({ result, modality, onReset }: Props) => {
  const hasProposta = !!result.proposta && result.proposta.length > 0;
  const defaultTab = 'roteiro';

  const handlePrint = () => window.print();

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <Button variant="ghost" onClick={onReset} className="mb-4 text-muted-foreground font-ui text-xs no-print">
        ← Novo roteiro
      </Button>

      {/* Context banner */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6 card-glow print-section">
        <p className="text-sm text-foreground font-body leading-relaxed mb-4">{result.perfil_decisor}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Maior medo', value: result.maior_medo, color: 'text-err' },
            { label: 'Tom ideal', value: result.tom_ideal, color: 'text-info' },
            { label: 'Decisão', value: result.decisao, color: 'text-ok' },
          ].map(item => (
            <div key={item.label} className="bg-muted/30 rounded-lg p-3">
              <span className="text-[10px] font-ui uppercase tracking-wider text-muted-foreground">{item.label}</span>
              <p className={`text-xs font-body mt-1 ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue={defaultTab}>
        <div className="flex items-center justify-between mb-4 no-print">
          <TabsList className="bg-muted/30">
            <TabsTrigger value="roteiro" className="font-ui text-xs">Roteiro</TabsTrigger>
            {hasProposta && <TabsTrigger value="proposta" className="font-ui text-xs">Proposta</TabsTrigger>}
            <TabsTrigger value="email" className="font-ui text-xs">E-mail</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="roteiro" className="print-section">
          <div className="flex gap-2 mb-4 no-print">
            <Button variant="outline" size="sm" onClick={() => copyRoteiro(result)} className="font-ui text-xs gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Copiar texto
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="font-ui text-xs gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Exportar PDF
            </Button>
          </div>
          {result.roteiro.map((phase, i) => (
            <PhaseCard key={phase.num} phase={phase} defaultOpen={i === 0} />
          ))}
        </TabsContent>

        {hasProposta && (
          <TabsContent value="proposta" className="print-section">
            <div className="flex gap-2 mb-4 no-print">
              <Button variant="outline" size="sm" onClick={() => copyProposta(result)} className="font-ui text-xs gap-1.5">
                <Copy className="h-3.5 w-3.5" /> Copiar texto
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="font-ui text-xs gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Exportar PDF
              </Button>
            </div>
            {result.proposta!.map(section => (
              <motion.div
                key={section.num}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-5 mb-4 card-glow"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono text-muted-foreground">S{section.num}</span>
                  <h4 className="font-heading font-semibold text-sm text-foreground">{section.titulo}</h4>
                  {section.tempo && <span className="text-[10px] font-ui bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-pill">{section.tempo}</span>}
                </div>
                <p className="text-sm font-body text-foreground leading-[1.9] whitespace-pre-wrap">{section.conteudo}</p>
              </motion.div>
            ))}
          </TabsContent>
        )}

        <TabsContent value="email">
          <div className="flex gap-2 mb-4 no-print">
            <Button variant="outline" size="sm" onClick={() => copyEmail(result)} className="font-ui text-xs gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Copiar texto
            </Button>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 card-glow">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <span className="text-xs font-ui font-semibold text-muted-foreground">Assunto:</span>
              <span className="text-sm font-body font-medium text-foreground">{result.email.assunto}</span>
            </div>
            <div className="text-sm font-body leading-[1.9] text-foreground whitespace-pre-wrap">
              {parseEmail(result.email.corpo)}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default ResultsDisplay;
