import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Moon, Sun, LogOut, User, Dna, Package, UserCircle, Menu } from 'lucide-react';

/* ── Brand tokens ───────────────────────────────── */
const BRAND = {
  blue:    '#195FA5',
  text:    '#262522',
  muted:   '#595956',
  mutedLg: '#8B8B88',
  bg:      '#FFFFFF',
  border:  '#E4E4E0',
  hover:   '#F4F4F2',
};

/* ── Plan limits ─────────────────────────────────── */
const PLAN_LIMITS: Record<string, number> = {
  basico: 10,
  pro: 50,
  enterprise: 200,
  pastor: 30,
};

export default function AppTopbar({ onToggleMobile }: { onToggleMobile?: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const { usuario, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initial = usuario?.nome?.charAt(0)?.toUpperCase() || 'U';

  const handleLogout = async () => {
    setOpen(false);
    await signOut();
    navigate('/login');
  };

  /* Dark mode overrides */
  const isDark = theme === 'dark';
  const topBg     = isDark ? '#0F1014' : BRAND.bg;
  const topBorder = isDark ? '#2B2F3C' : BRAND.border;
  const iconColor = isDark ? '#7A7F92' : BRAND.mutedLg;
  const iconHover = isDark ? '#E8EAF0' : BRAND.text;
  const dropBg    = isDark ? '#161820' : BRAND.bg;
  const dropBorder = isDark ? '#2B2F3C' : BRAND.border;
  const dropText  = isDark ? '#E8EAF0' : BRAND.text;
  const dropMuted = isDark ? '#7A7F92' : BRAND.muted;

  /* ── Progress bar logic ────────────────────────── */
  const plano = usuario?.plano || 'basico';
  const limit = PLAN_LIMITS[plano] ?? PLAN_LIMITS.basico;
  const isPastor = plano === 'pastor';

  const used = isPastor
    ? limit - (usuario?.scripts_restantes ?? limit)
    : (usuario?.consultas_mes ?? 0);

  const percent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

  // Pastor: amber earlier (50%) since it's a fixed quota
  const barColor = isPastor
    ? (percent > 90 ? '#ff6b4a' : percent > 50 ? '#f5c842' : BRAND.blue)
    : (percent > 90 ? '#ff6b4a' : percent > 70 ? '#f5c842' : BRAND.blue);

  const barBg = isDark ? '#2B2F3C' : BRAND.border;

  const label = isPastor
    ? `${usuario?.scripts_restantes ?? 0} restantes`
    : `${used} de ${limit} roteiros`;

  return (
    <header
      className="flex items-center px-4 gap-3 shrink-0 no-print"
      style={{
        height: '52px',
        background: topBg,
        borderBottom: `1px solid ${topBorder}`,
      }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onToggleMobile}
        className="md:hidden flex items-center justify-center rounded-lg transition-colors shrink-0"
        style={{ width: '36px', height: '36px', color: iconColor, background: 'transparent' }}
        aria-label="Abrir menu"
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = isDark ? '#ffffff08' : BRAND.hover;
          (e.currentTarget as HTMLButtonElement).style.color = iconHover;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = iconColor;
        }}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Center — Usage progress bar */}
      <div className="flex-1 flex justify-center">
        {usuario ? (
          <button
            onClick={() => navigate('/perfil')}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-full transition-colors"
            style={{
              background: isDark ? '#ffffff06' : '#F4F4F2',
              border: `1px solid ${isDark ? '#2B2F3C' : BRAND.border}`,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? '#3B4050' : '#C4C4C0';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? '#2B2F3C' : BRAND.border;
            }}
          >
            <div
              className="rounded-full overflow-hidden shrink-0"
              style={{ width: '120px', height: '4px', background: barBg }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${percent}%`, background: barColor }}
              />
            </div>
            <span
              className="text-[11px] font-medium whitespace-nowrap"
              style={{ color: isDark ? '#7A7F92' : BRAND.muted }}
            >
              {label}
            </span>
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
            style={{ color: isDark ? '#E8EAF0' : BRAND.text }}
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
            <span style={{ color: isDark ? '#2B2F3C' : BRAND.border, fontSize: '12px' }}>•</span>
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
  const normalColor = isDark ? '#7A7F92' : BRAND.muted;
  const hoverColor  = isDark ? '#E8EAF0' : BRAND.text;
  const hoverBg     = isDark ? '#ffffff06' : BRAND.hover;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors"
      style={{ color: danger ? '#E03E3E' : normalColor, background: 'transparent' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
        (e.currentTarget as HTMLButtonElement).style.color = danger ? '#E05555' : hoverColor;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = danger ? '#E03E3E' : normalColor;
      }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  );
}
