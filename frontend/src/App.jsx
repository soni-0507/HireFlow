import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './store/auth.js';
import { PageLoader, Toasts } from './components/ui.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Candidates from './pages/Candidates.jsx';
import CandidateDetail from './pages/CandidateDetail.jsx';
import Pipeline from './pages/Pipeline.jsx';
import Interviews from './pages/Interviews.jsx';
import FeedbackPage from './pages/FeedbackPage.jsx';
import Activity from './pages/Activity.jsx';

/** Protected route: requires login, optionally restricted to certain roles. */
function Protected({ roles }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

function GuestOnly() {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : <Outlet />;
}

export default function App() {
  const { init, ready, logout } = useAuth();

  useEffect(() => {
    init();
    const onExpired = () => logout();
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [init, logout]);

  if (!ready) return <PageLoader label="Starting up..." />;

  return (
    <>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>

        <Route element={<Protected />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="candidates" element={<Candidates />} />
            <Route path="candidates/:id" element={<CandidateDetail />} />
            <Route path="interviews" element={<Interviews />} />
            <Route path="feedback" element={<FeedbackPage />} />
            <Route element={<Protected roles={['recruiter']} />}>
              <Route path="pipeline" element={<Pipeline />} />
              <Route path="activity" element={<Activity />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts />
    </>
  );
}
