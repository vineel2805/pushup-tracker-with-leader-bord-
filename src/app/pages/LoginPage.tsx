import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { logIn, signInWithGoogle, isRedirectInProgress } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../utils/authErrors';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [processingRedirect, setProcessingRedirect] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { currentUser, userProfile, loading: authLoading, redirectLoading, redirectError, clearRedirectError } = useAuth();

  // Check for redirect state on mount
  useEffect(() => {
    if (isRedirectInProgress()) {
      //console.log('[LoginPage] 🔄 Processing Google redirect...');
      setProcessingRedirect(true);
    }
  }, []);

  // Handle redirect error from context
  useEffect(() => {
    if (redirectError) {
      setError(redirectError);
      clearRedirectError();
      setProcessingRedirect(false);
    }
  }, [redirectError, clearRedirectError]);

  // Redirect if already logged in
  useEffect(() => {
    //console.log('[LoginPage] Auth state:', { 
      //currentUser: !!currentUser, 
      //userProfile: !!userProfile, 
      //authLoading,
      //redirectLoading,
      //processingRedirect 
    //});
    
    if (!authLoading && !redirectLoading && currentUser && userProfile) {
     // console.log('[LoginPage] ✅ User authenticated with profile, redirecting to dashboard');
      setProcessingRedirect(false);
      navigate('/dashboard', { replace: true });
    } else if (!authLoading && !redirectLoading && !currentUser && processingRedirect) {
      // Redirect completed but no user - something went wrong
      //console.log('[LoginPage] ⚠️ Redirect completed but no user');
      setProcessingRedirect(false);
    }
  }, [currentUser, userProfile, authLoading, redirectLoading, navigate, processingRedirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const authUser = await logIn(email, password, rememberMe);
      
      // Check if email is verified
      if (!authUser.emailVerified) {
        navigate('/verify-email');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      const result = await signInWithGoogle();
      // If result is null, we're redirecting (mobile flow)
      if (result) {
        // Popup flow completed successfully - auth state will update and useEffect will navigate
       // console.log('[LoginPage] ✅ Google popup sign-in successful');
      }
      // If null, the page is redirecting to Google - don't do anything
    } catch (err: any) {
      console.error('[LoginPage] ❌ Google sign-in error:', err);
      setError(err.message || 'Failed to sign in with Google');
      setGoogleLoading(false);
    }
  };

  // Show loading state while checking auth/redirect or processing redirect
  if (processingRedirect || redirectLoading || (authLoading && !error)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-zinc-400 text-sm">Checking sign-in status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 lg:px-6 py-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6 lg:mb-8">
          <div className="w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <Activity className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
          </div>
        </div>

        <h1 className="text-2xl lg:text-3xl text-white text-center mb-6 lg:mb-8">Welcome Back</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 lg:space-y-6">
          <div>
            <label htmlFor="email" className="block text-zinc-400 text-sm mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 lg:py-3 bg-zinc-900/80 border border-zinc-800/60 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors text-base"
              placeholder="you@example.com"
              required
              disabled={loading || googleLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-zinc-400 text-sm mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 lg:py-3 pr-12 bg-zinc-900/80 border border-zinc-800/60 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors text-base"
                placeholder="••••••••"
                required
                disabled={loading || googleLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
                tabIndex={-1}
                disabled={loading || googleLoading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-zinc-400">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 bg-zinc-900 border-zinc-800 rounded"
                disabled={loading || googleLoading}
              />
              <span className="text-sm">Remember me</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Logging in...
              </>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-black text-zinc-400">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
          className="w-full py-3 bg-white hover:bg-zinc-100 text-zinc-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-medium"
        >
          {googleLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continue with Google
            </>
          )}
        </button>

        <p className="text-center text-zinc-400 mt-6">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="text-emerald-500 hover:text-emerald-400 transition-colors"
          >
            Sign up
          </Link>
        </p>

        <div className="mt-8 text-center">
          <Link
            to="/"
            className="text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
