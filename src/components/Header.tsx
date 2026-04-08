import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Moon, Sun, LogOut, User, Dna, ClipboardList, Users, ChevronDown, Package, UserCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logoSvp from '@/assets/logo-svp.png';
import NotificationBell from '@/components/NotificationBell';

const TONE_NAME: Record<string, string> = {
  consultivo: 'Consultivo',
  direto: 'Direto',
  relacional: 'Relacional',
  tecnico: 'Técnico',
  svp_puro: 'SVP Puro',
};
const TONE_ICON: Record<string, string> = {
  consultivo: '🔵',
  direto: '🟡',
  relacional: '🟢',
  tecnico: '🟣',
  svp_puro: '⚪',
};

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { usuario, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [dnaBadge, setDnaBadge] = useState<{ tom: string; contexto: string } | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!usuario?.id) return;
    supabase
      .from('usuario_dna')
      .select('tom_primario, contexto')
      .eq('usuario_id', usuario.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.tom_primario) {
          setDnaBadge({ tom: data.tom_primario, contexto: data.contexto || '' });
        }
      });
  }, [usuario?.id]);

  const handleLogout = async () => {
    setOpen(false);
    await signOut();
    navigate('/login');
  };

  const initial = usuario?.nome?.charAt(0)?.toUpperCase() || 'U';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[54px] bg-elevated border-b border-border flex items-center px-4 sm:px-6 no-print">
      <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <img src={logoSvp} alt="Método SVP" className="h-16" />
        <span className="text-[10px] font-ui font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-pill">
          MVP
        </span>
        <span className="text-xs text-muted-foreground font-body italic hidden sm:inline ml-1">
          by Thammy Manuella
        </span>
      </Link>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Sininho de novidades */}
        <NotificationBell />

        {/* DNA Badge */}
        {dnaBadge && (
          <button
            onClick={() => navigate('/perfil/dna')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-card border border-border text-[10px] font-ui text-foreground hover:border-muted-foreground/40 transition-colors"
          >
            <span>{TONE_ICON[dnaBadge.tom] || '⚪'}</span>
            <span>{TONE_NAME[dnaBadge.tom] || dnaBadge.tom}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{dnaBadge.contexto}</span>
          </button>
        )}

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 h-8 px-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground text-xs font-bold font-ui">{initial}</span>
            </div>
            <span className="text-sm font-ui text-foreground hidden sm:inline max-w-[120px] truncate">
              {usuario?.nome?.split(' ')[0] || 'Usuário'}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-card border border-border shadow-lg dark:shadow-[0_0_20px_-5px_hsl(220_100%_50%/0.15)] py-2 z-50">
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="text-primary-foreground text-sm font-bold font-ui">{initial}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-ui font-semibold text-foreground truncate">{usuario?.nome || 'Usuário'}</p>
                    <p className="text-[11px] font-ui text-muted-foreground truncate">{usuario?.email}</p>
                  </div>
                </div>
              </div>

              <div className="py-1">
                <MenuLink icon={<User className="h-3.5 w-3.5" />} label="Meu Perfil" onClick={() => { setOpen(false); navigate('/perfil'); }} />
                <MenuLink icon={<Dna className="h-3.5 w-3.5" />} label="DNA Comercial" onClick={() => { setOpen(false); navigate('/perfil/dna'); }} />
                <MenuLink icon={<Package className="h-3.5 w-3.5" />} label="Produtos" onClick={() => { setOpen(false); navigate('/produtos'); }} />
                <MenuLink icon={<UserCircle className="h-3.5 w-3.5" />} label="Personas" onClick={() => { setOpen(false); navigate('/personas'); }} />
                {usuario?.email === 'grupoenfodera@gmail.com' ? (
                  <MenuLink icon={<Users className="h-3.5 w-3.5" />} label="CRM" onClick={() => { setOpen(false); navigate('/crm'); }} />
                ) : (
                  <MenuLink icon={<Users className="h-3.5 w-3.5" />} label="CRM (Em Breve)" onClick={() => {}} disabled />
                )}
                <MenuLink icon={<ClipboardList className="h-3.5 w-3.5" />} label="CRM / Histórico" onClick={() => { setOpen(false); navigate('/crm'); }} />
              </div>

              <div className="border-t border-border pt-1">
                <MenuLink icon={<LogOut className="h-3.5 w-3.5" />} label="Sair" onClick={handleLogout} />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const MenuLink = ({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) => (
  <button
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-ui transition-colors ${
      disabled
        ? 'text-muted-foreground/50 cursor-not-allowed'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
    }`}
  >
    {icon}
    {label}
  </button>
);

export default Header;
