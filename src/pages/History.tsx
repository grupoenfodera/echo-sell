import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Download, ChevronLeft, ChevronRight } from 'lucide-react';

type Gen = {
  id: string;
  modalidade: string;
  nicho: string | null;
  produto: string | null;
  tokens_total: number | null;
  contexto_geracao: string | null;
  criado_em: string | null;
};

const PAGE_SIZE = 20;

const History = () => {
  const { usuario } = useAuth();
  const [gens, setGens] = useState<Gen[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('30d');
  const [modFilter, setModFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [detailModal, setDetailModal] = useState<Gen | null>(null);

  useEffect(() => {
    if (!usuario?.id) return;
    setLoading(true);
    let q = supabase
      .from('geracoes')
      .select('id, modalidade, nicho, produto, tokens_total, contexto_geracao, criado_em')
      .eq('usuario_id', usuario.id)
      .order('criado_em', { ascending: false });

    if (period === '7d') {
      const d = new Date(); d.setDate(d.getDate() - 7);
      q = q.gte('criado_em', d.toISOString());
    } else if (period === '30d') {
      const d = new Date(); d.setDate(d.getDate() - 30);
      q = q.gte('criado_em', d.toISOString());
    }

    q.then(({ data }) => { setGens(data || []); setLoading(false); setPage(0); });
  }, [usuario?.id, period]);

  const filtered = useMemo(() => {
    if (!modFilter) return gens;
    return gens.filter(g => g.modalidade.toLowerCase() === modFilter.toLowerCase());
  }, [gens, modFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const exportCsv = () => {
    const rows = [['Data', 'Modalidade', 'Nicho', 'Produto', 'Tokens'].join(',')];
    filtered.forEach(g => {
      rows.push([
        g.criado_em ? new Date(g.criado_em).toLocaleDateString('pt-BR') : '',
        g.modalidade,
        g.nicho || '',
        g.produto || '',
        String(g.tokens_total || 0),
      ].map(v => `"${v}"`).join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'historico-svp.csv';
    a.click();
  };

  return (
    <>
      <Header />
      <main className="pt-[70px] pb-16 px-4 sm:px-6">
        <div className="max-w-[920px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-heading text-2xl text-foreground">Histórico</h1>
            <Button variant="outline" size="sm" className="rounded-pill gap-1" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {(['7d', '30d', 'all'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-xs font-ui border transition-all ${period === p ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground'}`}>
                {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : 'Tudo'}
              </button>
            ))}
            <div className="w-px bg-border mx-1" />
            {['M1', 'M2A', 'M2B'].map(m => (
              <button key={m} onClick={() => setModFilter(modFilter === m.toLowerCase() ? null : m.toLowerCase())} className={`px-3 py-1.5 rounded-lg text-xs font-ui border transition-all ${modFilter === m.toLowerCase() ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground'}`}>
                {m}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-20 font-body">Nenhuma geração encontrada.</p>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-ui font-medium text-muted-foreground text-xs">Data</th>
                      <th className="text-left py-2 px-3 font-ui font-medium text-muted-foreground text-xs">Modalidade</th>
                      <th className="text-left py-2 px-3 font-ui font-medium text-muted-foreground text-xs hidden sm:table-cell">Nicho</th>
                      <th className="text-left py-2 px-3 font-ui font-medium text-muted-foreground text-xs hidden sm:table-cell">Produto</th>
                      <th className="text-right py-2 px-3 font-ui font-medium text-muted-foreground text-xs">Tokens</th>
                      <th className="py-2 px-3 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.map(g => (
                      <tr key={g.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-ui text-foreground text-xs">{g.criado_em ? new Date(g.criado_em).toLocaleDateString('pt-BR') : '—'}</td>
                        <td className="py-2.5 px-3 font-ui text-foreground text-xs uppercase font-semibold">{g.modalidade}</td>
                        <td className="py-2.5 px-3 font-ui text-muted-foreground text-xs hidden sm:table-cell">{g.nicho || '—'}</td>
                        <td className="py-2.5 px-3 font-ui text-muted-foreground text-xs hidden sm:table-cell truncate max-w-[150px]">{g.produto || '—'}</td>
                        <td className="py-2.5 px-3 font-ui text-muted-foreground text-xs text-right">{g.tokens_total || 0}</td>
                        <td className="py-2.5 px-3">
                          <button onClick={() => setDetailModal(g)} className="text-muted-foreground hover:text-foreground transition-colors">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-ui text-muted-foreground">{page + 1} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Detail modal */}
      {detailModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDetailModal(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-xl p-6 w-full max-w-lg max-h-[70vh] overflow-y-auto">
            <h3 className="font-heading text-lg text-foreground mb-4">Detalhes da geração</h3>
            <div className="space-y-2 text-xs font-ui">
              <p><span className="text-muted-foreground">Modalidade:</span> <span className="text-foreground uppercase font-semibold">{detailModal.modalidade}</span></p>
              <p><span className="text-muted-foreground">Nicho:</span> <span className="text-foreground">{detailModal.nicho || '—'}</span></p>
              <p><span className="text-muted-foreground">Produto:</span> <span className="text-foreground">{detailModal.produto || '—'}</span></p>
              <p><span className="text-muted-foreground">Tokens:</span> <span className="text-foreground">{detailModal.tokens_total || 0}</span></p>
              <p><span className="text-muted-foreground">Data:</span> <span className="text-foreground">{detailModal.criado_em ? new Date(detailModal.criado_em).toLocaleString('pt-BR') : '—'}</span></p>
            </div>
            {detailModal.contexto_geracao ? (
              <pre className="mt-4 bg-muted/50 rounded-lg p-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap">{detailModal.contexto_geracao}</pre>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground font-ui italic">Output disponível por 30 dias.</p>
            )}
            <div className="flex justify-end mt-4">
              <Button variant="ghost" size="sm" onClick={() => setDetailModal(null)} className="rounded-pill">Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default History;
