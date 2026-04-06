import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import DnaProfile from "./pages/DnaProfile";
import History from "./pages/History";
import CRM from "./pages/CRM";
import CRMCliente from "./pages/CRMCliente";
import Gerar from "./pages/Gerar";
import Roteiro from "./pages/Roteiro";
import RoteiroLoading from "./pages/RoteiroLoading";
import Produtos from "./pages/Produtos";
import Personas from "./pages/Personas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/* ── Auth guards ─────────────────────────────────── */

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading, usuario } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  const skipRedirectPaths = ['/bem-vindo', '/onboarding'];
  if (usuario?.primeiro_acesso && !skipRedirectPaths.includes(location.pathname)) {
    return <Navigate to="/bem-vindo" replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
};

/* ── App ─────────────────────────────────────────── */

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* ── Public routes ── */}
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/esqueci-senha" element={<ForgotPassword />} />
              <Route path="/redefinir-senha" element={<ResetPassword />} />

              {/* ── Full-screen protected flows (no sidebar) ── */}
              <Route path="/bem-vindo" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route
                path="/loading/:sessao_id"
                element={<ProtectedRoute><RoteiroLoading /></ProtectedRoute>}
              />
              <Route
                path="/roteiro/:sessao_id"
                element={<ProtectedRoute><Roteiro /></ProtectedRoute>}
              />

              {/* ── Sidebar layout routes ── */}
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/gerar" element={<Gerar />} />
                <Route path="/crm" element={<CRM />} />
                <Route path="/crm/:clienteId" element={<CRMCliente />} />
                <Route path="/perfil" element={<Profile />} />
                <Route path="/perfil/dna" element={<DnaProfile />} />
                <Route path="/dna-comercial" element={<DnaProfile />} />
                <Route path="/perfil/historico" element={<History />} />
                <Route path="/historico" element={<History />} />
                <Route path="/produtos" element={<Produtos />} />
                <Route path="/personas" element={<Personas />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
