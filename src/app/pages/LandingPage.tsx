import { Link } from 'react-router-dom';
import { Activity, TrendingUp, Users, BarChart3, Target, Trophy } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm fixed w-full z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl text-white">PushUp Tracker</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="px-6 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-6xl mb-6 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Track Your Push-Up Progress
          </h1>
          <p className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
            Monitor your fitness journey with detailed analytics, compete with friends, and stay motivated with streak tracking.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/signup"
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-lg"
            >
              Get Started Free
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-lg"
            >
              Log In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl text-white text-center mb-4">
            Everything You Need to Track
          </h2>
          <p className="text-zinc-400 text-center mb-12">
            Powerful features to keep you motivated and improving
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={BarChart3}
              title="History Tracking"
              description="Track every session with detailed records and visualize your progress over time"
            />
            <FeatureCard
              icon={TrendingUp}
              title="Analytics & Graphs"
              description="Comprehensive charts showing daily, weekly, and monthly progress trends"
            />
            <FeatureCard
              icon={Users}
              title="Public Profiles"
              description="Share your achievements with others and showcase your fitness journey"
            />
            <FeatureCard
              icon={Trophy}
              title="Friends Leaderboards"
              description="Compete with friends on weekly, monthly, and all-time leaderboards"
            />
            <FeatureCard
              icon={Target}
              title="Streak Tracking"
              description="Build consistency with daily streak tracking and milestone celebrations"
            />
            <FeatureCard
              icon={Activity}
              title="Session Tracking"
              description="Live counter with timer, set tracking, and pause/resume functionality"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl text-white mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl text-zinc-400 mb-8">
            Join thousands of users tracking their push-up progress
          </p>
          <Link
            to="/signup"
            className="inline-block px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-lg"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-6">
        <div className="max-w-7xl mx-auto text-center text-zinc-500">
          <p>© 2025 PushUp Tracker. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-emerald-500/50 transition-colors">
      <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-emerald-500" />
      </div>
      <h3 className="text-xl text-white mb-2">{title}</h3>
      <p className="text-zinc-400">{description}</p>
    </div>
  );
}
