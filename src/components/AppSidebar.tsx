import { useNavigate, NavLink } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { svpApi } from '@/lib/api-svp';
import { useAuth } from '@/contexts/AuthContext';
import {
  Zap, Users, Dna, UserCircle, Package, UserRound,
} from 'lucide-react';

/* ── Brand tokens ─────────────────────────────────
   Primary blue : #195FA5
   Text dark    : #262522
   Muted        : #595956
   BG off-white : #F2F2F0
   Card white   : #FFFFFF
   Border       : #E4E4E0
─────────────────────────────────────────────────── */

const BRAND = {
  blue:      '#195FA5',
  blueBg:    '#195FA514',
  blueLight: '#EEF4FB',
  text:      '#262522',
  muted:     '#595956',
  mutedLg:   '#8B8B88',
  bg:        '#FFFFFF',
  border:    '#E4E4E0',
  hover:     '#F4F4F2',
};

/* ── Nav item ────────────────────────────────────── */

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: number | null;
  end?: boolean;
}

function NavItem({ to, icon: Icon, label, badge, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className="block"
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '7px 10px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 500,
        textDecoration: 'none',
        color: isActive ? BRAND.blue : BRAND.muted,
        background: isActive ? BRAND.blueBg : 'transparent',
        transition: 'all 0.15s',
      })}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        if (!el.classList.contains('active') && !el.getAttribute('aria-current')) {
          el.style.background = BRAND.hover;
          el.style.color = BRAND.text;
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        if (!el.getAttribute('aria-current')) {
          el.style.background = 'transparent';
          el.style.color = BRAND.muted;
        }
      }}
    >
      {({ isActive }) => (
        <>
          <Icon
            style={{
              width: '15px', height: '15px', flexShrink: 0,
              color: isActive ? BRAND.blue : 'currentColor',
            }}
          />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </span>
          {badge != null && badge > 0 && (
            <span
              style={{
                flexShrink: 0,
                minWidth: '18px', height: '18px',
                padding: '0 4px',
                borderRadius: '9999px',
                fontSize: '10px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: BRAND.blueBg,
                color: BRAND.blue,
              }}
            >
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

/* ── Section label ───────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      padding: '0 10px',
      marginBottom: '4px',
      fontSize: '10px',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: BRAND.mutedLg,
    }}>
      {children}
    </p>
  );
}

/* ── Sidebar ─────────────────────────────────────── */

interface AppSidebarProps {
  width?: number;
  onWidthChange?: (w: number) => void;
}

export default function AppSidebar({ width = 192, onWidthChange }: AppSidebarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [crmCount, setCrmCount] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number>(0);
  const dragStartWidth = useRef<number>(width);

  /* Fetch active client count for CRM badge */
  useEffect(() => {
    if (!user?.id) return;
    svpApi.listarClientes(1, 200)
      .then(res => {
        const ativos = (res.clientes ?? []).filter(
          c => !['ganho', 'perdido'].includes(c.status)
        );
        setCrmCount(ativos.length || (res.total ?? 0));
      })
      .catch(() => {});
  }, [user?.id]);

  /* Drag-to-resize logic */
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartWidth.current = width;
    setIsDragging(true);

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - dragStartX.current;
      onWidthChange?.(dragStartWidth.current + delta);
    };
    const onUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [width, onWidthChange]);

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col no-print"
      style={{
        width,
        background: BRAND.bg,
        borderRight: `1px solid ${BRAND.border}`,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 px-4 shrink-0"
        style={{ height: '52px', borderBottom: `1px solid ${BRAND.border}` }}
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 hover:opacity-75 transition-opacity"
        >
          <span
            style={{
              fontSize: '15px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: BRAND.text,
              fontFamily: "'Albert Sans', sans-serif",
            }}
          >
            SVP
          </span>
          <span style={{ color: BRAND.blue, fontSize: '18px', lineHeight: 1 }}>•</span>
        </button>
      </div>

      {/* Scrollable nav content */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {/* CTA primário */}
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all"
          style={{
            background: BRAND.blue,
            color: '#fff',
            boxShadow: `0 2px 8px -2px ${BRAND.blue}55`,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#1a6cb8';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = BRAND.blue;
          }}
        >
          <Zap className="h-4 w-4 shrink-0" />
          Gerar Roteiro
        </button>

        {/* VENDAS */}
        <div>
          <SectionLabel>Vendas</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <NavItem to="/crm" icon={Users} label="CRM" badge={crmCount} />
          </div>
        </div>

        {/* CONFIGURAÇÕES */}
        <div>
          <SectionLabel>Configurações</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <NavItem to="/perfil/dna" icon={Dna} label="Meu DNA" />
            <NavItem to="/produtos" icon={Package} label="Produtos" />
            <NavItem to="/personas" icon={UserRound} label="Personas" />
            <NavItem to="/perfil" end icon={UserCircle} label="Conta" />
          </div>
        </div>
      </nav>

      {/* ── Resize handle ────────────────────────────
          8px hit area on the right edge of the sidebar.
          Shows a 2px accent line on hover / while dragging.
      ─────────────────────────────────────────────── */}
      <div
        onMouseDown={handleDragStart}
        title="Arrastar para redimensionar"
        style={{
          position: 'absolute',
          top: 0,
          right: -4,
          bottom: 0,
          width: 8,
          cursor: 'col-resize',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Visual indicator — thin line that appears on hover/drag */}
        <div
          style={{
            width: 2,
            height: '100%',
            borderRadius: 1,
            background: isDragging ? BRAND.blue : 'transparent',
            transition: isDragging ? 'none' : 'background 0.2s',
          }}
          className="group-hover:bg-red-500"
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.background = `${BRAND.blue}80`;
          }}
          onMouseLeave={e => {
            if (!isDragging)
              (e.currentTarget as HTMLDivElement).style.background = 'transparent';
          }}
        />
      </div>
    </aside>
  );
}
