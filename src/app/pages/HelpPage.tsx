import { useState } from 'react';
import { 
  Camera, Play, Square, ChevronDown, Activity,
  BarChart3, Users, Flame, History, Share2, Plus
} from 'lucide-react';

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border-b border-zinc-800/50 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-zinc-200 group-hover:text-white transition-colors pr-4">{question}</span>
        <ChevronDown 
          size={18} 
          className={`flex-shrink-0 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      <div className={`grid transition-all duration-200 ${isOpen ? 'grid-rows-[1fr] pb-5' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <p className="text-zinc-500 text-sm leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
}

export function HelpPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-16">
        
        {/* Header */}
        <header className="mb-16">
          <p className="text-emerald-500 text-sm font-medium tracking-wide uppercase mb-3">Documentation</p>
          <h1 className="text-4xl font-light text-white mb-4 tracking-tight">
            Getting Started
          </h1>
          <p className="text-zinc-500 text-lg leading-relaxed">
            Everything you need to track your push-ups and monitor your progress.
          </p>
        </header>

        {/* Quick Start */}
        <section className="mb-16">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-8">Quick Start</h2>
          
          <div className="space-y-6">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800/50 flex items-center justify-center text-sm text-zinc-400 font-medium">1</div>
              <div className="pt-1">
                <h3 className="text-white font-medium mb-1">Enable your camera</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Navigate to Track and allow camera access. Position yourself so your full body is visible in frame.
                </p>
              </div>
            </div>
            
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800/50 flex items-center justify-center text-sm text-zinc-400 font-medium">2</div>
              <div className="pt-1">
                <h3 className="text-white font-medium mb-1">Get into plank position</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Hold a plank with arms extended. The app detects your pose and shows "Ready" when you're set.
                </p>
              </div>
            </div>
            
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800/50 flex items-center justify-center text-sm text-zinc-400 font-medium">3</div>
              <div className="pt-1">
                <h3 className="text-white font-medium mb-1">Start your session</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Press Start and begin. The AI counts each rep automatically. End the session when finished to save.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
            <p className="text-zinc-400 text-sm">
              <span className="text-zinc-300">Tip:</span> Side view provides the most accurate detection. Good lighting helps significantly.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="mb-16">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-8">Features</h2>
          
          <div className="grid grid-cols-2 gap-x-12 gap-y-8">
            <div className="flex items-start gap-3">
              <Activity size={18} className="text-zinc-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-zinc-200 text-sm font-medium mb-1">AI Detection</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">Real-time pose tracking counts reps automatically.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <BarChart3 size={18} className="text-zinc-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-zinc-200 text-sm font-medium mb-1">Analytics</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">Charts and insights across daily, weekly, and monthly views.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Flame size={18} className="text-zinc-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-zinc-200 text-sm font-medium mb-1">Streaks</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">Track consecutive workout days. Miss a day, streak resets.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <History size={18} className="text-zinc-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-zinc-200 text-sm font-medium mb-1">History</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">Browse all past sessions with dates and durations.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Users size={18} className="text-zinc-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-zinc-200 text-sm font-medium mb-1">Leaderboards</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">Compete with friends on weekly and monthly rankings.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Share2 size={18} className="text-zinc-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-zinc-200 text-sm font-medium mb-1">Public Profiles</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">Share your stats and achievements with anyone.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-8">Frequently Asked Questions</h2>
          
          <div className="border-t border-zinc-800/50">
            <FAQItem
              question="Why isn't the app detecting my push-ups?"
              answer="Ensure your full body is visible in frame, you're in a well-lit environment, and maintaining proper form. Side view typically provides better accuracy than front view."
            />
            <FAQItem
              question="How do streaks work?"
              answer="Complete at least one session per day to maintain your streak. Days are calculated in UTC. Missing a day resets your current streak to zero."
            />
            <FAQItem
              question="Can I hide my profile from others?"
              answer="Yes. In Settings, you can toggle your public profile visibility and control whether you appear on leaderboards independently."
            />
            <FAQItem
              question="How do I change my avatar?"
              answer="Go to Settings and click on your current profile picture in the Profile section to select a new avatar."
            />
            <FAQItem
              question="Can I edit or delete sessions?"
              answer="Sessions are automatically recorded and cannot be manually edited at this time. This feature may be added in a future update."
            />
          </div>
        </section>

        {/* Footer CTA */}
        <section className="text-center pt-8 border-t border-zinc-800/30">
          <p className="text-zinc-600 text-sm mb-4">Ready to start?</p>
          <a 
            href="/track" 
            className="inline-flex items-center gap-2 text-emerald-500 hover:text-emerald-400 text-sm font-medium transition-colors"
          >
            <Play size={14} fill="currentColor" />
            <span>Begin tracking</span>
          </a>
        </section>
        
      </div>
    </div>
  );
}

