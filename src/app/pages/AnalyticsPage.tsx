import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { subscribeToSessions, Session } from '../services/firestoreService';
import { getLast7DaysData, getLast30DaysData } from '../utils/stats';

export function AnalyticsPage() {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToSessions(currentUser.uid, (updatedSessions) => {
      setSessions(updatedSessions);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);
  
  if (loading) {
    return (
      <div className="p-8">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const data = timeRange === 'week' ? getLast7DaysData(sessions) : getLast30DaysData(sessions);

  // Session-to-session data (last 10 sessions)
  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
    .reverse()
    .map((session, index) => ({
      session: `S${index + 1}`,
      pushUps: session.pushUps,
      date: session.date,
    }));

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-white mb-2">Performance Analytics</h1>
        <p className="text-zinc-400">Track your progress over time</p>
      </div>

      {/* Time Range Toggle */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setTimeRange('week')}
          className={`px-6 py-3 rounded-lg transition-colors ${
            timeRange === 'week'
              ? 'bg-emerald-500 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Weekly
        </button>
        <button
          onClick={() => setTimeRange('month')}
          className={`px-6 py-3 rounded-lg transition-colors ${
            timeRange === 'month'
              ? 'bg-emerald-500 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Monthly
        </button>
      </div>

      {/* Daily Progress Line Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl text-white mb-6">
          Daily Progress - {timeRange === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
        </h2>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <XAxis
              dataKey={timeRange === 'week' ? 'day' : 'day'}
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

      {/* Session-to-Session Bar Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl text-white mb-6">Session-to-Session Progress</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={recentSessions}>
            <XAxis
              dataKey="session"
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
            <Bar
              dataKey="pushUps"
              fill="#10b981"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-400 mb-2">Average Per Session</p>
          <p className="text-3xl text-white">
            {sessions.length > 0
              ? Math.round(sessions.reduce((sum, s) => sum + s.pushUps, 0) / sessions.length)
              : 0}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-400 mb-2">Average Sets</p>
          <p className="text-3xl text-white">
            {sessions.length > 0
              ? Math.round(sessions.reduce((sum, s) => sum + s.sets, 0) / sessions.length)
              : 0}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-zinc-400 mb-2">Average Duration</p>
          <p className="text-3xl text-white">
            {sessions.length > 0
              ? `${Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length / 60)}m`
              : '0m'}
          </p>
        </div>
      </div>
    </div>
  );
}
