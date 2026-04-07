import { Outlet } from 'react-router-dom';
import { useState, useCallback } from 'react';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';
import { useIsMobile } from '@/hooks/use-mobile';

const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 320;
const SIDEBAR_DEFAULT = 192;
const SIDEBAR_COLLAPSED = 56;
const STORAGE_KEY = 'svp-sidebar-width';
const COLLAPSED_KEY = 'svp-sidebar-collapsed';

function getInitialWidth(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const n = Number(stored);
      if (n >= SIDEBAR_MIN && n <= SIDEBAR_MAX) return n;
    }
  } catch {}
  return SIDEBAR_DEFAULT;
}

function getInitialCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {}
  return false;
}

export default function AppLayout() {
  const [sidebarWidth, setSidebarWidth] = useState(getInitialWidth);
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleWidthChange = useCallback((w: number) => {
    const clamped = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, w));
    setSidebarWidth(clamped);
    try { localStorage.setItem(STORAGE_KEY, String(clamped)); } catch {}
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSED_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  const closeMobile = useCallback(() => setMobileMenuOpen(false), []);

  const effectiveWidth = isMobile ? 0 : (collapsed ? SIDEBAR_COLLAPSED : sidebarWidth);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Backdrop for mobile drawer */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={closeMobile}
        />
      )}

      {/* Left sidebar */}
      <AppSidebar
        width={collapsed && !isMobile ? SIDEBAR_COLLAPSED : sidebarWidth}
        collapsed={collapsed && !isMobile}
        onWidthChange={handleWidthChange}
        onToggleCollapse={toggleCollapsed}
        mobileOpen={mobileMenuOpen}
        onMobileClose={closeMobile}
      />

      {/* Right side — topbar + scrollable content */}
      <div
        className="flex flex-col flex-1 overflow-hidden transition-[margin-left] duration-200 ease-in-out"
        style={{ marginLeft: effectiveWidth }}
      >
        <AppTopbar onToggleMobile={() => setMobileMenuOpen(o => !o)} />

        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
