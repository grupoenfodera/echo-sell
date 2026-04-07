import { useNavigate, NavLink } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { svpApi } from '@/lib/api-svp';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Zap, Users, Dna, UserCircle, Package, UserRound,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

/* ── Brand tokens ─────────────────────────────────── */

const BRAND = {
  blue:      '#4d9fff',
  blueBg:    'rgba(77,159,255,0.14)',
  blueLight: 'rgba(77,159,255,0.08)',
  text:      '#FFFFFF',
  muted:     'rgba(255,255,255,0.50)',
  mutedLg:   'rgba(255,255,255,0.28)',
  bg:        '#0c1733',
  border:    '#1a2a50',
  hover:     'rgba(255,255,255,0.07)',
};

/* ── Nav item ────────────────────────────────────── */

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: number | null;
  end?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}

function NavItem({ to, icon: Icon, label, badge, end, onClick, collapsed }: NavItemProps) {
  const link = (
    <NavLink
      to={to}
      end={end}
      className="block"
      onClick={onClick}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? '0' : '8px',
        width: '100%',
        height: collapsed ? '40px' : 'auto',
        padding: collapsed ? '0' : '9px 10px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        textDecoration: 'none',
        color: isActive ? BRAND.blue : BRAND.muted,
        background: isActive ? BRAND.blueBg : 'transparent',
        transition: 'all 0.15s',
      })}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        if (!el.getAttribute('aria-current')) {
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
              width: '16px', height: '16px', flexShrink: 0,
              color: isActive ? BRAND.blue : 'currentColor',
            }}
          />
          {!collapsed && (
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {label}
            </span>
          )}
          {!collapsed && badge != null && badge > 0 && (
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

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="text-xs">
          {label}
          {badge != null && badge > 0 && ` (${badge})`}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

/* ── Section label ───────────────────────────────── */

function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed?: boolean }) {
  if (collapsed) return null;
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
  collapsed?: boolean;
  onWidthChange?: (w: number) => void;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function AppSidebar({
  width = 192,
  collapsed = false,
  onWidthChange,
  onToggleCollapse,
  mobileOpen = false,
  onMobileClose,
}: AppSidebarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [crmCount, setCrmCount] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number>(0);
  const dragStartWidth = useRef<number>(width);

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

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (collapsed) return;
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
  }, [width, onWidthChange, collapsed]);

  const mobileTransform = isMobile
    ? mobileOpen ? 'translateX(0)' : 'translateX(-100%)'
    : 'translateX(0)';

  const handleNavClick = () => onMobileClose?.();

  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className="fixed left-0 top-0 bottom-0 z-40 flex flex-col no-print"
        style={{
          width,
          background: BRAND.bg,
          borderRight: `1px solid ${BRAND.border}`,
          transform: mobileTransform,
          transition: 'width 0.2s ease, transform 0.25s ease',
        }}
      >
        {/* Logo + collapse toggle */}
        <div
          className="flex items-center shrink-0"
          style={{
            height: '52px',
            borderBottom: `1px solid ${BRAND.border}`,
            padding: collapsed ? '0 8px' : '0 16px',
            justifyContent: collapsed ? 'center' : 'space-between',
          }}
        >
          <button
            onClick={() => { navigate('/'); onMobileClose?.(); }}
            className="flex items-center gap-1.5 hover:opacity-75 transition-opacity"
          >
            <span
              style={{
                fontSize: '15px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#FFFFFF',
                fontFamily: "'Albert Sans', sans-serif",
              }}
            >
              SVP
            </span>
            {!collapsed && <span style={{ color: '#4d9fff', fontSize: '18px', lineHeight: 1 }}>•</span>}
          </button>

          {/* Collapse toggle — desktop only */}
          {!isMobile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleCollapse}
                  className="flex items-center justify-center rounded-md transition-colors"
                  style={{
                    width: '28px',
                    height: '28px',
                    color: BRAND.muted,
                    background: 'transparent',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = BRAND.hover;
                    (e.currentTarget as HTMLButtonElement).style.color = BRAND.text;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = BRAND.muted;
                  }}
                >
                  <CollapseIcon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8} className="text-xs">
                {collapsed ? 'Expandir menu' : 'Recolher menu'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Nav content */}
        <nav
          className="flex-1 overflow-y-auto py-4 space-y-5"
          style={{ padding: collapsed ? '16px 8px' : '16px 12px' }}
        >
          {/* CTA */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { navigate('/'); onMobileClose?.(); }}
                  className="w-full flex items-center justify-center py-2.5 rounded-lg transition-all"
                  style={{
                    background: '#195FA5',
                    color: '#fff',
                    boxShadow: '0 2px 12px -2px rgba(25,95,165,0.60)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#1e6ec0';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#195FA5';
                  }}
                >
                  <Zap className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8} className="text-xs">
                Gerar Roteiro
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => { navigate('/'); onMobileClose?.(); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[14px] font-semibold transition-all"
              style={{
                background: '#195FA5',
                color: '#fff',
                boxShadow: '0 2px 12px -2px rgba(25,95,165,0.60)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#1e6ec0';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#195FA5';
              }}
            >
              <Zap className="h-4 w-4 shrink-0" />
              Gerar Roteiro
            </button>
          )}

          {/* VENDAS */}
          <div>
            <SectionLabel collapsed={collapsed}>Vendas</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <NavItem to="/crm" icon={Users} label="CRM" badge={crmCount} onClick={handleNavClick} collapsed={collapsed} />
            </div>
          </div>

          {/* CONFIGURAÇÕES */}
          <div>
            <SectionLabel collapsed={collapsed}>Configurações</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <NavItem to="/perfil/dna" icon={Dna} label="Meu DNA" onClick={handleNavClick} collapsed={collapsed} />
              <NavItem to="/produtos" icon={Package} label="Produtos" onClick={handleNavClick} collapsed={collapsed} />
              <NavItem to="/personas" icon={UserRound} label="Personas" onClick={handleNavClick} collapsed={collapsed} />
              <NavItem to="/perfil" end icon={UserCircle} label="Conta" onClick={handleNavClick} collapsed={collapsed} />
            </div>
          </div>
        </nav>

        {/* Resize handle (desktop, expanded only) */}
        {!collapsed && (
          <div
            onMouseDown={handleDragStart}
            title="Arrastar para redimensionar"
            className="hidden md:flex"
            style={{
              position: 'absolute',
              top: 0,
              right: -4,
              bottom: 0,
              width: 8,
              cursor: 'col-resize',
              zIndex: 50,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 2,
                height: '100%',
                borderRadius: 1,
                background: isDragging ? BRAND.blue : 'transparent',
                transition: isDragging ? 'none' : 'background 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = `${BRAND.blue}80`;
              }}
              onMouseLeave={e => {
                if (!isDragging)
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              }}
            />
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
