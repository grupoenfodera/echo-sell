import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';

/**
 * AppLayout — Sidebar + Topbar + scrollable content area.
 * Used for all authenticated pages except full-screen flows
 * (Roteiro, RoteiroLoading, Login, Welcome, Onboarding).
 */
export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left sidebar — fixed, 192px */}
      <AppSidebar />

      {/* Right side — topbar + scrollable content */}
      <div
        className="flex flex-col flex-1 overflow-hidden"
        style={{ marginLeft: '192px' }}
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
