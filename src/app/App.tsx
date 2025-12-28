import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { TrackPage } from './pages/TrackPage';
import { HistoryPage } from './pages/HistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { FriendsPage } from './pages/FriendsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { Navigation } from './components/Navigation';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SidebarProvider, useSidebar } from './context/SidebarContext';
import { useIsMobile } from './components/ui/use-mobile';
import { ToastContainer } from './utils/toast';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return currentUser ? <>{children}</> : <Navigate to="/login" />;
}

function AuthenticatedLayoutContent({ children }: { children: React.ReactNode }) {
  const { isOpen, isCollapsed } = useSidebar();
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen bg-black">
      <Navigation />
      <main 
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isMobile 
            ? 'ml-0' 
            : isCollapsed 
              ? 'ml-16' 
              : 'ml-64'
        }`}
      >
        {children}
      </main>
    </div>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AuthenticatedLayoutContent>{children}</AuthenticatedLayoutContent>
    </SidebarProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastContainer />
      <Router>
        <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/profile/:username" element={<PublicProfilePage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <AuthenticatedLayout>
                <DashboardPage />
              </AuthenticatedLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/track"
          element={
            <PrivateRoute>
              <AuthenticatedLayout>
                <TrackPage />
              </AuthenticatedLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/history"
          element={
            <PrivateRoute>
              <AuthenticatedLayout>
                <HistoryPage />
              </AuthenticatedLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <PrivateRoute>
              <AuthenticatedLayout>
                <AnalyticsPage />
              </AuthenticatedLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/friends"
          element={
            <PrivateRoute>
              <AuthenticatedLayout>
                <FriendsPage />
              </AuthenticatedLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <AuthenticatedLayout>
                <SettingsPage />
              </AuthenticatedLayout>
            </PrivateRoute>
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
    </AuthProvider>
  );
}

export default App;
