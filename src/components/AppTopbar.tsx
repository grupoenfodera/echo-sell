import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Moon, Sun, LogOut, User, Dna, Package, UserCircle } from 'lucide-react';

/* ── Brand tokens ───────────────────────────────── */
const BRAND = {
  blue:    '#195FA5',
  blueBg:  '#195FA510',
  text:    '#262522',
  muted:   '#595956',
  mutedLg: '#8B8B88',
  bg:      '#FFFFFF',
  border:  '#E4E4E0',
  hover:   '#F4F4F2',
};

const TONE_NAME: Record<string, string> = {
  consultivo: 'Consultivo',
  direto: 'Direto',
  relacional: 'Relacional',
  tecnico: 'Técnico',
  svp_puro: 'SVP Puro',
};
const CONTEXTO_LABEL: Record<string, string> = {
  b2b: 'B2B',
  b2c: 'B2C',
};

export default function AppTopbar() {
  const { theme, toggleTheme } = useTheme();
  const { usuario, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [dna, setDna] = useState<{ tom: string; contexto: string } | null>(null);

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
        if (data?.tom_primario) setDna({ tom: data.tom_primario, contexto: data.contexto || '' });
      });
  }, [usuario?.id]);

  const initial = usuario?.nome?.charAt(0)?.toUpperCase() || 'U';
  const tomLabel = dna ? (TONE_NAME[dna.tom] ?? dna.tom) : null;
  const ctxLabel = dna ? (CONTEXTO_LABEL[dna.contexto] ?? dna.contexto?.toUpperCase()) : null;

  const handleLogout = async () => {
    setOpen(false);
    await signOut();
    navigate('/login');
  };

  /* Dark mode overrides for topbar surfaces */
  const isDark = theme === 'dark';
  const topBg     = isDark ? '#1a1a14' : BRAND.bg;
  const topBorder = isDark ? '#2e2e24' : BRAND.border;
  const iconColor = isDark ? '#8B8B7A' : BRAND.mutedLg;
  const iconHover = isDark ? '#C8C8B8' : BRAND.text;
  const dropBg    = isDark ? '#1e1e16' : BRAND.bg;
  const dropBorder = isDark ? '#2e2e24' : BRAND.border;
  const dropText  = isDark ? '#E8E8D8' : BRAND.text;
  const dropMuted = isDark ? '#8B8B7A' : BRAND.muted;

  return (
    <header
      className="flex items-center px-4 gap-3 shrink-0 no-print"
      style={{
        height: '52px',
        background: topBg,
        borderBottom: `1px solid ${topBorder}`,
      }}
    >
      {/* Center — DNA / context badge */}
      <div className="flex-1 flex justify-center">
        {tomLabel && ctxLabel ? (
          <button
            onClick={() => navigate('/perfil/dna')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-colors"
            style={{
              background: isDark ? '#2a2a1e' : BRAND.blueBg,
              border: `1px solid ${isDark ? '#3a3a28' : BRAND.blue + '30'}`,
              color: isDark ? '#A0A08A' : BRAND.muted,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? '#195FA555' : BRAND.blue + '60';
              (e.currentTarget as HTMLButtonElement).style.color = isDark ? '#C8C8B0' : BRAND.text;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? '#3a3a28' : BRAND.blue + '30';
              (e.currentTarget as HTMLButtonElement).style.color = isDark ? '#A0A08A' : BRAND.muted;
            }}
          >
            <span style={{ color: BRAND.blue, fontWeight: 700 }}>{tomLabel}</span>
            <span style={{ color: isDark ? '#3a3a28' : BRAND.border }}>·</span>
            <span>{ctxLabel}</span>
          </button>
        ) : (
          <div />
        )}
      </div>

      {/* Right — theme toggle + user */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center rounded-lg transition-colors"
          style={{ width: '32px', height: '32px', color: iconColor, background: 'transparent' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = isDark ? '#ffffff08' : BRAND.hover;
            (e.currentTarget as HTMLButtonElement).style.color = iconHover;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = iconColor;
          }}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* User avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg transition-colors"
            style={{ color: isDark ? '#C8C8B8' : BRAND.text }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = isDark ? '#ffffff08' : BRAND.hover;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: BRAND.blue, color: '#fff' }}
            >
              <span className="text-xs font-bold">{initial}</span>
            </div>
            <span className="text-[13px] font-medium hidden sm:inline max-w-[90px] truncate">
              {usuario?.nome?.split(' ')[0] || 'Usuário'}
            </span>
            <span style={{ color: isDark ? '#3a3a28' : BRAND.border, fontSize: '12px' }}>•</span>
          </button>

          {open && (
            <div
              className="absolute right-0 top-full mt-1.5 w-52 rounded-xl py-2 z-50"
              style={{
                background: dropBg,
                border: `1px solid ${dropBorder}`,
                boxShadow: isDark
                  ? '0 8px 32px -4px rgba(0,0,0,0.5)'
                  : '0 8px 24px -4px rgba(38,37,34,0.12)',
              }}
            >
              {/* User info */}
              <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${dropBorder}` }}>
                <p className="text-[13px] font-semibold truncate" style={{ color: dropText }}>
                  {usuario?.nome || 'Usuário'}
                </p>
                <p className="text-[11px] truncate" style={{ color: dropMuted }}>
                  {usuario?.email}
                </p>
              </div>

              <div className="py-1">
                <DropItem isDark={isDark} icon={User} label="Meu Perfil" onClick={() => { setOpen(false); navigate('/perfil'); }} />
                <DropItem isDark={isDark} icon={Dna} label="DNA Comercial" onClick={() => { setOpen(false); navigate('/perfil/dna'); }} />
                <DropItem isDark={isDark} icon={Package} label="Produtos" onClick={() => { setOpen(false); navigate('/produtos'); }} />
                <DropItem isDark={isDark} icon={UserCircle} label="Personas" onClick={() => { setOpen(false); navigate('/personas'); }} />
              </div>

              <div style={{ borderTop: `1px solid ${dropBorder}` }} className="pt-1">
                <DropItem isDark={isDark} icon={LogOut} label="Sair" onClick={handleLogout} danger />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function DropItem({
  icon: Icon, label, onClick, danger, isDark,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
  isDark?: boolean;
}) {
  const normalColor = isDark ? '#A0A08A' : BRAND.muted;
  const hoverColor  = isDark ? '#E8E8D8' : BRAND.text;
  const hoverBg     = isDark ? '#ffffff06' : BRAND.hover;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors"
      style={{ color: danger ? '#d94f4f' : normalColor, background: 'transparent' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
        (e.currentTarget as HTMLButtonElement).style.color = danger ? '#e06060' : hoverColor;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = danger ? '#d94f4f' : normalColor;
      }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  );
}
