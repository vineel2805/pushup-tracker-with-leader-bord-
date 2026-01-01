import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Mail } from 'lucide-react';
import { resetPassword } from '../services/authService';
import { getAuthErrorMessage } from '../utils/authErrors';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await resetPassword(email);
      // Always show success to prevent email enumeration
      setSuccess(true);
    } catch (err: any) {
      // Only show error for non-enumeration issues
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

        <h1 className="text-3xl text-white text-center mb-2">Reset Password</h1>
        <p className="text-zinc-400 text-center mb-8">
          Enter your email address and we'll send you a link to reset your password
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg text-emerald-500 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-5 h-5" />
              <strong>Password reset email sent!</strong>
            </div>
            <p className="text-sm">
              Check your inbox at {email} and click the link to reset your password.
            </p>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-zinc-400 mb-2">
                Email Address
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className="text-center text-zinc-400 mt-6">
          Remember your password?{' '}
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

