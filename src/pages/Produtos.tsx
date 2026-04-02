import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Archive, Loader2, Package } from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface Produto {
  id: string;
  nome: string;
  nicho?: string | null;
  descricao?: string | null;
  nome_metodologia?: string | null;
  entregaveis_detalhados?: string | null;
  resultado_entregue?: string | null;
  formato_duracao?: string | null;
  preco_ancora?: number | null;
  preco_meta?: number | null;
  preco_minimo?: number | null;
  garantia?: string | null;
  case_real?: string | null;
  objecao_principal?: string | null;
  ativo?: boolean | null;
}

type FormData = Omit<Produto, 'id' | 'ativo'> & { id?: string };

const emptyForm: FormData = {
  nome: '', nicho: '', descricao: '', nome_metodologia: '', entregaveis_detalhados: '',
  resultado_entregue: '', formato_duracao: '', preco_ancora: null, preco_meta: null,
  preco_minimo: null, garantia: '', case_real: '', objecao_principal: '',
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

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await callFn<{ produtos?: Produto[] }>('produtos-listar');
      setProdutos(res.produtos ?? []);
    } catch { toast.error('Erro ao carregar produtos'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p: Produto) => {
    setForm({ ...p });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);
    try {
      await callFn('produtos-salvar', form as unknown as Record<string, unknown>);
      toast.success(form.id ? 'Produto atualizado' : 'Produto criado');
      setModalOpen(false);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar'); }
    setSaving(false);
  };

  const handleArchive = async (p: Produto) => {
    try {
      await callFn('produtos-salvar', { id: p.id, ativo: false });
      toast.success('Produto arquivado');
      load();
    } catch { toast.error('Erro ao arquivar'); }
  };

  const patch = (updates: Partial<FormData>) => setForm(f => ({ ...f, ...updates }));

  const formatPrice = (v: number | null | undefined) => v != null ? `R$ ${v.toLocaleString('pt-BR')}` : '—';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-[70px] pb-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-heading text-2xl font-bold text-foreground">📦 Produtos</h1>
            <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo produto</Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : produtos.length === 0 ? (
            <Card className="py-16">
              <CardContent className="flex flex-col items-center gap-3 text-center">
                <Package className="h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum produto cadastrado ainda.</p>
                <Button variant="outline" onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Criar primeiro produto</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {produtos.map(p => (
                <Card key={p.id} className="relative group">
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold text-foreground">{p.nome}</h3>
                    {p.nicho && <p className="text-xs text-muted-foreground">{p.nicho}</p>}
                    {p.nome_metodologia && (
                      <span className="inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">{p.nome_metodologia}</span>
                    )}
                    <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                      <div><span className="text-muted-foreground block">Âncora</span>{formatPrice(p.preco_ancora)}</div>
                      <div><span className="text-muted-foreground block">Meta</span>{formatPrice(p.preco_meta)}</div>
                      <div><span className="text-muted-foreground block">Mínimo</span>{formatPrice(p.preco_minimo)}</div>
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

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar produto' : 'Novo produto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Field label="Nome do produto *">
              <Input value={form.nome} onChange={e => patch({ nome: e.target.value })} placeholder="Ex: Consultoria Premium" />
            </Field>
            <Field label="Nicho de mercado">
              <Input value={form.nicho ?? ''} onChange={e => patch({ nicho: e.target.value })} placeholder="Ex: Clínicas de estética" />
            </Field>
            <Field label="Descrição do produto/serviço">
              <Textarea value={form.descricao ?? ''} onChange={e => patch({ descricao: e.target.value })} rows={3} />
            </Field>
            <Field label="Nome da metodologia">
              <Input value={form.nome_metodologia ?? ''} onChange={e => patch({ nome_metodologia: e.target.value })} placeholder="Ex: Método SVP" />
            </Field>
            <Field label="Entregáveis detalhados">
              <Textarea value={form.entregaveis_detalhados ?? ''} onChange={e => patch({ entregaveis_detalhados: e.target.value })} rows={2} />
            </Field>
            <Field label="Resultado concreto entregue">
              <Textarea value={form.resultado_entregue ?? ''} onChange={e => patch({ resultado_entregue: e.target.value })} rows={2} />
            </Field>
            <Field label="Formato e duração">
              <Input value={form.formato_duracao ?? ''} onChange={e => patch({ formato_duracao: e.target.value })} placeholder="Ex: 3 meses, encontros semanais" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Preço âncora">
                <Input type="number" value={form.preco_ancora ?? ''} onChange={e => patch({ preco_ancora: e.target.value ? Number(e.target.value) : null })} min={0} />
              </Field>
              <Field label="Preço meta">
                <Input type="number" value={form.preco_meta ?? ''} onChange={e => patch({ preco_meta: e.target.value ? Number(e.target.value) : null })} min={0} />
              </Field>
              <Field label="Preço mínimo">
                <Input type="number" value={form.preco_minimo ?? ''} onChange={e => patch({ preco_minimo: e.target.value ? Number(e.target.value) : null })} min={0} />
              </Field>
            </div>
            <Field label="Garantia oferecida">
              <Input value={form.garantia ?? ''} onChange={e => patch({ garantia: e.target.value })} placeholder="Ex: 30 dias ou devolvo" />
            </Field>
            <Field label="Melhor case de resultado">
              <Textarea value={form.case_real ?? ''} onChange={e => patch({ case_real: e.target.value })} rows={2} />
            </Field>
            <Field label="Objeção principal deste nicho">
              <Input value={form.objecao_principal ?? ''} onChange={e => patch({ objecao_principal: e.target.value })} />
            </Field>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar produto'}
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
