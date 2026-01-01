import { Activity, TrendingUp, Users, Trophy, Target, HelpCircle } from 'lucide-react';

export function HelpPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl text-white mb-2">Help & How to Use</h1>
        <p className="text-zinc-400">Learn how to get the most out of PushUp Tracker</p>
      </div>

      {/* Overview */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-6 h-6 text-emerald-500" />
          <h2 className="text-2xl text-white">What is PushUp Tracker?</h2>
        </div>
        <p className="text-zinc-300 leading-relaxed">
          PushUp Tracker is a fitness application designed to help you track, monitor, and improve your push-up workouts. 
          The app uses real-time pose detection technology to automatically count your push-ups, track your progress over time, 
          and compete with friends on leaderboards.
        </p>
      </section>

      {/* Tracking Sessions */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-6 h-6 text-emerald-500" />
          <h2 className="text-2xl text-white">How to Track Push-Up Sessions</h2>
        </div>
        <div className="space-y-4 text-zinc-300">
          <div>
            <h3 className="text-lg text-white mb-2">1. Enable Camera</h3>
            <p className="leading-relaxed">
              Navigate to the <strong className="text-white">Track</strong> page and enable your camera. 
              Position yourself so your full body is visible in the frame.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-white mb-2">2. Get into Position</h3>
            <p className="leading-relaxed">
              Get into a plank position with your arms extended. The app will detect when you're in the correct position 
              and display "Perfect! Ready to start" when you're ready.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-white mb-2">3. Start Your Workout</h3>
            <p className="leading-relaxed">
              Click the <strong className="text-white">Start Tracking</strong> button to begin. The app will automatically 
              count your push-ups as you perform them. You can pause and resume at any time.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-white mb-2">4. Complete Your Session</h3>
            <p className="leading-relaxed">
              When you're done, click <strong className="text-white">Stop</strong> to end the session. Your push-up count 
              and session duration will be automatically saved to your history.
            </p>
          </div>
        </div>
      </section>

      {/* Streaks and Analytics */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-6 h-6 text-emerald-500" />
          <h2 className="text-2xl text-white">Streaks and Analytics</h2>
        </div>
        <div className="space-y-4 text-zinc-300">
          <div>
            <h3 className="text-lg text-white mb-2">Current Streak</h3>
            <p className="leading-relaxed">
              Your current streak shows how many consecutive days you've completed at least one push-up session. 
              The streak resets if you miss a day.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-white mb-2">Longest Streak</h3>
            <p className="leading-relaxed">
              This tracks your personal best for consecutive days with push-up sessions. Try to beat your record!
            </p>
          </div>
          <div>
            <h3 className="text-lg text-white mb-2">Analytics Dashboard</h3>
            <p className="leading-relaxed">
              Visit the <strong className="text-white">Analytics</strong> page to view detailed charts showing your progress 
              over the last 7 days, 30 days, or all time. You can see trends, weekly totals, monthly totals, and more.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-white mb-2">History</h3>
            <p className="leading-relaxed">
              The <strong className="text-white">History</strong> page displays all your past sessions with dates, 
              push-up counts, and durations. Use this to review your workout patterns and progress.
            </p>
          </div>
        </div>
      </section>

      {/* Friends and Leaderboards */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-6 h-6 text-emerald-500" />
          <h2 className="text-2xl text-white">Friends and Leaderboards</h2>
        </div>
        <div className="space-y-4 text-zinc-300">
          <div>
            <h3 className="text-lg text-white mb-2">Adding Friends</h3>
            <p className="leading-relaxed">
              Go to the <strong className="text-white">Friends</strong> page and search for users by username. 
              Send friend requests to connect with others. When someone sends you a request, you'll see a notification 
              badge on the Friends icon in the sidebar.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-white mb-2">Leaderboards</h3>
            <p className="leading-relaxed">
              Compete with your friends on weekly, monthly, and all-time leaderboards. The leaderboard shows who has 
              completed the most push-ups in each time period. You can toggle your visibility on leaderboards in Settings.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-white mb-2">Public Profiles</h3>
            <p className="leading-relaxed">
              Each user has a public profile that shows their stats, achievements, and progress graphs. 
              You can share your profile link with others to showcase your fitness journey.
            </p>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <HelpCircle className="w-6 h-6 text-emerald-500" />
          <h2 className="text-2xl text-white">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-4 text-zinc-300">
          <div>
            <h3 className="text-lg text-white mb-2">Q: Why isn't the app detecting my push-ups?</h3>
            <p className="leading-relaxed">
              Make sure your full body is visible in the camera frame, you're in a well-lit area, and you're performing 
              push-ups with proper form. The app works best when you maintain a consistent plank position.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-white mb-2">Q: Can I manually edit a session?</h3>
            <p className="leading-relaxed">
              Currently, sessions are automatically recorded when you complete a tracking session. Manual editing may be 
              available in future updates.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-white mb-2">Q: How do streaks work?</h3>
            <p className="leading-relaxed">
              A streak counts consecutive days where you complete at least one push-up session. The streak resets if you 
              miss a day. Sessions are counted based on UTC time to ensure consistency.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-white mb-2">Q: Can I make my profile private?</h3>
            <p className="leading-relaxed">
              Yes! Go to Settings and toggle your public profile visibility. You can also control whether you appear 
              on leaderboards.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-white mb-2">Q: How do I change my avatar?</h3>
            <p className="leading-relaxed">
              Click on your profile picture in the bottom-left account section of the sidebar, then select "Settings". 
              In the Profile tab, you can change your avatar by clicking on your current profile picture.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

