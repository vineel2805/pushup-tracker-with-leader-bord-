import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { signUp, signInWithGoogle, validatePasswordStrength } from '../services/authService';
import { createUserProfile, checkUsernameExists } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../utils/authErrors';

export function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const navigate = useNavigate();
  const { refreshUserProfile } = useAuth();

  const handleUsernameBlur = async () => {
    if (!username.trim()) {
      setUsernameError('');
      return;
    }

    setCheckingUsername(true);
    setUsernameError('');
    
    try {
      const exists = await checkUsernameExists(username.trim());
      if (exists) {
        setUsernameError('Username already exists. Please choose a different username.');
      }
    } catch (err: any) {
      setUsernameError(err.message || 'Error checking username');
    } finally {
      setCheckingUsername(false);
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordError('');
    
    // Real-time password validation
    if (value.length > 0) {
      const validation = validatePasswordStrength(value);
      if (!validation.valid) {
        setPasswordError(validation.error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPasswordError('');
    setLoading(true);

    try {
      // Validate Terms & Conditions
      if (!acceptedTerms) {
        setError('You must accept the Terms of Service and Privacy Policy to create an account.');
        setLoading(false);
        return;
      }

      // Validate username before creating account
      if (!username.trim()) {
        setError('Username is required.');
        setLoading(false);
        return;
      }

      // Double-check username before creating account
      const exists = await checkUsernameExists(username.trim());
      if (exists) {
        setError('Username already exists. Please choose a different username.');
        setLoading(false);
        return;
      }

      // Validate password strength (fail fast before Firebase)
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        setPasswordError(passwordValidation.error || 'Password does not meet requirements.');
        setError(passwordValidation.error || 'Password does not meet requirements.');
        setLoading(false);
        return;
      }

      // Create auth user (this will send verification email)
      const authUser = await signUp(email, password, username);
      
      // Create user profile in Firestore
      await createUserProfile(authUser.uid, {
        username: username.trim(),
        email,
        bio: '',
        avatarUrl: authUser.photoURL || null,
        publicProfile: true,
        showOnLeaderboard: true,
        showGraphs: true,
      });

      // Redirect to email verification page
      navigate('/verify-email');
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <Activity className="w-10 h-10 text-white" />
          </div>
        </div>

        <h1 className="text-3xl text-white text-center mb-8">Create Account</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-zinc-400 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setUsernameError('');
              }}
              onBlur={handleUsernameBlur}
              className={`w-full px-4 py-3 bg-zinc-900 border rounded-lg text-white focus:outline-none transition-colors ${
                usernameError
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-zinc-800 focus:border-emerald-500'
              }`}
              placeholder="fitguru123"
              required
              disabled={loading || checkingUsername}
            />
            {checkingUsername && (
              <p className="text-xs text-zinc-500 mt-1">Checking availability...</p>
            )}
            {usernameError && (
              <p className="text-xs text-red-500 mt-1">{usernameError}</p>
            )}
            {!usernameError && !checkingUsername && username && (
              <p className="text-xs text-emerald-500 mt-1">Username available</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-zinc-400 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-zinc-400 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              className={`w-full px-4 py-3 bg-zinc-900 border rounded-lg text-white focus:outline-none transition-colors ${
                passwordError
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-zinc-800 focus:border-emerald-500'
              }`}
              placeholder="••••••••"
              required
              disabled={loading}
            />
            {passwordError ? (
              <p className="text-xs text-red-500 mt-1">{passwordError}</p>
            ) : (
              <p className="text-xs text-zinc-500 mt-1">
                Must be at least 8 characters with uppercase, lowercase, number, and special character
              </p>
            )}
          </div>

          <label className="flex items-start gap-2 text-zinc-400">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="w-4 h-4 bg-zinc-900 border-zinc-800 rounded mt-1"
              required
              disabled={loading}
            />
            <span className="text-sm">
              I agree to the Terms of Service and Privacy Policy
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create Account'}
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
          onClick={async () => {
            setError('');
            setLoading(true);
            try {
              await signInWithGoogle();
              await refreshUserProfile();
              navigate('/dashboard');
            } catch (err: any) {
              setError(getAuthErrorMessage(err));
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          className="w-full py-3 bg-white hover:bg-zinc-100 text-zinc-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-medium"
        >
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
        </button>

        <p className="text-center text-zinc-400 mt-6">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-emerald-500 hover:text-emerald-400 transition-colors"
          >
            Log in
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
