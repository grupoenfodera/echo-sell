import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TONES = [
  {
    id: 'consultivo',
    name: 'Consultivo',
    icon: '🔵',
    color: '#0055FF',
    desc: 'Faz perguntas antes de responder. Nunca pressiona.',
    example: 'Entendo. Me conta — quando você diz caro, está comparando com alguma outra opção que já viu, ou é mais uma questão de momento?',
  },
  {
    id: 'direto',
    name: 'Direto',
    icon: '🟡',
    color: '#F59E0B',
    desc: 'Vai ao ponto, sem rodeios. Confiante e objetivo.',
    example: 'Faz sentido. Deixa eu te mostrar o que está incluído — aí você decide se faz sentido ou não.',
  },
  {
    id: 'relacional',
    name: 'Relacional',
    icon: '🟢',
    color: '#22C55E',
    desc: 'Cria conexão emocional. Usa história e proximidade.',
    example: 'Eu ouço isso bastante. Sabe o que a maioria dos meus clientes me fala depois? Que o maior custo foi esperar.',
  },
  {
    id: 'tecnico',
    name: 'Técnico',
    icon: '🟣',
    color: '#8B5CF6',
    desc: 'Usa dados e lógica. Para o cliente racional.',
    example: 'Comparando com o mercado para esse serviço, você está dentro da faixa. O que justifica é o resultado em [X].',
  },
  {
    id: 'svp_puro',
    name: 'SVP Puro',
    icon: '⚪',
    color: 'hsl(var(--muted-foreground))',
    desc: 'Segue o método SVP à risca, sem adaptação de tom.',
    example: 'Script padrão SVP — estrutura completa sem sobreposição de estilo pessoal.',
  },
];

const CONTEXTOS = [
  { id: 'B2C', label: 'Pessoa física (B2C)' },
  { id: 'B2B', label: 'Empresa / CNPJ (B2B)' },
  { id: 'Ambos', label: 'Os dois' },
];

const TICKETS = [
  { id: 'ate_1k', label: 'Até R$ 1.000' },
  { id: '1k_5k', label: 'R$ 1k – R$ 5k' },
  { id: '5k_20k', label: 'R$ 5k – R$ 20k' },
  { id: 'mais_20k', label: '+ R$ 20k' },
];

const TICKET_DISPLAY: Record<string, string> = {
  'ate_1k': 'Até R$ 1.000',
  '1k_5k': 'R$ 1.000 – R$ 5.000',
  '5k_20k': 'R$ 5.000 – R$ 20.000',
  'mais_20k': 'Acima de R$ 20.000',
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { usuario, refreshUsuario } = useAuth();
  const [step, setStep] = useState(1);
  const [primary, setPrimary] = useState<string | null>(null);
  const [secondary, setSecondary] = useState<string | null>(null);
  const [weight, setWeight] = useState(70);
  const [contexto, setContexto] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);
  const [nicho, setNicho] = useState('');
  const [saving, setSaving] = useState(false);

  const handleToneClick = (id: string) => {
    if (primary === id) {
      setPrimary(secondary);
      setSecondary(null);
    } else if (secondary === id) {
      setSecondary(null);
    } else if (!primary) {
      setPrimary(id);
    } else if (!secondary) {
      setSecondary(id);
    } else {
      setSecondary(id);
    }
  };

  const getBadge = (id: string) => {
    if (primary === id) return 'Principal';
    if (secondary === id) return 'Secundário';
    return null;
  };

  const canNext1 = !!primary;
  const canNext2 = !!contexto && !!ticket && nicho.trim().length > 0;

  const handleSave = async () => {
    if (!usuario?.id || !primary) return;
    setSaving(true);

    try {
      // Generate bloco_injetado via edge function
      const { data: dnaData, error: dnaError } = await supabase.functions.invoke('gerar-dna', {
        body: {
          tom_primario: primary,
          tom_secundario: secondary,
          peso_secundario: secondary ? (100 - weight) : null,
          contexto,
          ticket_medio: TICKET_DISPLAY[ticket!] || ticket,
          nicho_principal: nicho.trim(),
        },
      });

      if (dnaError) throw new Error(dnaError.message);

      // Upsert usuario_dna
      const dnaPayload = {
        usuario_id: usuario.id,
        tom_primario: primary,
        tom_secundario: secondary || null,
        peso_secundario: secondary ? (100 - weight) : null,
        contexto,
        ticket_medio: TICKET_DISPLAY[ticket!] || ticket,
        nicho_principal: nicho.trim(),
        bloco_injetado: dnaData?.bloco_injetado || null,
        atualizado_em: new Date().toISOString(),
      };

      // Check if exists
      const { data: existing } = await supabase
        .from('usuario_dna')
        .select('id')
        .eq('usuario_id', usuario.id)
        .maybeSingle();

      if (existing) {
        await supabase.from('usuario_dna').update(dnaPayload).eq('usuario_id', usuario.id);
      } else {
        await supabase.from('usuario_dna').insert(dnaPayload);
      }

      // Update primeiro_acesso
      await supabase.from('usuarios').update({ primeiro_acesso: false }).eq('id', usuario.id);
      await refreshUsuario();

      toast.success('DNA Comercial configurado!');
      navigate('/');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao salvar DNA.');
    } finally {
      setSaving(false);
    }
  };

  const primaryTone = TONES.find(t => t.id === primary);
  const secondaryTone = TONES.find(t => t.id === secondary);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(220_100%_50%/0.08)_0%,transparent_70%)]" />

      <div className="relative z-10 max-w-[720px] mx-auto px-4 sm:px-6 py-10">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-ui font-bold transition-colors ${
                s === step ? 'bg-primary text-primary-foreground' : s < step ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {s}
              </div>
              <span className={`text-xs font-ui hidden sm:inline ${s === step ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s === 1 ? 'Tom de voz' : s === 2 ? 'Contexto' : 'Confirmação'}
              </span>
              {s < 3 && <div className={`w-8 h-px ${s < step ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <h2 className="font-heading text-2xl text-foreground text-center">Como você vende?</h2>
              <p className="font-body text-sm text-muted-foreground text-center mt-2 mb-6 max-w-lg mx-auto">
                Veja como cada estilo responderia à mesma objeção e escolha o que mais combina com você.
              </p>

              {/* Objection box */}
              <div className="bg-section border border-border rounded-md p-4 mb-6">
                <p className="text-sm font-ui text-muted-foreground">
                  <span className="mr-2">💬</span>O cliente diz:
                </p>
                <p className="text-sm font-body text-foreground mt-1 italic">
                  "Tá, mas está um pouco caro pra mim agora."
                </p>
              </div>

              {/* Tone cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TONES.map(tone => {
                  const badge = getBadge(tone.id);
                  const isSelected = !!badge;
                  return (
                    <button
                      key={tone.id}
                      onClick={() => handleToneClick(tone.id)}
                      className={`relative text-left p-4 rounded-xl border-2 transition-all bg-card ${
                        isSelected
                          ? 'shadow-lg'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                      style={isSelected ? { borderColor: tone.color, boxShadow: `0 0 20px -5px ${tone.color}33` } : {}}
                    >
                      {badge && (
                        <span className={`absolute top-2 right-2 text-[10px] font-ui font-semibold px-2 py-0.5 rounded-pill ${
                          badge === 'Principal' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {badge}
                        </span>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{tone.icon}</span>
                        <span className="font-heading font-semibold text-sm text-foreground">{tone.name}</span>
                      </div>
                      <p className="text-xs font-body text-muted-foreground mb-2">{tone.desc}</p>
                      <p className="text-xs font-body text-foreground/80 italic leading-relaxed">"{tone.example}"</p>
                    </button>
                  );
                })}
              </div>

              {/* Weight slider */}
              {primary && secondary && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 bg-card border border-border rounded-xl p-4">
                  <div className="flex justify-between text-xs font-ui text-muted-foreground mb-3">
                    <span>{primaryTone?.icon} {primaryTone?.name} {weight}%</span>
                    <span>{secondaryTone?.icon} {secondaryTone?.name} {100 - weight}%</span>
                  </div>
                  <Slider
                    value={[weight]}
                    onValueChange={v => setWeight(v[0])}
                    min={60}
                    max={90}
                    step={5}
                  />
                </motion.div>
              )}

              <div className="mt-8 flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!canNext1} className="rounded-pill px-8">
                  Próximo →
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <h2 className="font-heading text-2xl text-foreground text-center">Para quem você vende?</h2>

              {/* Contexto */}
              <div className="mt-8">
                <label className="text-sm font-ui font-medium text-foreground mb-3 block">Meu cliente principal é:</label>
                <div className="flex flex-wrap gap-2">
                  {CONTEXTOS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setContexto(c.id)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-ui transition-all border ${
                        contexto === c.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border text-foreground hover:border-muted-foreground/40'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ticket */}
              <div className="mt-8">
                <label className="text-sm font-ui font-medium text-foreground mb-3 block">Valor médio das suas vendas:</label>
                <div className="flex flex-wrap gap-2">
                  {TICKETS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTicket(t.id)}
                      className={`px-4 py-2.5 rounded-lg text-sm font-ui transition-all border ${
                        ticket === t.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border text-foreground hover:border-muted-foreground/40'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nicho */}
              <div className="mt-8">
                <label className="text-sm font-ui font-medium text-foreground mb-3 block">Seu nicho ou mercado:</label>
                <Input
                  value={nicho}
                  onChange={e => setNicho(e.target.value)}
                  placeholder="ex: Odontologia estética, Consultoria RH, SaaS..."
                  className="bg-card border-border font-ui"
                />
              </div>

              <div className="mt-8 flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)} className="rounded-pill px-6">
                  ← Voltar
                </Button>
                <Button onClick={() => setStep(3)} disabled={!canNext2} className="rounded-pill px-8">
                  Próximo →
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <h2 className="font-heading text-2xl text-foreground text-center">Seu DNA Comercial</h2>
              <p className="font-body text-sm text-muted-foreground text-center mt-2 mb-8">
                É isso que vamos usar para personalizar cada script gerado.
              </p>

              {/* Summary card */}
              <div className="bg-card border border-border rounded-xl p-6 space-y-3">
                <SummaryRow label="Tom principal" value={`${primaryTone?.name} ${primaryTone?.icon}`} />
                {secondaryTone && (
                  <SummaryRow label="Tom secundário" value={`${secondaryTone.name} ${secondaryTone.icon} (${100 - weight}%)`} />
                )}
                <SummaryRow label="Contexto" value={contexto || ''} />
                <SummaryRow label="Ticket médio" value={TICKET_DISPLAY[ticket!] || ticket || ''} />
                <SummaryRow label="Nicho" value={nicho} />
              </div>

              <p className="text-xs text-muted-foreground font-ui text-center mt-4">
                Você pode alterar isso a qualquer momento em Meu Perfil.
              </p>

              <div className="mt-8 flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)} className="rounded-pill px-6">
                  ← Voltar
                </Button>
                <Button onClick={handleSave} disabled={saving} className="rounded-pill px-8">
                  {saving ? 'Salvando...' : 'Salvar e começar'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm font-ui text-muted-foreground">{label}:</span>
    <span className="text-sm font-ui font-semibold text-foreground">{value}</span>
  </div>
);

export default Onboarding;
