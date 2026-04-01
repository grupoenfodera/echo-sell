import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

const Profile = () => {
  const { usuario, refreshUsuario } = useAuth();
  const [nome, setNome] = useState(usuario?.nome || '');
  const [savingName, setSavingName] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [recentGens, setRecentGens] = useState<any[]>([]);

  useEffect(() => {
    if (!usuario?.id) return;
    supabase
      .from('geracoes')
      .select('modalidade, nicho, criado_em')
      .eq('usuario_id', usuario.id)
      .order('criado_em', { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentGens(data || []));
  }, [usuario?.id]);

  const handleSaveName = async () => {
    if (!usuario?.id || !nome.trim()) return;
    setSavingName(true);
    await supabase.from('usuarios').update({ nome: nome.trim() }).eq('id', usuario.id);
    await refreshUsuario();
    toast.success('Nome atualizado.');
    setSavingName(false);
  };

  const initial = usuario?.nome?.charAt(0)?.toUpperCase() || 'U';
  const consultasMes = usuario?.consultas_mes || 0;
  const limiteMes = 100; // configurable
  const pct = Math.min((consultasMes / limiteMes) * 100, 100);
  const barColor = pct > 90 ? 'bg-err' : pct > 70 ? 'bg-warn' : 'bg-ok';

  return (
    <>
      <Header />
      <main className="pt-[70px] pb-16 px-4 sm:px-6">
        <div className="max-w-[920px] mx-auto">
          <h1 className="font-heading text-2xl text-foreground mb-6">Meu Perfil</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Personal data */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="text-base font-heading">Dados pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-[60px] w-[60px] rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="text-primary-foreground text-xl font-bold font-ui">{initial}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-ui font-semibold text-foreground truncate">{usuario?.nome}</p>
                    <p className="text-xs font-ui text-muted-foreground truncate">{usuario?.email}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-ui text-muted-foreground mb-1 block">Nome</label>
                  <Input value={nome} onChange={e => setNome(e.target.value)} className="bg-card border-border font-ui" />
                </div>

                <div>
                  <label className="text-xs font-ui text-muted-foreground mb-1 block">E-mail</label>
                  <Input value={usuario?.email || ''} readOnly className="bg-card border-border font-ui text-muted-foreground opacity-70" />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveName} disabled={savingName} className="rounded-pill" size="sm">
                    {savingName ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowPasswordModal(true)} className="rounded-pill" size="sm">
                    Alterar senha
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Right: Plan & Usage */}
            <div className="space-y-6">
              <Card className="card-glow">
                <CardHeader>
                  <CardTitle className="text-base font-heading flex items-center gap-2">
                    Uso e Plano
                    <span className="text-[10px] font-ui font-semibold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-pill">
                      {usuario?.plano || 'Básico'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-ui text-muted-foreground mb-1">
                      <span>{consultasMes} de {limiteMes} consultas</span>
                      <span>{Math.round(pct)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-pill bg-muted overflow-hidden">
                      <div className={`h-full rounded-pill transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <p className="text-xs font-ui text-muted-foreground">
                    Total de scripts gerados: <span className="text-foreground font-semibold">{usuario?.consultas_total || 0}</span>
                  </p>
                </CardContent>
              </Card>

              <Card className="card-glow">
                <CardHeader>
                  <CardTitle className="text-base font-heading">Atividade recente</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentGens.length === 0 ? (
                    <p className="text-xs font-ui text-muted-foreground">Nenhuma geração ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {recentGens.map((g, i) => (
                        <div key={i} className="flex items-center justify-between text-xs font-ui">
                          <span className="text-foreground uppercase font-semibold">{g.modalidade}</span>
                          <span className="text-muted-foreground">{g.nicho || '—'}</span>
                          <span className="text-muted-foreground">{new Date(g.criado_em).toLocaleDateString('pt-BR')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link to="/perfil/historico" className="text-xs font-ui text-primary hover:underline mt-3 block">
                    Ver histórico completo →
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Password modal */}
      {showPasswordModal && (
        <PasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </>
  );
};

const PasswordModal = ({ onClose }: { onClose: () => void }) => {
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (newPass.length < 8) { setError('Mínimo 8 caracteres.'); return; }
    if (newPass !== confirmPass) { setError('As senhas não coincidem.'); return; }
    setSaving(true);
    const { error: e } = await supabase.auth.updateUser({ password: newPass });
    if (e) { setError(e.message); setSaving(false); return; }
    toast.success('Senha alterada com sucesso.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4">
        <h3 className="font-heading text-lg text-foreground">Alterar senha</h3>
        <div className="relative">
          <Input
            type={showNew ? 'text' : 'password'}
            placeholder="Nova senha"
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
            className="bg-card border-border font-ui pr-10"
          />
          <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" tabIndex={-1}>
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Input
          type="password"
          placeholder="Confirmar nova senha"
          value={confirmPass}
          onChange={e => setConfirmPass(e.target.value)}
          className="bg-card border-border font-ui"
        />
        {error && <p className="text-xs text-destructive font-ui">{error}</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} size="sm" className="rounded-pill">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} size="sm" className="rounded-pill">{saving ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
