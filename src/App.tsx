import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { ImpersonationProvider } from '@/contexts/ImpersonationContext';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Login } from '@/pages/Login';
import { Support } from '@/pages/Support';
import { Incidents } from '@/pages/Incidents';
import { IncidentDetailPage } from '@/pages/IncidentDetailPage';
import { CommandCenter } from '@/pages/CommandCenter';
import { AuditLogs } from '@/pages/AuditLogs';
import { Maintenance } from '@/pages/Maintenance';
import { Broadcasts } from '@/pages/Broadcasts';
import { FeatureFlags } from '@/pages/FeatureFlags';
import { StatusPage } from '@/pages/StatusPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ImpersonationProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/status" element={<StatusPage />} />

              {/* Protected routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Navigate to="/support" replace />} />
                <Route path="/support" element={<Support />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="/incidents/:id" element={<IncidentDetailPage />} />
                <Route path="/command-center" element={<CommandCenter />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
                <Route path="/maintenance" element={<Maintenance />} />
                <Route path="/broadcasts" element={<Broadcasts />} />
                <Route path="/feature-flags" element={<FeatureFlags />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ImpersonationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
