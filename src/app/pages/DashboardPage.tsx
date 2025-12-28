import { useState, useEffect } from 'react';
import { Activity, TrendingUp, Flame, Trophy, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { StatCard } from '../components/StatCard';
import { InitialsAvatar } from '../components/InitialsAvatar';
import { useAuth } from '../context/AuthContext';
import { subscribeToSessions, subscribeToFriends, getFriendSessions, Session, Friend } from '../services/firestoreService';
import {
  getTodaysPushUps,
  getWeeklyTotal,
  getCurrentStreak,
  getBestSession,
  getLast7DaysData,
} from '../utils/stats';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { currentUser, userProfile } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendSessions, setFriendSessions] = useState<{ [userId: string]: Session[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribeSessions = subscribeToSessions(currentUser.uid, (updatedSessions) => {
      setSessions(updatedSessions);
      setLoading(false);
    });

    const unsubscribeFriends = subscribeToFriends(currentUser.uid, async (updatedFriends) => {
      setFriends(updatedFriends);
      
      // Fetch friend sessions
      if (updatedFriends.length > 0) {
        const friendIds = updatedFriends.map(f => f.id);
        const sessions = await getFriendSessions(friendIds);
        setFriendSessions(sessions);
      } else {
        setFriendSessions({});
      }
    });

    return () => {
      unsubscribeSessions();
      unsubscribeFriends();
    };
  }, [currentUser]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const last7Days = getLast7DaysData(sessions);

  // Calculate leaderboard (top 3 friends for this week)
  const leaderboard = [
    { 
      id: currentUser?.uid || '', 
      username: userProfile?.username || '', 
      avatarUrl: userProfile?.avatarUrl || '',
      total: getWeeklyTotal(sessions) 
    },
    ...friends.map(friend => ({
      ...friend,
      total: friendSessions[friend.id] 
        ? getWeeklyTotal(friendSessions[friend.id])
        : 0,
    })),
  ]
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-white mb-2">Welcome back, {userProfile?.username || 'User'}!</h1>
        <p className="text-zinc-400">Here's your fitness summary</p>
      </div>

      {/* Profile Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
        <div className="flex items-start gap-4">
          {userProfile?.avatarUrl ? (
            <img
              src={userProfile.avatarUrl}
              alt={userProfile.username}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <InitialsAvatar name={userProfile?.username || 'User'} size={80} className="w-20 h-20 rounded-full" />
          )}
          <div className="flex-1">
            <h2 className="text-2xl text-white mb-1">{userProfile?.username || 'User'}</h2>
            <p className="text-zinc-400 mb-3">{userProfile?.email || ''}</p>
            {userProfile?.bio && (
              <p className="text-zinc-300 text-sm leading-relaxed">{userProfile.bio}</p>
            )}
            {!userProfile?.bio && (
              <p className="text-zinc-500 text-sm italic">No bio yet. Add one in your settings!</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Today's Push-Ups"
          value={getTodaysPushUps(sessions)}
          icon={Activity}
          trend="+12%"
          trendUp={true}
        />
        <StatCard
          title="Weekly Total"
          value={getWeeklyTotal(sessions)}
          icon={TrendingUp}
          trend="+8%"
          trendUp={true}
        />
        <StatCard
          title="Current Streak"
          value={`${getCurrentStreak(sessions)} days`}
          icon={Flame}
        />
        <StatCard
          title="Best Session"
          value={getBestSession(sessions)}
          icon={Trophy}
        />
      </div>

      {/* Chart and Leaderboard */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* 7-Day Chart */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-xl text-white mb-6">Last 7 Days</h2>
          <ResponsiveContainer width="100%" height={250}>
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
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Friends Leaderboard */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl text-white">Top Friends</h2>
            <Link 
              to="/friends" 
              className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {leaderboard.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                  index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                  index === 1 ? 'bg-zinc-400/20 text-zinc-400' :
                  'bg-orange-600/20 text-orange-600'
                }`}>
                  {index + 1}
                </div>
                {item.avatarUrl ? (
                  <img
                    src={item.avatarUrl}
                    alt={item.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <InitialsAvatar name={item.username} size={40} className="w-10 h-10 rounded-full" />
                )}
                <div className="flex-1">
                  <p className="text-white text-sm">{item.username}</p>
                  <p className="text-zinc-400 text-xs">This week</p>
                </div>
                <span className="text-emerald-500">{item.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Action */}
      <div className="mt-6">
        <Link
          to="/track"
          className="block w-full p-6 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl hover:from-emerald-600 hover:to-cyan-600 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl text-white mb-1">Start a Session</h3>
              <p className="text-emerald-50">Track your push-ups now</p>
            </div>
            <Activity className="w-8 h-8 text-white" />
          </div>
        </Link>
      </div>
    </div>
  );
}
