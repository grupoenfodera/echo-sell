import { Outlet } from 'react-router-dom';
import { useState, useCallback } from 'react';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';
import { useIsMobile } from '@/hooks/use-mobile';

const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 320;
const SIDEBAR_DEFAULT = 192;
const STORAGE_KEY = 'svp-sidebar-width';

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

export default function AppLayout() {
  const [sidebarWidth, setSidebarWidth] = useState(getInitialWidth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleWidthChange = useCallback((w: number) => {
    const clamped = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, w));
    setSidebarWidth(clamped);
    try { localStorage.setItem(STORAGE_KEY, String(clamped)); } catch {}
  }, []);

  const closeMobile = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={closeMobile}
        />
      )}

      <AppSidebar
        width={sidebarWidth}
        onWidthChange={handleWidthChange}
        mobileOpen={mobileMenuOpen}
        onMobileClose={closeMobile}
      />

      <div
        className="flex flex-col flex-1 overflow-hidden"
        style={{ marginLeft: isMobile ? 0 : sidebarWidth }}
      >
        <AppTopbar onToggleMobile={() => setMobileMenuOpen(o => !o)} />

        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
