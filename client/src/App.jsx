import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { Navbar } from './components/Navbar.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { PatientRosterPage } from './pages/PatientRosterPage.jsx';
import { SchedulerPage } from './pages/SchedulerPage.jsx';
import { StaffDashboardPage } from './pages/StaffDashboardPage.jsx';
import { AnalyticsPage } from './pages/AnalyticsPage.jsx';

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      {children}
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout><StaffDashboardPage /></Layout>} />
        <Route path="/patients" element={<Layout><PatientRosterPage /></Layout>} />
        <Route path="/schedule" element={<Layout><SchedulerPage /></Layout>} />
      </Route>
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route path="/analytics" element={<Layout><AnalyticsPage /></Layout>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
