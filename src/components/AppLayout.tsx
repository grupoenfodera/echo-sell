import { Outlet } from 'react-router-dom';
import { useState, useCallback } from 'react';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';

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

/**
 * AppLayout — Sidebar + Topbar + scrollable content area.
 * Used for all authenticated pages except full-screen flows
 * (Roteiro, RoteiroLoading, Login, Welcome, Onboarding).
 */
export default function AppLayout() {
  const [sidebarWidth, setSidebarWidth] = useState(getInitialWidth);

  const handleWidthChange = useCallback((w: number) => {
    const clamped = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, w));
    setSidebarWidth(clamped);
    try { localStorage.setItem(STORAGE_KEY, String(clamped)); } catch {}
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left sidebar — resizable */}
      <AppSidebar width={sidebarWidth} onWidthChange={handleWidthChange} />

      {/* Right side — topbar + scrollable content */}
      <div
        className="flex flex-col flex-1 overflow-hidden"
        style={{ marginLeft: sidebarWidth }}
      >
        <AppTopbar />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
