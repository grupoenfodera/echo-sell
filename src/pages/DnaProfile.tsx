import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TONE_META: Record<string, { icon: string; color: string; desc: string }> = {
  consultivo: { icon: '🔵', color: '#0055FF', desc: 'Faz perguntas antes de responder. Nunca pressiona.' },
  direto: { icon: '🟡', color: '#F59E0B', desc: 'Vai ao ponto, sem rodeios. Confiante e objetivo.' },
  relacional: { icon: '🟢', color: '#22C55E', desc: 'Cria conexão emocional. Usa história e proximidade.' },
  tecnico: { icon: '🟣', color: '#8B5CF6', desc: 'Usa dados e lógica. Para o cliente racional.' },
  svp_puro: { icon: '⚪', color: '#888', desc: 'Segue o método SVP à risca, sem adaptação de tom.' },
};

const TONE_NAME: Record<string, string> = {
  consultivo: 'Consultivo',
  direto: 'Direto',
  relacional: 'Relacional',
  tecnico: 'Técnico',
  svp_puro: 'SVP Puro',
};

const DnaProfile = () => {
  const navigate = useNavigate();
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
      <>
        <Header />
        <main className="pt-[70px] flex items-center justify-center min-h-[60vh]">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </main>
      </>
    );
  }

  if (!dna) {
    return (
      <>
        <Header />
        <main className="pt-[70px] pb-16 px-4 sm:px-6">
          <div className="max-w-[920px] mx-auto text-center py-20">
            <p className="text-muted-foreground font-body mb-4">DNA Comercial não configurado.</p>
            <Button onClick={() => navigate('/onboarding')} className="rounded-pill">Configurar agora</Button>
          </div>
        </main>
      </>
    );
  }

  const pMeta = TONE_META[dna.tom_primario] || {};
  const sMeta = dna.tom_secundario ? TONE_META[dna.tom_secundario] : null;
  const ctx = dna.contexto || '';

  return (
    <>
      <Header />
      <main className="pt-[70px] pb-16 px-4 sm:px-6">
        <div className="max-w-[920px] mx-auto">
          <h1 className="font-heading text-2xl text-foreground mb-6">DNA Comercial</h1>

          {/* Summary card */}
          <Card className="card-glow mb-6">
            <CardContent className="p-6 space-y-3">
              <SummaryRow label="Tom principal" value={`${TONE_NAME[dna.tom_primario] || dna.tom_primario} ${pMeta?.icon || ''}`} />
              {sMeta && (
                <SummaryRow label="Tom secundário" value={`${TONE_NAME[dna.tom_secundario] || dna.tom_secundario} ${sMeta.icon} (${dna.peso_secundario || 30}%)`} />
              )}
              <SummaryRow label="Contexto" value={ctx} />
              <SummaryRow label="Ticket médio" value={dna.ticket_medio || '—'} />
              <SummaryRow label="Nicho" value={dna.nicho_principal || '—'} />
            </CardContent>
          </Card>

          {dna.atualizado_em && (
            <p className="text-xs font-ui text-muted-foreground mb-6">
              Configurado em {new Date(dna.atualizado_em || dna.criado_em).toLocaleDateString('pt-BR')}
            </p>
          )}

          <div className="flex gap-3 mb-10">
            <Button onClick={() => navigate('/onboarding')} variant="outline" className="rounded-pill">
              Reconfigurar DNA
            </Button>
            <Button onClick={() => setEditModal(true)} className="rounded-pill">
              Edição rápida
            </Button>
          </div>

          {/* How DNA is used */}
          <h2 className="font-heading text-lg text-foreground mb-4">Como seu DNA é usado</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="card-glow">
              <CardContent className="p-4">
                <p className="text-lg mb-2">🗣️</p>
                <p className="text-sm font-heading font-semibold text-foreground mb-1">Tom nos scripts</p>
                <p className="text-xs font-body text-muted-foreground">{pMeta.desc || 'Tom configurado.'}</p>
              </CardContent>
            </Card>
            <Card className="card-glow">
              <CardContent className="p-4">
                <p className="text-lg mb-2">📄</p>
                <p className="text-sm font-heading font-semibold text-foreground mb-1">Suas propostas</p>
                <p className="text-xs font-body text-muted-foreground">
                  {ctx === 'B2B' ? 'Formais, com escopo e entregáveis.' : ctx === 'B2C' ? 'Diretas e emocionais, 1 página.' : 'Adaptadas ao contexto.'}
                </p>
              </CardContent>
            </Card>
            <Card className="card-glow">
              <CardContent className="p-4">
                <p className="text-lg mb-2">📧</p>
                <p className="text-sm font-heading font-semibold text-foreground mb-1">Seus e-mails</p>
                <p className="text-xs font-body text-muted-foreground">
                  {ctx === 'B2B' ? 'Formais, CTA de próxima reunião.' : ctx === 'B2C' ? 'Pessoais, CTA direto de compra.' : 'Adaptados ao contexto.'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {editModal && <QuickEditModal dna={dna} onClose={() => setEditModal(false)} onSaved={d => { setDna(d); setEditModal(false); }} />}
    </>
  );
};

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm font-ui text-muted-foreground">{label}:</span>
    <span className="text-sm font-ui font-semibold text-foreground">{value}</span>
  </div>
);

const QuickEditModal = ({ dna, onClose, onSaved }: { dna: any; onClose: () => void; onSaved: (d: any) => void }) => {
  const { usuario } = useAuth();
  const [contexto, setContexto] = useState(dna.contexto || '');
  const [ticket, setTicket] = useState(dna.ticket_medio || '');
  const [nicho, setNicho] = useState(dna.nicho_principal || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!usuario?.id) return;
    setSaving(true);
    try {
      const { data: blocoData } = await supabase.functions.invoke('gerar-dna', {
        body: {
          tom_primario: dna.tom_primario,
          tom_secundario: dna.tom_secundario,
          peso_secundario: dna.peso_secundario,
          contexto,
          ticket_medio: ticket,
          nicho_principal: nicho,
        },
      });

      const updated = {
        contexto,
        ticket_medio: ticket,
        nicho_principal: nicho,
        bloco_injetado: blocoData?.bloco_injetado || dna.bloco_injetado,
        atualizado_em: new Date().toISOString(),
      };

      await supabase.from('usuario_dna').update(updated).eq('usuario_id', usuario.id);
      toast.success('DNA atualizado.');
      onSaved({ ...dna, ...updated });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4">
        <h3 className="font-heading text-lg text-foreground">Edição rápida</h3>
        <div>
          <label className="text-xs font-ui text-muted-foreground mb-1 block">Contexto</label>
          <div className="flex gap-2">
            {['B2C', 'B2B', 'Ambos'].map(c => (
              <button key={c} onClick={() => setContexto(c)} className={`px-3 py-1.5 rounded-lg text-xs font-ui border transition-all ${contexto === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground'}`}>{c}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-ui text-muted-foreground mb-1 block">Ticket médio</label>
          <Input value={ticket} onChange={e => setTicket(e.target.value)} className="bg-card border-border font-ui" />
        </div>
        <div>
          <label className="text-xs font-ui text-muted-foreground mb-1 block">Nicho</label>
          <Input value={nicho} onChange={e => setNicho(e.target.value)} className="bg-card border-border font-ui" />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} size="sm" className="rounded-pill">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} size="sm" className="rounded-pill">{saving ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </div>
    </div>
  );
};

export default DnaProfile;
