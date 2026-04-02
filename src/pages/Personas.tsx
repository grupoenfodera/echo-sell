import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Archive, Loader2, UserCircle } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface Persona {
  id: string;
  nome: string;
  nicho?: string | null;
  descricao?: string | null;
  perfil_decisor?: string | null;
  processamento_info?: string | null;
  objecoes_comuns?: string | null;
  referencia_preco?: string | null;
  ativo?: boolean | null;
}

type FormData = Omit<Persona, 'id' | 'ativo'> & { id?: string };

const emptyForm: FormData = {
  nome: '', nicho: '', descricao: '', perfil_decisor: '', processamento_info: '',
  objecoes_comuns: '', referencia_preco: '',
};

const PERFIL_LABELS: Record<string, string> = {
  analitico: 'Analítico',
  expressivo: 'Expressivo',
  controlador: 'Controlador',
  amigavel: 'Amigável',
};

const PROC_LABELS: Record<string, string> = {
  visual: 'Visual',
  auditivo: 'Auditivo',
  cinestesico: 'Cinestésico',
};

async function callFn<T>(endpoint: string, body?: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${FUNCTIONS_URL}/${endpoint}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export default function Personas() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await callFn<{ personas?: Persona[] }>('personas-listar');
      setPersonas(res.personas ?? []);
    } catch { toast.error('Erro ao carregar personas'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p: Persona) => { setForm({ ...p }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);
    try {
      await callFn('personas-salvar', form as unknown as Record<string, unknown>);
      toast.success(form.id ? 'Persona atualizada' : 'Persona criada');
      setModalOpen(false);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar'); }
    setSaving(false);
  };

  const handleArchive = async (p: Persona) => {
    try {
      await callFn('personas-salvar', { id: p.id, ativo: false });
      toast.success('Persona arquivada');
      load();
    } catch { toast.error('Erro ao arquivar'); }
  };

  const patch = (updates: Partial<FormData>) => setForm(f => ({ ...f, ...updates }));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-[70px] pb-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-heading text-2xl font-bold text-foreground">👤 Personas</h1>
            <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nova persona</Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : personas.length === 0 ? (
            <Card className="py-16">
              <CardContent className="flex flex-col items-center gap-3 text-center">
                <UserCircle className="h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhuma persona cadastrada ainda.</p>
                <Button variant="outline" onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Criar primeira persona</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {personas.map(p => (
                <Card key={p.id} className="relative group">
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold text-foreground">{p.nome}</h3>
                    {p.nicho && <p className="text-xs text-muted-foreground">{p.nicho}</p>}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {p.perfil_decisor && (
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                          {PERFIL_LABELS[p.perfil_decisor] || p.perfil_decisor}
                        </span>
                      )}
                      {p.processamento_info && (
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500">
                          {PROC_LABELS[p.processamento_info] || p.processamento_info}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(p)} className="flex-1 text-xs h-7">
                        <Pencil className="mr-1 h-3 w-3" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleArchive(p)} className="text-xs h-7 text-muted-foreground">
                        <Archive className="mr-1 h-3 w-3" /> Arquivar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar persona' : 'Nova persona'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Field label="Nome da persona *">
              <Input value={form.nome} onChange={e => patch({ nome: e.target.value })} placeholder='Ex: "Empresário desconfiado B2B"' />
            </Field>
            <Field label="Nicho">
              <Input value={form.nicho ?? ''} onChange={e => patch({ nicho: e.target.value })} placeholder="Ex: SaaS, Clínicas..." />
            </Field>
            <Field label="Descrição desta persona">
              <Textarea value={form.descricao ?? ''} onChange={e => patch({ descricao: e.target.value })} rows={3} />
            </Field>
            <Field label="Perfil do decisor">
              <Select value={form.perfil_decisor ?? ''} onValueChange={v => patch({ perfil_decisor: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="analitico">Analítico</SelectItem>
                  <SelectItem value="expressivo">Expressivo</SelectItem>
                  <SelectItem value="controlador">Controlador</SelectItem>
                  <SelectItem value="amigavel">Amigável</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Como processa informações">
              <Select value={form.processamento_info ?? ''} onValueChange={v => patch({ processamento_info: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="visual">Visual</SelectItem>
                  <SelectItem value="auditivo">Auditivo</SelectItem>
                  <SelectItem value="cinestesico">Cinestésico</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Objeções típicas deste perfil">
              <Textarea value={form.objecoes_comuns ?? ''} onChange={e => patch({ objecoes_comuns: e.target.value })} rows={2} />
            </Field>
            <Field label="Referência de preço típica">
              <Input value={form.referencia_preco ?? ''} onChange={e => patch({ referencia_preco: e.target.value })} placeholder="Ex: já paga R$500/mês" />
            </Field>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar persona'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
