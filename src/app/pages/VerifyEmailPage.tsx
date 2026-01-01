import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sendVerificationEmail, resendVerificationEmail } from '../services/authService';
import { getAuthErrorMessage } from '../utils/authErrors';

export function VerifyEmailPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Redirect if already verified or not logged in
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (currentUser.emailVerified) {
      navigate('/dashboard');
      return;
    }
  }, [currentUser, navigate]);

  // Handle resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await resendVerificationEmail();
      setSuccess('Verification email sent! Please check your inbox.');
      setResendCooldown(60); // 60 second cooldown
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!currentUser) return;

    setError('');
    setLoading(true);

    try {
      // Reload user to check if email is verified
      await currentUser.reload();
      
      if (currentUser.emailVerified) {
        setSuccess('Email verified! Redirecting...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        setError('Email not yet verified. Please check your inbox and click the verification link.');
      }
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <Activity className="w-10 h-10 text-white" />
          </div>
        </div>

        <h1 className="text-3xl text-white text-center mb-2">Verify Your Email</h1>
        <p className="text-zinc-400 text-center mb-8">
          We've sent a verification email to <strong className="text-white">{currentUser.email}</strong>
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg text-emerald-500 text-sm flex items-start gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>{success}</div>
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Mail className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium mb-2">Check your inbox</h3>
              <p className="text-zinc-400 text-sm mb-4">
                Click the verification link in the email we sent to complete your registration.
                The link will expire in 24 hours.
              </p>
              <ul className="text-zinc-500 text-xs space-y-1 mb-4">
                <li>• Check your spam/junk folder if you don't see it</li>
                <li>• Make sure you entered the correct email address</li>
                <li>• The email may take a few minutes to arrive</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleCheckVerification}
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Checking...' : 'I\'ve verified my email'}
          </button>

          <button
            onClick={handleResend}
            disabled={loading || resendCooldown > 0}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendCooldown > 0
              ? `Resend email (${resendCooldown}s)`
              : 'Resend verification email'}
          </button>
        </div>

        <p className="text-center text-zinc-400 mt-6 text-sm">
          Wrong email address?{' '}
          <Link
            to="/login"
            className="text-emerald-500 hover:text-emerald-400 transition-colors"
          >
            Sign in with a different account
          </Link>
        </p>
      </div>
    </div>
  );
}

