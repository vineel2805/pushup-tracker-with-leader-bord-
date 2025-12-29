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
import { ErrorBoundary } from './components/ErrorBoundary';

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
    <ErrorBoundary>
      <AuthProvider>
        <ToastContainer />
        <Router>
          <ErrorBoundary>
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
                    <ErrorBoundary>
                      <DashboardPage />
                    </ErrorBoundary>
                  </AuthenticatedLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/track"
              element={
                <PrivateRoute>
                  <AuthenticatedLayout>
                    <ErrorBoundary>
                      <TrackPage />
                    </ErrorBoundary>
                  </AuthenticatedLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/history"
              element={
                <PrivateRoute>
                  <AuthenticatedLayout>
                    <ErrorBoundary>
                      <HistoryPage />
                    </ErrorBoundary>
                  </AuthenticatedLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <PrivateRoute>
                  <AuthenticatedLayout>
                    <ErrorBoundary>
                      <AnalyticsPage />
                    </ErrorBoundary>
                  </AuthenticatedLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/friends"
              element={
                <PrivateRoute>
                  <AuthenticatedLayout>
                    <ErrorBoundary>
                      <FriendsPage />
                    </ErrorBoundary>
                  </AuthenticatedLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <AuthenticatedLayout>
                    <ErrorBoundary>
                      <SettingsPage />
                    </ErrorBoundary>
                  </AuthenticatedLayout>
                </PrivateRoute>
              }
            />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          </ErrorBoundary>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
