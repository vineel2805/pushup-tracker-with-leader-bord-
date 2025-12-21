import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { signup } from '../utils/mockData';

export function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (signup(username, email, password)) {
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

        <h1 className="text-3xl text-white text-center mb-8">Create Account</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-zinc-400 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="fitguru123"
              required
            />
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
              minLength={8}
            />
            <p className="text-xs text-zinc-500 mt-1">Must be at least 8 characters</p>
          </div>

          <label className="flex items-start gap-2 text-zinc-400">
            <input
              type="checkbox"
              className="w-4 h-4 bg-zinc-900 border-zinc-800 rounded mt-1"
              required
            />
            <span className="text-sm">
              I agree to the Terms of Service and Privacy Policy
            </span>
          </label>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
          >
            Create Account
          </button>
        </form>

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
