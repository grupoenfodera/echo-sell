import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TONE_META: Record<string, { icon: string; color: string; desc: string } | undefined> = {
  consultivo: { icon: '🔵', color: '#0055FF', desc: 'Faz perguntas antes de responder. Nunca pressiona.' },
  direto:     { icon: '🟡', color: '#F59E0B', desc: 'Vai ao ponto, sem rodeios. Confiante e objetivo.' },
  relacional: { icon: '🟢', color: '#22C55E', desc: 'Cria conexão emocional. Usa história e proximidade.' },
  tecnico:    { icon: '🟣', color: '#8B5CF6', desc: 'Usa dados e lógica. Para o cliente racional.' },
  svp_puro:   { icon: '⚪', color: '#888',    desc: 'Segue o método SVP à risca, sem adaptação de tom.' },
};

const TONE_NAME: Record<string, string> = {
  consultivo: 'Consultivo', direto: 'Direto', relacional: 'Relacional',
  tecnico: 'Técnico', svp_puro: 'SVP Puro',
};

const TONS = [
  { value: 'consultivo', label: 'Consultivo', icon: '🔵' },
  { value: 'direto',     label: 'Direto',     icon: '🟡' },
  { value: 'relacional', label: 'Relacional', icon: '🟢' },
  { value: 'tecnico',    label: 'Técnico',    icon: '🟣' },
  { value: 'svp_puro',   label: 'SVP Puro',   icon: '⚪' },
];

const DnaProfile = () => {
  const { usuario } = useAuth();
  const [dna, setDna] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);

  useEffect(() => {
    if (!usuario?.id) return;
    supabase
      .from('usuario_dna')
      .select('*')
      .eq('usuario_id', usuario.id)
      .maybeSingle()
      .then(({ data }) => { setDna(data); setLoading(false); });
  }, [usuario?.id]);

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!dna) {
    return (
      <>
        <main className="pb-16 px-4 sm:px-6 pt-6">
          <div className="max-w-[920px] mx-auto text-center py-20">
            <p className="text-4xl mb-4">🧬</p>
            <h2 className="font-heading text-xl text-foreground mb-2">Seu DNA Comercial não foi configurado</h2>
            <p className="text-sm text-muted-foreground font-body mb-6">Configure agora para que a IA aprenda seu estilo e gere roteiros personalizados.</p>
            <Button onClick={() => setEditModal(true)} className="rounded-pill">Configurar DNA agora</Button>
          </div>
        </main>
        {editModal && <DnaModal dna={{}} onClose={() => setEditModal(false)} onSaved={d => { setDna(d); setEditModal(false); }} />}
      </>
    );
  }

  const pMeta = TONE_META[dna.tom_primario];
  const sMeta = dna.tom_secundario ? TONE_META[dna.tom_secundario] : null;

  return (
    <>
      <main className="pb-16 px-4 sm:px-6 pt-6">
        <div className="max-w-[920px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-heading text-2xl text-foreground">DNA Comercial</h1>
            <Button onClick={() => setEditModal(true)} size="sm" className="rounded-pill">Editar DNA</Button>
          </div>

          {/* Bloco de tom */}
          <Card className="card-glow mb-4">
            <CardContent className="p-6">
              <p className="text-xs font-ui text-muted-foreground uppercase tracking-wider mb-3">Tom & Contexto</p>
              <div className="space-y-2">
                <SummaryRow label="Tom principal" value={`${pMeta?.icon || ''} ${TONE_NAME[dna.tom_primario] || dna.tom_primario}`} />
                {sMeta && <SummaryRow label="Tom secundário" value={`${sMeta.icon} ${TONE_NAME[dna.tom_secundario] || dna.tom_secundario} (${dna.peso_secundario || 30}%)`} />}
                <SummaryRow label="Contexto" value={dna.contexto || '—'} />
                <SummaryRow label="Ticket médio" value={dna.ticket_medio || '—'} />
                <SummaryRow label="Nicho" value={dna.nicho_principal || '—'} />
              </div>
            </CardContent>
          </Card>

          {/* Bloco de inteligência */}
          <Card className="card-glow mb-6">
            <CardContent className="p-6">
              <p className="text-xs font-ui text-muted-foreground uppercase tracking-wider mb-3">Inteligência Personalizada</p>
              <div className="space-y-4">
                <IntelBlock icon="🏆" label="Diferenciais" value={dna.diferenciais} empty="Não configurado" />
                <IntelBlock icon="🗣️" label="Estilo de narrativa" value={dna.estilo_narrativa} empty="Não configurado" />
                <IntelBlock icon="💬" label="Expressões próprias" value={dna.expressoes_proprias} empty="Não configurado" />
                <IntelBlock icon="📖" label="Cases reais" value={dna.cases_reais} empty="Nenhum case salvo" />
                <IntelBlock icon="🛡️" label="Objeções frequentes" value={dna.objecoes_frequentes} empty="Não configurado" />
              </div>
            </CardContent>
          </Card>

          {dna.atualizado_em && (
            <p className="text-xs font-ui text-muted-foreground mb-6">
              Atualizado em {new Date(dna.atualizado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          )}

          {/* Como é usado */}
          <h2 className="font-heading text-lg text-foreground mb-4">Como seu DNA age nos roteiros</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="card-glow">
              <CardContent className="p-4">
                <p className="text-lg mb-2">🗣️</p>
                <p className="text-sm font-heading font-semibold text-foreground mb-1">Tom nos scripts</p>
                <p className="text-xs font-body text-muted-foreground">{pMeta?.desc || 'Tom configurado.'}</p>
              </CardContent>
            </Card>
            <Card className="card-glow">
              <CardContent className="p-4">
                <p className="text-lg mb-2">📖</p>
                <p className="text-sm font-heading font-semibold text-foreground mb-1">Cases injetados</p>
                <p className="text-xs font-body text-muted-foreground">
                  {dna.cases_reais ? 'A IA usa apenas seus cases reais nos scripts.' : 'Adicione cases para personalizar as provas sociais.'}
                </p>
              </CardContent>
            </Card>
            <Card className="card-glow">
              <CardContent className="p-4">
                <p className="text-lg mb-2">🛡️</p>
                <p className="text-sm font-heading font-semibold text-foreground mb-1">Objeções do nicho</p>
                <p className="text-xs font-body text-muted-foreground">
                  {dna.objecoes_frequentes ? 'Scripts de objeção adaptados ao seu nicho.' : 'Adicione objeções para scripts mais precisos.'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {editModal && <DnaModal dna={dna} onClose={() => setEditModal(false)} onSaved={d => { setDna(d); setEditModal(false); }} />}
    </>
  );
};

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm font-ui text-muted-foreground">{label}:</span>
    <span className="text-sm font-ui font-semibold text-foreground">{value}</span>
  </div>
);

const IntelBlock = ({ icon, label, value, empty }: { icon: string; label: string; value?: string; empty: string }) => (
  <div>
    <p className="text-xs font-ui text-muted-foreground mb-1">{icon} {label}</p>
    <p className="text-sm font-body text-foreground whitespace-pre-line">
      {value ? value : <span className="text-muted-foreground italic">{empty}</span>}
    </p>
  </div>
);

/* ─── Modal com 2 etapas ─── */
const DnaModal = ({ dna, onClose, onSaved }: { dna: any; onClose: () => void; onSaved: (d: any) => void }) => {
  const { usuario } = useAuth();
  const isNew = !dna.tom_primario;
  const [step, setStep] = useState(1);

  // Etapa 1 — base
  const [tomPrimario, setTomPrimario]   = useState(dna.tom_primario || 'consultivo');
  const [contexto, setContexto]         = useState(dna.contexto || '');
  const [ticket, setTicket]             = useState(dna.ticket_medio || '');
  const [nicho, setNicho]               = useState(dna.nicho_principal || '');

  // Etapa 2 — inteligência
  const [diferenciais, setDiferenciais]           = useState(dna.diferenciais || '');
  const [estiloNarrativa, setEstiloNarrativa]     = useState(dna.estilo_narrativa || '');
  const [expressoes, setExpressoes]               = useState(dna.expressoes_proprias || '');
  const [cases, setCases]                         = useState(dna.cases_reais || '');
  const [objecoes, setObjecoes]                   = useState(dna.objecoes_frequentes || '');

  const [saving, setSaving] = useState(false);

  const goNext = () => {
    if (!contexto) { toast.error('Selecione o contexto.'); return; }
    setStep(2);
  };

  const handleSave = async () => {
    if (!usuario?.id) return;
    setSaving(true);
    try {
      let blocoInjetado = dna.bloco_injetado || '';
      try {
        const { data: blocoData } = await supabase.functions.invoke('gerar-dna', {
          body: {
            tom_primario:         tomPrimario,
            tom_secundario:       dna.tom_secundario || null,
            peso_secundario:      dna.peso_secundario || null,
            contexto,
            ticket_medio:         ticket,
            nicho_principal:      nicho,
            diferenciais:         diferenciais || null,
            estilo_narrativa:     estiloNarrativa || null,
            expressoes_proprias:  expressoes || null,
            cases_reais:          cases || null,
            objecoes_frequentes:  objecoes || null,
          },
        });
        if (blocoData?.bloco_injetado) blocoInjetado = blocoData.bloco_injetado;
      } catch {
        // silently ignore — save proceeds without new bloco
      }

      const updated = {
        usuario_id:           usuario.id,
        tom_primario:         tomPrimario,
        contexto,
        ticket_medio:         ticket,
        nicho_principal:      nicho,
        diferenciais:         diferenciais || null,
        estilo_narrativa:     estiloNarrativa || null,
        expressoes_proprias:  expressoes || null,
        cases_reais:          cases || null,
        objecoes_frequentes:  objecoes || null,
        bloco_injetado:       blocoInjetado,
        atualizado_em:        new Date().toISOString(),
      };

      const { error } = await supabase
        .from('usuario_dna')
        .upsert(updated, { onConflict: 'usuario_id' });

      if (error) throw error;
      toast.success(isNew ? '🧬 DNA configurado! A IA já conhece seu estilo.' : '🧬 DNA atualizado!');
      onSaved({ ...dna, ...updated });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-6 pb-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-heading text-lg text-foreground">{isNew ? 'Configurar DNA' : 'Editar DNA'}</h3>
            <p className="text-xs text-muted-foreground font-ui mt-0.5">Etapa {step} de 2 — {step === 1 ? 'Perfil base' : 'Inteligência personalizada'}</p>
          </div>
          <div className="flex gap-1">
            {[1,2].map(s => (
              <div key={s} className={`h-1.5 w-8 rounded-full transition-all ${step >= s ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {step === 1 ? (
            <>
              {/* Tom */}
              <div>
                <label className="text-xs font-ui text-muted-foreground mb-2 block">Tom principal</label>
                <div className="flex flex-wrap gap-2">
                  {TONS.map(t => (
                    <button key={t.value} onClick={() => setTomPrimario(t.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-ui border transition-all ${tomPrimario === t.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground'}`}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contexto */}
              <div>
                <label className="text-xs font-ui text-muted-foreground mb-2 block">Contexto de venda</label>
                <div className="flex gap-2">
                  {['B2C', 'B2B', 'Ambos'].map(c => (
                    <button key={c} onClick={() => setContexto(c)}
                      className={`px-4 py-2 rounded-lg text-xs font-ui border transition-all ${contexto === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ticket */}
              <div>
                <label className="text-xs font-ui text-muted-foreground mb-1 block">Ticket médio</label>
                <Input value={ticket} onChange={e => setTicket(e.target.value)} placeholder="Ex: R$ 3.000, R$ 15.000..." className="bg-card border-border font-ui" />
              </div>

              {/* Nicho */}
              <div>
                <label className="text-xs font-ui text-muted-foreground mb-1 block">Nicho principal</label>
                <Input value={nicho} onChange={e => setNicho(e.target.value)} placeholder="Ex: Coaching, Consultoria, SaaS, Estética..." className="bg-card border-border font-ui" />
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground font-body bg-muted/40 rounded-lg p-3">
                💡 Quanto mais você preencher, mais personalizada fica a IA. Cada campo alimenta o roteiro com o seu estilo.
              </p>

              <div>
                <label className="text-xs font-ui text-muted-foreground mb-1 block">🏆 Seus diferenciais competitivos</label>
                <Textarea value={diferenciais} onChange={e => setDiferenciais(e.target.value)}
                  placeholder="O que te separa da concorrência? Ex: Único no Brasil a usar X, 10 anos de experiência em Y, metodologia proprietária..."
                  className="bg-card border-border font-ui resize-none" rows={3} />
              </div>

              <div>
                <label className="text-xs font-ui text-muted-foreground mb-1 block">🗣️ Seu estilo de narrativa</label>
                <Textarea value={estiloNarrativa} onChange={e => setEstiloNarrativa(e.target.value)}
                  placeholder="Como você conta suas histórias? Ex: Direto com dados, emocional com metáforas, técnico com analogias práticas..."
                  className="bg-card border-border font-ui resize-none" rows={2} />
              </div>

              <div>
                <label className="text-xs font-ui text-muted-foreground mb-1 block">💬 Expressões e vocabulário próprios</label>
                <Textarea value={expressoes} onChange={e => setExpressoes(e.target.value)}
                  placeholder="Palavras e frases que você usa muito. Ex: 'protocolo', 'resultado cirúrgico', 'tração real', 'escala com propósito'..."
                  className="bg-card border-border font-ui resize-none" rows={2} />
              </div>

              <div>
                <label className="text-xs font-ui text-muted-foreground mb-1 block">📖 Cases reais (a IA vai usar estes)</label>
                <Textarea value={cases} onChange={e => setCases(e.target.value)}
                  placeholder="Ex: Cliente X era designer freelancer faturando R$3k/mês. Em 90 dias chegou a R$18k com o método. Ou: Empresa Y reduziu CAC em 40% após implementar..."
                  className="bg-card border-border font-ui resize-none" rows={4} />
              </div>

              <div>
                <label className="text-xs font-ui text-muted-foreground mb-1 block">🛡️ Objeções mais comuns no seu nicho</label>
                <Textarea value={objecoes} onChange={e => setObjecoes(e.target.value)}
                  placeholder="Ex: 'Já tentei mentoria antes e não funcionou', 'Meu negócio é diferente', 'Preciso ver resultado antes de pagar'..."
                  className="bg-card border-border font-ui resize-none" rows={3} />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-border flex gap-2 justify-between">
          <Button variant="ghost" onClick={step === 1 ? onClose : () => setStep(1)} size="sm" className="rounded-pill">
            {step === 1 ? 'Cancelar' : '← Voltar'}
          </Button>
          <div className="flex gap-2">
            {step === 1 ? (
              <>
                <Button variant="outline" size="sm" className="rounded-pill" onClick={goNext}>
                  Próximo →
                </Button>
              </>
            ) : (
              <Button onClick={handleSave} disabled={saving} size="sm" className="rounded-pill">
                {saving ? (
                  <span className="flex items-center gap-2"><span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Gerando DNA...</span>
                ) : (isNew ? '🧬 Criar DNA' : '🧬 Salvar DNA')}
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DnaProfile;
