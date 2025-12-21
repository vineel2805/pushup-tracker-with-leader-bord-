import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, Flame, TrendingUp, UserPlus } from 'lucide-react';
import { getSessions } from '../utils/mockData';
import { getLifetimeTotal, getBestSession, getLongestStreak, getLast7DaysData } from '../utils/stats';

export function PublicProfilePage() {
  // In a real app, this would fetch data for a specific user
  // For demo, we'll use the current user's data
  const sessions = getSessions();
  const last7Days = getLast7DaysData(sessions);
  
  const username = 'FitGuru';
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=FitGuru`;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center gap-6">
            <img
              src={avatarUrl}
              alt={username}
              className="w-24 h-24 rounded-full border-4 border-emerald-500"
            />
            <div className="flex-1">
              <h1 className="text-4xl text-white mb-2">{username}</h1>
              <p className="text-zinc-400">Push-up enthusiast • Active for 3 months</p>
            </div>
            <button className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add Friend
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
              <span className="text-zinc-400">Lifetime Push-Ups</span>
            </div>
            <p className="text-4xl text-white">{getLifetimeTotal(sessions)}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Trophy className="w-6 h-6 text-emerald-500" />
              </div>
              <span className="text-zinc-400">Best Session</span>
            </div>
            <p className="text-4xl text-white">{getBestSession(sessions)}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Flame className="w-6 h-6 text-emerald-500" />
              </div>
              <span className="text-zinc-400">Longest Streak</span>
            </div>
            <p className="text-4xl text-white">{getLongestStreak(sessions)} days</p>
          </div>
        </div>

        {/* Performance Graph */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
          <h2 className="text-2xl text-white mb-6">Performance Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={last7Days}>
              <XAxis
                dataKey="day"
                stroke="#71717a"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#71717a"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Line
                type="monotone"
                dataKey="pushUps"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-2xl text-white mb-6">Recent Activity</h2>
          <div className="space-y-3">
            {sessions
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5)
              .map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                      <span className="text-xl text-emerald-500">{session.pushUps}</span>
                    </div>
                    <div>
                      <p className="text-white">Push-Ups</p>
                      <p className="text-sm text-zinc-400">
                        {new Date(session.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white">{session.sets} sets</p>
                    <p className="text-sm text-zinc-400">
                      {Math.floor(session.duration / 60)}m {session.duration % 60}s
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
