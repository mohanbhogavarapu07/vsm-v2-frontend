import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/authStore';
import { LoginPage } from '@/components/auth/LoginPage';
import { AppLayout } from '@/components/layout/AppLayout';
import Index from './pages/Index';
import ActivityPage from './pages/ActivityPage';
import DecisionsPage from './pages/DecisionsPage';
import SettingsPage from './pages/SettingsPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectSetupPage from './pages/ProjectSetupPage';
import TeamPage from './pages/TeamPage';
import ResetPassword from './pages/ResetPassword';
import AcceptInvitePage from './pages/AcceptInvitePage';
import NotFound from './pages/NotFound';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/accept-invite/:invitationId" element={<AcceptInvitePage />} />
          <Route
            path="/*"
            element={
              <AuthGate>
                <Routes>
                  {/* Project Selection */}
                  <Route path="/" element={<Navigate to="/projects" replace />} />
                  <Route element={<AppLayout />}>
                    <Route path="/projects" element={<ProjectsPage />} />
                    <Route path="/projects/:projectId/setup" element={<ProjectSetupPage />} />
                    <Route path="/projects/:projectId/teams/:teamId/board" element={<Index />} />
                    <Route path="/projects/:projectId/teams/:teamId/backlog" element={<Index />} />
                    <Route path="/projects/:projectId/teams/:teamId/task/:taskId" element={<Index />} />
                    <Route path="/projects/:projectId/teams/:teamId/settings" element={<SettingsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AuthGate>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
