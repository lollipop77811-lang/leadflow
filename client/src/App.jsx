import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { ToastProvider } from './lib/toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Leads from './pages/Leads';
import Pipeline from './pages/Pipeline';
import Campaigns from './pages/Campaigns';
import Settings from './pages/Settings';
import PublicForm from './pages/PublicForm';

function FullScreenLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div className="brand-mark" style={{ width: 42, height: 42, fontSize: 20 }}>
          L
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Loading workspace…</div>
      </div>
    </div>
  );
}

function Protected({ children }) {
  const { isAuthenticated, checking } = useAuth();
  const location = useLocation();
  if (checking) return <FullScreenLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          {/* public */}
          <Route path="/login" element={<Login />} />
          <Route path="/f/:slug" element={<PublicForm />} />
          <Route path="/f" element={<PublicForm />} />

          {/* dashboard */}
          <Route
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route path="/" element={<Overview />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
