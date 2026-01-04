import { Link } from 'react-router-dom';
import { Activity, TrendingUp, Users, BarChart3, Target, Trophy, Mic, Volume2, Camera } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm fixed w-full z-10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3">
            <img 
              src="/logo.png" 
              alt="Track & Grow" 
              className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg object-cover"
            />
            <span className="text-lg lg:text-xl text-white font-semibold">Track & Grow</span>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <Link
              to="/login"
              className="px-4 lg:px-6 py-2 text-zinc-400 hover:text-white transition-colors text-sm lg:text-base"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="px-4 lg:px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-sm lg:text-base"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-24 lg:pt-32 pb-12 lg:pb-20 px-4 lg:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full text-emerald-400 text-sm mb-6">
            <Camera className="w-4 h-4" />
            <span>Pose Detection</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-6xl mb-4 lg:mb-6 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent leading-tight">
            Track Your Push-Ups
          </h1>
          <p className="text-base lg:text-xl text-zinc-400 mb-6 lg:mb-8 max-w-2xl mx-auto px-4">
            Automatic rep counting with computer vision, voice commands for hands-free control, and detailed analytics to track your progress.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-center px-4">
            <Link
              to="/signup"
              className="px-6 lg:px-8 py-3 lg:py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-base lg:text-lg"
            >
              Get Started Free
            </Link>
            <Link
              to="/login"
              className="px-6 lg:px-8 py-3 lg:py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-base lg:text-lg"
            >
              Log In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 lg:py-20 px-4 lg:px-6 bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl lg:text-4xl text-white text-center mb-3 lg:mb-4">
            Everything You Need to Track
          </h2>
          <p className="text-zinc-400 text-center text-sm lg:text-base mb-8 lg:mb-12">
            Powerful features to keep you motivated and improving
          </p>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            <FeatureCard
              icon={Camera}
              title="Rep Detection"
              description="Computer vision automatically counts your push-ups in real-time with pose tracking"
            />
            <FeatureCard
              icon={Mic}
              title="Voice Commands"
              description="Hands-free control with voice commands: start, pause, stop, save, and more"
            />
            <FeatureCard
              icon={Volume2}
              title="Audio Feedback"
              description="Rep announcements, milestone alerts, and motivational cues spoken aloud"
            />
            <FeatureCard
              icon={TrendingUp}
              title="Analytics & Graphs"
              description="Comprehensive charts showing daily, weekly, and monthly progress trends"
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
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 lg:py-20 px-4 lg:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl lg:text-4xl text-white mb-4 lg:mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-base lg:text-xl text-zinc-400 mb-6 lg:mb-8">
            Join thousands of users tracking their push-up progress
          </p>
          <Link
            to="/signup"
            className="inline-block px-6 lg:px-8 py-3 lg:py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-base lg:text-lg"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 lg:py-8 px-4 lg:px-6">
        <div className="max-w-7xl mx-auto text-center text-zinc-500 text-sm">
          <p>© 2026 Track & Grow. All rights reserved.</p>
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
    <div className="bg-zinc-900/50 rounded-xl p-4 lg:p-6 hover:bg-zinc-900 transition-colors">
      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-3 lg:mb-4">
        <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-500" />
      </div>
      <h3 className="text-lg lg:text-xl text-white mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm lg:text-base">{description}</p>
    </div>
  );
}
