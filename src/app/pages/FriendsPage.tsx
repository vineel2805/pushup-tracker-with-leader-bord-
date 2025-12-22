import { useState, useEffect } from 'react';
import { Users, TrendingUp, TrendingDown, Trophy, Flame, Target, UserPlus, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToSessions,
  subscribeToFriends,
  subscribeToFriendRequests,
  getFriendSessions,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
  Session,
  Friend,
  FriendRequest,
} from '../services/firestoreService';
import {
  getWeeklyTotal,
  getMonthlyTotal,
  getBestSession,
  getLongestStreak,
  getLifetimeTotal,
} from '../utils/stats';

type LeaderboardType = 'weekly' | 'monthly' | 'best' | 'streak';
type TimeRange = 'week' | 'month' | 'all';

export function FriendsPage() {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'friends'>('leaderboard');
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('weekly');
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendSessions, setFriendSessions] = useState<{ [userId: string]: Session[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribeSessions = subscribeToSessions(currentUser.uid, (updatedSessions) => {
      setSessions(updatedSessions);
    });

    const unsubscribeFriends = subscribeToFriends(currentUser.uid, async (updatedFriends) => {
      setFriends(updatedFriends);
      
      if (updatedFriends.length > 0) {
        const friendIds = updatedFriends.map(f => f.id);
        const sessions = await getFriendSessions(friendIds);
        setFriendSessions(sessions);
      } else {
        setFriendSessions({});
      }
    });

    const unsubscribeRequests = subscribeToFriendRequests(currentUser.uid, (requests) => {
      setFriendRequests(requests);
      setLoading(false);
    });

    return () => {
      unsubscribeSessions();
      unsubscribeFriends();
      unsubscribeRequests();
    };
  }, [currentUser]);

  const handleAcceptRequest = async (requestId: string) => {
    if (!currentUser) return;
    try {
      await acceptFriendRequest(requestId, currentUser.uid);
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!currentUser) return;
    try {
      await removeFriend(currentUser.uid, friendId);
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  // Calculate leaderboard data
  const getLeaderboardData = () => {
    const allUsers = [
      {
        id: currentUser?.uid || '',
        username: userProfile?.username || '',
        avatarUrl: userProfile?.avatarUrl || '',
        sessions: sessions,
      },
      ...friends.map(friend => ({
        ...friend,
        sessions: friendSessions[friend.id] || [],
      })),
    ];

    return allUsers.map(u => {
      let value = 0;
      let prevValue = 0;

      switch (leaderboardType) {
        case 'weekly':
          value = getWeeklyTotal(u.sessions);
          // Previous week for trend
          const twoWeeksAgo = new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          prevValue = u.sessions
            .filter(s => {
              const d = new Date(s.date);
              return d >= twoWeeksAgo && d < oneWeekAgo;
            })
            .reduce((sum, s) => sum + s.pushUps, 0);
          break;
        case 'monthly':
          value = getMonthlyTotal(u.sessions);
          break;
        case 'best':
          value = getBestSession(u.sessions);
          break;
        case 'streak':
          value = getLongestStreak(u.sessions);
          break;
      }

      return {
        ...u,
        value,
        prevValue,
        trend: prevValue > 0 ? ((value - prevValue) / prevValue * 100).toFixed(0) : null,
      };
    }).sort((a, b) => b.value - a.value);
  };

  const leaderboard = getLeaderboardData();

  const getMetricLabel = () => {
    switch (leaderboardType) {
      case 'weekly':
        return 'Weekly Push-Ups';
      case 'monthly':
        return 'Monthly Push-Ups';
      case 'best':
        return 'Best Single Session';
      case 'streak':
        return 'Longest Streak';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-white mb-2">Friends & Leaderboards</h1>
        <p className="text-zinc-400">Compete with friends and track rankings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-6 py-3 rounded-lg transition-colors ${
            activeTab === 'leaderboard'
              ? 'bg-emerald-500 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Leaderboard
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`px-6 py-3 rounded-lg transition-colors ${
            activeTab === 'friends'
              ? 'bg-emerald-500 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Friends ({friends.length})
        </button>
      </div>

      {activeTab === 'leaderboard' && (
        <>
          {/* Leaderboard Filters */}
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex gap-2">
              <button
                onClick={() => setLeaderboardType('weekly')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  leaderboardType === 'weekly'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Weekly
                </div>
              </button>
              <button
                onClick={() => setLeaderboardType('monthly')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  leaderboardType === 'monthly'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Monthly
                </div>
              </button>
              <button
                onClick={() => setLeaderboardType('best')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  leaderboardType === 'best'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Best Session
                </div>
              </button>
              <button
                onClick={() => setLeaderboardType('streak')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  leaderboardType === 'streak'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  Streak
                </div>
              </button>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <h2 className="text-xl text-white">{getMetricLabel()}</h2>
            </div>
            <div className="divide-y divide-zinc-800">
              {leaderboard.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        index === 0
                          ? 'bg-yellow-500/20 text-yellow-500'
                          : index === 1
                          ? 'bg-zinc-400/20 text-zinc-400'
                          : index === 2
                          ? 'bg-orange-600/20 text-orange-600'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {index + 1}
                    </div>

                    {/* Avatar */}
                    <img
                      src={item.avatarUrl}
                      alt={item.username}
                      className="w-12 h-12 rounded-full"
                    />

                    {/* Username */}
                    <div className="flex-1">
                      <p className="text-white">{item.username}</p>
                      {item.id === currentUser?.uid && (
                        <span className="text-xs text-emerald-500">You</span>
                      )}
                    </div>

                    {/* Trend */}
                    {item.trend && leaderboardType === 'weekly' && (
                      <div
                        className={`flex items-center gap-1 ${
                          Number(item.trend) >= 0 ? 'text-emerald-500' : 'text-red-500'
                        }`}
                      >
                        {Number(item.trend) >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span className="text-sm">{Math.abs(Number(item.trend))}%</span>
                      </div>
                    )}

                    {/* Value */}
                    <div className="text-right">
                      <p className="text-2xl text-emerald-500">{item.value}</p>
                      <p className="text-xs text-zinc-500">
                        {leaderboardType === 'streak' ? 'days' : 'push-ups'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'friends' && (
        <>
          {/* Friend Requests */}
          {friendRequests.filter(r => r.status === 'pending').length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
              <h2 className="text-xl text-white mb-4">Friend Requests</h2>
              <div className="space-y-3">
                {friendRequests
                  .filter(r => r.status === 'pending')
                  .map(request => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={request.fromAvatarUrl}
                          alt={request.fromUsername}
                          className="w-12 h-12 rounded-full"
                        />
                        <div>
                          <p className="text-white">{request.fromUsername}</p>
                          <p className="text-sm text-zinc-400">Wants to be friends</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(request.id)}
                          className="p-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors"
                        >
                          <Check className="w-5 h-5 text-white" />
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          className="p-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Friends List */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl text-white">Your Friends</h2>
              <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Add Friend
              </button>
            </div>

            <div className="space-y-3">
              {friends.map(friend => {
                const friendSessionData = friendSessions[friend.id] || [];
                const weeklyTotal = getWeeklyTotal(friendSessionData);

                return (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <img
                        src={friend.avatarUrl}
                        alt={friend.username}
                        className="w-12 h-12 rounded-full"
                      />
                      <div className="flex-1">
                        <p className="text-white">{friend.username}</p>
                        <p className="text-sm text-zinc-400">
                          {weeklyTotal} push-ups this week
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFriend(friend.id)}
                      className="px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>

            {friends.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-400 mb-4">No friends yet</p>
                <button className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors">
                  Find Friends
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
