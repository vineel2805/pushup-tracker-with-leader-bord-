import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { login, initializeMockData } from '../utils/mockData';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      initializeMockData();
      navigate('/dashboard');
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

        <h1 className="text-3xl text-white text-center mb-8">Welcome Back</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-zinc-400">
              <input
                type="checkbox"
                className="w-4 h-4 bg-zinc-900 border-zinc-800 rounded"
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
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
          >
            Log In
          </button>
        </form>

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
