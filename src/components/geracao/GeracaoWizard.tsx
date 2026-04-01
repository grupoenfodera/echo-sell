import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Building2, User, Map, FileText, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ── Types ─────────────────────────────────────────
export interface WizardData {
  nome_cliente: string;
  empresa: string;
  como_conhecemos: string;
  contexto: 'b2b' | 'b2c' | '';
  nicho: string;
  produto: string;
  preco: string;
}

export interface GeracaoWizardProps {
  onSubmit: (dados: WizardData, tipo: 'roteiro' | 'proposta') => void;
  isLoading?: boolean;
  loadingTipo?: 'roteiro' | 'proposta' | null;
}

const STEPS = [
  { key: 'cliente', label: 'Cliente' },
  { key: 'produto', label: 'Produto' },
  { key: 'gerar', label: 'Gerar' },
] as const;

const COMO_CONHECEMOS_OPTIONS = [
  { value: 'indicacao', label: 'Indicação' },
  { value: 'evento', label: 'Evento ou networking' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'abordagem_fria', label: 'Abordagem fria' },
  { value: 'outros', label: 'Outros' },
];

const initialData: WizardData = {
  nome_cliente: '',
  empresa: '',
  como_conhecemos: '',
  contexto: '',
  nicho: '',
  produto: '',
  preco: '',
};

// ── Progress Bar ──────────────────────────────────
function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, i) => {
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                    ? 'border-2 border-primary text-primary bg-background'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-xs mt-1.5 font-medium ${
                  isCurrent
                    ? 'text-primary'
                    : isCompleted
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-16 sm:w-24 h-0.5 mx-2 mb-5 transition-colors ${
                  i < currentStep ? 'bg-primary' : 'bg-border'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Cliente ───────────────────────────────
function StepCliente({
  data,
  onChange,
  errors,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Sobre o cliente</h2>
        <p className="text-sm text-muted-foreground mt-1">Quem você vai atender?</p>
      </div>

      <div className="space-y-4">
        {/* nome_cliente */}
        <div className="space-y-2">
          <Label htmlFor="nome_cliente">Nome do cliente *</Label>
          <Input
            id="nome_cliente"
            placeholder="Nome do cliente ou empresa"
            value={data.nome_cliente}
            onChange={(e) => onChange({ nome_cliente: e.target.value })}
          />
          {errors.nome_cliente && (
            <p className="text-xs text-destructive">{errors.nome_cliente}</p>
          )}
        </div>

        {/* empresa */}
        <div className="space-y-2">
          <Label htmlFor="empresa">Empresa (opcional)</Label>
          <Input
            id="empresa"
            placeholder="Nome da empresa"
            value={data.empresa}
            onChange={(e) => onChange({ empresa: e.target.value })}
          />
        </div>

        {/* como_conhecemos */}
        <div className="space-y-2">
          <Label>Como vocês se conectaram?</Label>
          <Select
            value={data.como_conhecemos}
            onValueChange={(v) => onChange({ como_conhecemos: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {COMO_CONHECEMOS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* contexto */}
        <div className="space-y-2">
          <Label>Contexto da venda *</Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: 'b2b' as const,
                icon: Building2,
                title: 'B2B',
                desc: 'Venda para empresa',
              },
              {
                value: 'b2c' as const,
                icon: User,
                title: 'B2C',
                desc: 'Venda para pessoa física',
              },
            ].map((opt) => {
              const selected = data.contexto === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ contexto: opt.value })}
                  className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                    selected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <opt.icon
                    className={`w-5 h-5 shrink-0 ${
                      selected ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                  <div>
                    <p className="font-medium text-sm text-foreground">{opt.title}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {errors.contexto && (
            <p className="text-xs text-destructive">{errors.contexto}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Produto ───────────────────────────────
function StepProduto({
  data,
  onChange,
  errors,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Sobre o que você vende</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Detalhe o produto ou serviço desta venda
        </p>
      </div>

      <div className="space-y-4">
        {/* nicho */}
        <div className="space-y-2">
          <Label htmlFor="nicho">Nicho ou segmento do cliente *</Label>
          <Input
            id="nicho"
            placeholder="Ex: Clínicas odontológicas, e-commerce de moda..."
            value={data.nicho}
            onChange={(e) => onChange({ nicho: e.target.value })}
          />
          {errors.nicho && (
            <p className="text-xs text-destructive">{errors.nicho}</p>
          )}
        </div>

        {/* produto */}
        <div className="space-y-2">
          <Label htmlFor="produto">Produto / serviço *</Label>
          <Textarea
            id="produto"
            rows={3}
            placeholder="Descreva o produto ou serviço que será apresentado nesta reunião"
            value={data.produto}
            onChange={(e) => onChange({ produto: e.target.value })}
          />
          {errors.produto && (
            <p className="text-xs text-destructive">{errors.produto}</p>
          )}
        </div>

        {/* preco */}
        <div className="space-y-2">
          <Label htmlFor="preco">Investimento estimado (opcional)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
              R$
            </span>
            <Input
              id="preco"
              className="pl-10"
              placeholder="Ex: 1.500 ou 1.500 a 3.000"
              value={data.preco}
              onChange={(e) => onChange({ preco: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Gerar ─────────────────────────────────
function StepGerar({
  onSelect,
  isLoading,
  loadingTipo,
}: {
  onSelect: (tipo: 'roteiro' | 'proposta') => void;
  isLoading?: boolean;
  loadingTipo?: 'roteiro' | 'proposta' | null;
}) {
  const cards: {
    tipo: 'roteiro' | 'proposta';
    icon: typeof Map;
    title: string;
    desc: string;
    badge: string;
    accent: string;
  }[] = [
    {
      tipo: 'roteiro',
      icon: Map,
      title: 'Roteiro da Reunião',
      desc: 'Estrutura completa para conduzir a conversa: abertura, perguntas de descoberta, apresentação e fechamento.',
      badge: 'Mais rápido · ~30s',
      accent: 'border-primary hover:border-primary',
    },
    {
      tipo: 'proposta',
      icon: FileText,
      title: 'Proposta Completa',
      desc: 'Roteiro + proposta comercial + email de follow-up + respostas a objeções.',
      badge: 'Completo · ~60s',
      accent: 'border-[hsl(270,60%,55%)] hover:border-[hsl(270,60%,55%)]',
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">O que deseja gerar?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha o tipo de material para esta reunião
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => {
          const isThisLoading = isLoading && loadingTipo === card.tipo;
          const isOtherLoading = isLoading && loadingTipo !== card.tipo;
          const Icon = card.icon;

          return (
            <button
              key={card.tipo}
              type="button"
              disabled={isLoading}
              onClick={() => onSelect(card.tipo)}
              className={`group relative flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all ${
                isThisLoading
                  ? card.accent + ' bg-primary/5'
                  : isOtherLoading
                  ? 'border-border opacity-50 cursor-not-allowed'
                  : 'border-border ' + card.accent.split(' ')[1] + ' hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-2">
                {isThisLoading ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : (
                  <Icon className="w-6 h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
              </div>
              <div>
                <p className="font-semibold text-foreground">{card.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {card.desc}
                </p>
              </div>
              <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {card.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────
export default function GeracaoWizard({
  onSubmit,
  isLoading = false,
  loadingTipo = null,
}: GeracaoWizardProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [data, setData] = useState<WizardData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const patch = (updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
    // Clear errors for changed fields
    const clearedErrors = { ...errors };
    Object.keys(updates).forEach((k) => delete clearedErrors[k]);
    setErrors(clearedErrors);
  };

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 0) {
      if (!data.nome_cliente.trim()) errs.nome_cliente = 'Nome do cliente é obrigatório';
      if (!data.contexto) errs.contexto = 'Selecione o contexto da venda';
    }
    if (s === 1) {
      if (!data.nicho.trim()) errs.nicho = 'Nicho é obrigatório';
      if (!data.produto.trim()) errs.produto = 'Descreva o produto ou serviço';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setDirection(1);
    setStep((s) => Math.min(s + 1, 2));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSelect = (tipo: 'roteiro' | 'proposta') => {
    onSubmit(data, tipo);
  };

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
    }),
  };

  return (
    <div className="w-full max-w-[560px] mx-auto">
      <ProgressBar currentStep={step} />

      <Card className="shadow-sm">
        <CardContent className="p-6">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {step === 0 && (
                <StepCliente data={data} onChange={patch} errors={errors} />
              )}
              {step === 1 && (
                <StepProduto data={data} onChange={patch} errors={errors} />
              )}
              {step === 2 && (
                <StepGerar
                  onSelect={handleSelect}
                  isLoading={isLoading}
                  loadingTipo={loadingTipo}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer buttons */}
          {step < 2 && (
            <div className="flex justify-between mt-8">
              <Button
                variant="ghost"
                onClick={goBack}
                disabled={step === 0}
                className={step === 0 ? 'invisible' : ''}
              >
                Voltar
              </Button>
              <Button onClick={goNext}>Continuar</Button>
            </div>
          )}
          {step === 2 && (
            <div className="flex justify-start mt-8">
              <Button variant="ghost" onClick={goBack} disabled={isLoading}>
                Voltar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
