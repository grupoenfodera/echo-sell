import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Modality, SvpFormData } from '@/types/svp';
import { modalitySubmitLabels } from '@/types/svp';

interface DnaInfo {
  contexto: string | null;
  tom_primario: string | null;
}

interface Props {
  modality: Modality;
  formData: SvpFormData;
  onChange: (data: SvpFormData) => void;
  onSubmit: () => void;
  loading?: boolean;
  dna?: DnaInfo | null;
  contextoGeracao?: string | null;
  onContextoChange?: (ctx: string) => void;
}

const TOM_ICONS: Record<string, string> = {
  consultivo: '🔵',
  direto: '🟡',
  relacional: '🟢',
  tecnico: '🟣',
  svp_puro: '⚪',
};

const CONTEXTO_LABELS: Record<string, string> = {
  b2b: 'B2B',
  b2c: 'B2C',
  ambos: 'B2B/B2C',
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-ui font-medium text-muted-foreground">{label}</label>
    {children}
  </div>
);

const SvpForm = ({ modality, formData, onChange, onSubmit, loading, dna, contextoGeracao, onContextoChange }: Props) => {
  const set = (field: keyof SvpFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...formData, [field]: e.target.value });

  const showM1M2A = modality === 'm1' || modality === 'm2a';
  const showM1Only = modality === 'm1';
  const showM2AOnly = modality === 'm2a';
  const showM2BOnly = modality === 'm2b';
  const showContextToggle = dna?.contexto === 'ambos';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const tomIcon = dna?.tom_primario ? TOM_ICONS[dna.tom_primario] || '🔵' : null;
  const tomLabel = dna?.tom_primario
    ? dna.tom_primario.charAt(0).toUpperCase() + dna.tom_primario.slice(1).replace('_', ' ')
    : null;
  const ctxLabel = dna?.contexto ? CONTEXTO_LABELS[dna.contexto] || dna.contexto.toUpperCase() : null;

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      onSubmit={handleSubmit}
      className="space-y-4 bg-card border border-border rounded-xl p-6 card-glow"
    >
      {/* DNA Badge */}
      {dna?.tom_primario ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border">
          <span>
            {tomIcon} {tomLabel} · {ctxLabel}
          </span>
          <Link to="/perfil/dna" className="text-primary hover:underline font-medium">
            Editar →
          </Link>
        </div>
      ) : (
        <Link
          to="/dna-comercial"
          className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 hover:bg-muted transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Configure seu DNA para personalizar os scripts.</span>
          <span className="text-primary font-medium ml-auto">→</span>
        </Link>
      )}

      {/* B2B/B2C toggle for dual-context users */}
      {showContextToggle && (
        <Field label="Esta venda específica é para:">
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'b2c', label: 'Pessoa física (B2C)' },
              { value: 'b2b', label: 'Empresa (B2B)' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onContextoChange?.(opt.value)}
                className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  contextoGeracao === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:border-primary/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nicho">
          <Input placeholder="Ex: Odontologia estética" value={formData.nicho} onChange={set('nicho')} className="bg-background" />
        </Field>
        <Field label="Produto / Serviço">
          <Input placeholder="Ex: Lente de contato dental" value={formData.produto} onChange={set('produto')} className="bg-background" />
        </Field>
        <Field label="Nome do cliente (opcional)">
          <Input placeholder="Nome do lead" value={formData.nomeCliente} onChange={set('nomeCliente')} className="bg-background" />
        </Field>
        <Field label="Preço de venda">
          <Input placeholder="Ex: R$ 3.500" value={formData.preco} onChange={set('preco')} className="bg-background" />
        </Field>
        <Field label="Piso de negociação (não aparece no script)">
          <Input placeholder="Ex: R$ 2.800" value={formData.limiteMinimo} onChange={set('limiteMinimo')} className="bg-background" />
        </Field>
      </div>

      <Field label="Descrição do serviço — O que é, o que faz">
        <Textarea rows={3} placeholder="Descreva o serviço..." value={formData.descricao} onChange={set('descricao')} className="bg-background" />
      </Field>

      {showM1M2A && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Field label="Entregáveis — O que o cliente recebe">
            <Textarea rows={2} placeholder="Liste os entregáveis..." value={formData.entregaveis} onChange={set('entregaveis')} className="bg-background" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Formato de entrega (opcional)">
              <Input placeholder="Presencial, online, etc" value={formData.formatoEntrega} onChange={set('formatoEntrega')} className="bg-background" />
            </Field>
          </div>
          <Field label="Perfil do cliente ideal (opcional)">
            <Textarea rows={2} placeholder="Quem é, o que busca..." value={formData.perfilCliente} onChange={set('perfilCliente')} className="bg-background" />
          </Field>
        </motion.div>
      )}

      {showM1Only && (
        <Field label="Principal objeção esperada">
          <Input placeholder="Ex: Está caro" value={formData.objecaoPrincipal} onChange={set('objecaoPrincipal')} className="bg-background" />
        </Field>
      )}

      {showM2AOnly && (
        <Field label="Canal do contato">
          <Input placeholder="WhatsApp, ligação, reunião" value={formData.canalContato} onChange={set('canalContato')} className="bg-background" />
        </Field>
      )}

      {showM2BOnly && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Field label="Notas do Tempo 1 — Transcrição ou resumo do primeiro contato">
            <Textarea rows={5} placeholder="Cole aqui..." value={formData.notasT1} onChange={set('notasT1')} className="bg-background" />
          </Field>
          <Field label="Objeção que surgiu (opcional)">
            <Input placeholder="Ex: Preciso pensar" value={formData.objecaoSurgida} onChange={set('objecaoSurgida')} className="bg-background" />
          </Field>
        </motion.div>
      )}

      <Button
        type="submit"
        disabled={loading || !formData.nicho || !formData.produto || !formData.preco || (showContextToggle && !contextoGeracao)}
        className="w-full rounded-pill h-11 font-heading font-semibold mt-2"
      >
        {modalitySubmitLabels[modality]}
      </Button>
    </motion.form>
  );
};

export default SvpForm;
