import { useState, useEffect, useRef } from 'react';
import { Bell, X, Plus, Sparkles, Wrench, AlertCircle, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

type TipoNovidade = 'feature' | 'melhoria' | 'correcao' | 'aviso';

interface Novidade {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: TipoNovidade;
  emoji: string;
  criado_em: string;
}

const TIPO_META: Record<TipoNovidade, { label: string; color: string; icon: React.ReactNode }> = {
  feature:   { label: 'Novidade',  color: 'text-primary bg-primary/10',      icon: <Sparkles className="h-3 w-3" /> },
  melhoria:  { label: 'Melhoria',  color: 'text-emerald-500 bg-emerald-500/10', icon: <Zap className="h-3 w-3" /> },
  correcao:  { label: 'Correção',  color: 'text-amber-500 bg-amber-500/10',   icon: <Wrench className="h-3 w-3" /> },
  aviso:     { label: 'Aviso',     color: 'text-rose-500 bg-rose-500/10',     icon: <AlertCircle className="h-3 w-3" /> },
};

const ADMIN_EMAIL = 'grupoenfodera@gmail.com';

const NotificationBell = () => {
  const { usuario } = useAuth();
  const [open, setOpen] = useState(false);
  const [novidades, setNovidades] = useState<Novidade[]>([]);
  const [lidas, setLidas] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [posting, setPosting] = useState(false);

  // Form state
  const [fTitulo, setFTitulo] = useState('');
  const [fDescricao, setFDescricao] = useState('');
  const [fTipo, setFTipo] = useState<TipoNovidade>('feature');
  const [fEmoji, setFEmoji] = useState('✨');

  const panelRef = useRef<HTMLDivElement>(null);
  const isAdmin = usuario?.email === ADMIN_EMAIL;

  // Carregar novidades + lidas
  useEffect(() => {
    if (!usuario?.id) return;
    fetchNovidades();
    fetchLidas();
  }, [usuario?.id]);

  // Supabase Realtime — ouve INSERTs na tabela novidades
  useEffect(() => {
    if (!usuario?.id) return;

    const channel = supabase
      .channel('novidades-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'novidades' },
        (payload) => {
          const nova = payload.new as Novidade;
          setNovidades(prev => [nova, ...prev]);
          // Notificação toast para quem não é admin
          if (!isAdmin) {
            toast(`${nova.emoji} ${nova.titulo}`, {
              description: nova.descricao || undefined,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [usuario?.id, isAdmin]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowForm(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNovidades = async () => {
    const { data } = await supabase
      .from('novidades')
      .select('*')
      .eq('ativo', true)
      .order('criado_em', { ascending: false })
      .limit(20);
    if (data) setNovidades(data as Novidade[]);
  };

  const fetchLidas = async () => {
    if (!usuario?.id) return;
    const { data } = await supabase
      .from('novidades_lidas')
      .select('novidade_id')
      .eq('usuario_id', usuario.id);
    if (data) setLidas(new Set(data.map(r => r.novidade_id)));
  };

  const handleOpen = async () => {
    setOpen(prev => !prev);
    if (!open && usuario?.id && unreadCount > 0) {
      // Marcar todas como lidas
      const naoLidas = novidades.filter(n => !lidas.has(n.id));
      const inserts = naoLidas.map(n => ({
        usuario_id: usuario.id,
        novidade_id: n.id,
      }));
      if (inserts.length > 0) {
        await supabase.from('novidades_lidas').upsert(inserts, { onConflict: 'usuario_id,novidade_id' });
        setLidas(prev => new Set([...prev, ...naoLidas.map(n => n.id)]));
      }
    }
  };

  const handlePost = async () => {
    if (!fTitulo.trim()) { toast.error('Título obrigatório'); return; }
    setPosting(true);
    const { error } = await supabase.from('novidades').insert({
      titulo: fTitulo.trim(),
      descricao: fDescricao.trim() || null,
      tipo: fTipo,
      emoji: fEmoji,
    });
    if (error) { toast.error('Erro ao postar'); setPosting(false); return; }
    toast.success('Novidade publicada!');
    setFTitulo(''); setFDescricao(''); setFTipo('feature'); setFEmoji('✨');
    setShowForm(false);
    setPosting(false);
  };

  const unreadCount = novidades.filter(n => !lidas.has(n.id)).length;

  return (
    <div className="relative" ref={panelRef}>
      {/* Botão sininho */}
      <button
        onClick={handleOpen}
        className="relative h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Novidades"
      >
        <Bell className="h-4 w-4" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Painel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-card border border-border shadow-lg dark:shadow-[0_0_20px_-5px_hsl(220_100%_50%/0.15)] z-50 overflow-hidden"
          >
            {/* Header do painel */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-heading font-semibold text-foreground">Novidades</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-ui font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-pill">
                    {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {isAdmin && (
                  <button
                    onClick={() => setShowForm(p => !p)}
                    className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Publicar novidade"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => { setOpen(false); setShowForm(false); }}
                  className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Form admin */}
            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-b border-border"
                >
                  <div className="p-4 space-y-3 bg-muted/30">
                    <p className="text-[10px] font-ui font-semibold text-primary uppercase tracking-wider">Publicar novidade</p>

                    {/* Tipo + Emoji */}
                    <div className="flex gap-2">
                      <select
                        value={fTipo}
                        onChange={e => setFTipo(e.target.value as TipoNovidade)}
                        className="flex-1 text-xs font-ui bg-background border border-border rounded-lg px-2 py-1.5 text-foreground"
                      >
                        <option value="feature">✨ Novidade</option>
                        <option value="melhoria">⚡ Melhoria</option>
                        <option value="correcao">🔧 Correção</option>
                        <option value="aviso">⚠️ Aviso</option>
                      </select>
                      <input
                        value={fEmoji}
                        onChange={e => setFEmoji(e.target.value)}
                        placeholder="Emoji"
                        maxLength={4}
                        className="w-14 text-center text-sm bg-background border border-border rounded-lg px-2 py-1.5 font-ui"
                      />
                    </div>

                    <input
                      value={fTitulo}
                      onChange={e => setFTitulo(e.target.value)}
                      placeholder="Título da novidade *"
                      className="w-full text-xs font-ui bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground"
                    />
                    <textarea
                      value={fDescricao}
                      onChange={e => setFDescricao(e.target.value)}
                      placeholder="Descrição (opcional)"
                      rows={2}
                      className="w-full text-xs font-ui bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground resize-none"
                    />
                    <button
                      onClick={handlePost}
                      disabled={posting || !fTitulo.trim()}
                      className="w-full text-xs font-ui font-semibold bg-primary text-primary-foreground rounded-lg py-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {posting ? 'Publicando...' : '📢 Publicar agora'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Lista de novidades */}
            <div className="max-h-[380px] overflow-y-auto">
              {novidades.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-2xl mb-2">🔔</p>
                  <p className="text-xs font-ui text-muted-foreground">Nenhuma novidade ainda</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {novidades.map(n => {
                    const isNova = !lidas.has(n.id);
                    const meta = TIPO_META[n.tipo] || TIPO_META.feature;
                    return (
                      <div
                        key={n.id}
                        className={`px-4 py-3.5 transition-colors ${isNova ? 'bg-primary/5' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl leading-none mt-0.5">{n.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-ui font-medium px-1.5 py-0.5 rounded-pill ${meta.color}`}>
                                {meta.icon}
                                {meta.label}
                              </span>
                              {isNova && (
                                <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
                              )}
                            </div>
                            <p className="text-sm font-ui font-semibold text-foreground leading-snug">{n.titulo}</p>
                            {n.descricao && (
                              <p className="text-xs font-body text-muted-foreground mt-0.5 leading-relaxed">{n.descricao}</p>
                            )}
                            <p className="text-[10px] font-ui text-muted-foreground/60 mt-1.5">
                              {new Date(n.criado_em).toLocaleDateString('pt-BR', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
