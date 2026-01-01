import { useState, useEffect } from 'react';
import { Users, TrendingUp, TrendingDown, Trophy, Flame, Target, UserPlus, Check, X, Search, Loader2 } from 'lucide-react';
import { InitialsAvatar } from '../components/InitialsAvatar';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToSessions,
  subscribeToFriends,
  subscribeToFriendRequests,
  getFriendSessions,
  acceptFriendRequest,
  rejectFriendRequest,
  sendFriendRequest,
  searchUsersByUsername,
  getFriendSuggestions,
  Session,
  Friend,
  FriendRequest,
  User,
} from '../services/firestoreService';
import { doc, runTransaction, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  getWeeklyTotal,
  getMonthlyTotal,
  getBestSession,
  getLongestStreak,
  getLifetimeTotal,
} from '../utils/stats';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';

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
  
  // New state for search and suggestions
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showSuggestionsDialog, setShowSuggestionsDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());

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

  // Load suggestions when dialog opens
  useEffect(() => {
    if (showSuggestionsDialog && currentUser) {
      loadSuggestions();
    }
  }, [showSuggestionsDialog, currentUser]);

  const loadSuggestions = async () => {
    if (!currentUser) return;
    setLoadingSuggestions(true);
    try {
      const userSuggestions = await getFriendSuggestions(currentUser.uid, 10);
      setSuggestions(userSuggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!currentUser || !query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchUsersByUsername(query.trim(), currentUser.uid, 10);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSendFriendRequest = async (toUserId: string, toUsername: string, toAvatarUrl: string) => {
    if (!currentUser || !userProfile) return;

    try {
      setPendingRequests(prev => new Set(prev).add(toUserId));
      await sendFriendRequest(
        currentUser.uid,
        toUserId,
        userProfile.username,
        userProfile.avatarUrl
      );
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Failed to send friend request. Please try again.');
    } finally {
      setPendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(toUserId);
        return newSet;
      });
    }
  };

  const isAlreadyFriend = (userId: string) => {
    return friends.some(f => f.id === userId);
  };

  const hasPendingRequest = (userId: string) => {
    return friendRequests.some(r => 
      (r.fromUserId === userId || r.toUserId === userId) && r.status === 'pending'
    );
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!currentUser) return;
    try {
      await acceptFriendRequest(requestId, currentUser.uid);
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!currentUser) return;
    try {
      await rejectFriendRequest(requestId, currentUser.uid);
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!currentUser) return;
    try {
      const currentUserRef = doc(db, 'users', currentUser.uid);
      const friendUserRef = doc(db, 'users', friendId);

      await runTransaction(db, async (transaction) => {
        // Read both user documents first (required by Firestore transactions)
        const [currentUserSnap, friendUserSnap] = await Promise.all([
          transaction.get(currentUserRef),
          transaction.get(friendUserRef),
        ]);

        if (!currentUserSnap.exists()) {
          throw new Error('Current user profile not found');
        }

        // Remove friend from current user's friends list
        const currentUserFriends = currentUserSnap.data().friends || [];
        transaction.update(currentUserRef, {
          friends: currentUserFriends.filter((id: string) => id !== friendId),
          updatedAt: Timestamp.now(),
        });

        // Remove current user from friend's friends list (if friend exists)
        if (friendUserSnap.exists()) {
          const friendUserFriends = friendUserSnap.data().friends || [];
          transaction.update(friendUserRef, {
            friends: friendUserFriends.filter((id: string) => id !== currentUser.uid),
            updatedAt: Timestamp.now(),
          });
        }
      });
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  // Calculate leaderboard data
  const getLeaderboardData = () => {
    // Filter out friends who have showOnLeaderboard: false
    const visibleFriends = friends.filter(
      friend => friend.showOnLeaderboard !== false
    );

    const allUsers = [
      {
        id: currentUser?.uid || '',
        username: userProfile?.username || '',
        avatarUrl: userProfile?.avatarUrl || '',
        sessions: sessions,
      },
      ...visibleFriends.map(friend => ({
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
    <div className="p-4 lg:p-8">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl text-white mb-2">Friends & Leaderboards</h1>
        <p className="text-zinc-400 text-sm lg:text-base">Compete with friends and track rankings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 lg:mb-8">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 sm:flex-none px-4 lg:px-6 py-2.5 lg:py-3 rounded-lg transition-colors text-sm lg:text-base ${
            activeTab === 'leaderboard'
              ? 'bg-emerald-500 text-white'
              : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Leaderboard
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 sm:flex-none px-4 lg:px-6 py-2.5 lg:py-3 rounded-lg transition-colors text-sm lg:text-base ${
            activeTab === 'friends'
              ? 'bg-emerald-500 text-white'
              : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Friends ({friends.length})
        </button>
      </div>

      {activeTab === 'leaderboard' && (
        <>
          {/* Leaderboard Filters */}
          <div className="mb-6 lg:mb-8 overflow-x-auto pb-2">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => setLeaderboardType('weekly')}
                className={`px-3 lg:px-4 py-2 rounded-lg transition-colors text-sm ${
                  leaderboardType === 'weekly'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden sm:inline">Weekly</span>
                </div>
              </button>
              <button
                onClick={() => setLeaderboardType('monthly')}
                className={`px-3 lg:px-4 py-2 rounded-lg transition-colors text-sm ${
                  leaderboardType === 'monthly'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span className="hidden sm:inline">Monthly</span>
                </div>
              </button>
              <button
                onClick={() => setLeaderboardType('best')}
                className={`px-3 lg:px-4 py-2 rounded-lg transition-colors text-sm ${
                  leaderboardType === 'best'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  <span className="hidden sm:inline">Best Session</span>
                </div>
              </button>
              <button
                onClick={() => setLeaderboardType('streak')}
                className={`px-3 lg:px-4 py-2 rounded-lg transition-colors text-sm ${
                  leaderboardType === 'streak'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  <span className="hidden sm:inline">Streak</span>
                </div>
              </button>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-zinc-900/50 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800/60">
              <h2 className="text-lg lg:text-xl text-white">{getMetricLabel()}</h2>
            </div>
            <div className="divide-y divide-zinc-800/60">
              {leaderboard.map((item, index) => (
                <div
                  key={item.id}
                  className="p-3 lg:p-4 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 lg:gap-4">
                    {/* Rank */}
                    <div
                      className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center text-sm ${
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
                    {item.avatarUrl ? (
                      <img
                        src={item.avatarUrl}
                        alt={item.username}
                        className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover"
                      />
                    ) : (
                      <InitialsAvatar name={item.username} size={48} className="w-10 h-10 lg:w-12 lg:h-12 rounded-full" />
                    )}

                    {/* Username */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm lg:text-base truncate">{item.username}</p>
                      {item.id === currentUser?.uid && (
                        <span className="text-xs text-emerald-500">You</span>
                      )}
                    </div>

                    {/* Trend */}
                    {item.trend && leaderboardType === 'weekly' && (
                      <div
                        className={`hidden sm:flex items-center gap-1 ${
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
                      <p className="text-xl lg:text-2xl text-emerald-500">{item.value}</p>
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
            <div className="bg-zinc-900/50 rounded-xl p-4 lg:p-6 mb-4 lg:mb-6">
              <h2 className="text-lg lg:text-xl text-white mb-4">Friend Requests</h2>
              <div className="space-y-3">
                {friendRequests
                  .filter(r => r.status === 'pending')
                  .map(request => (
                    <div
                      key={request.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 lg:p-4 bg-zinc-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={request.fromAvatarUrl}
                          alt={request.fromUsername}
                          className="w-10 h-10 lg:w-12 lg:h-12 rounded-full"
                        />
                        <div>
                          <p className="text-white text-sm lg:text-base">{request.fromUsername}</p>
                          <p className="text-xs lg:text-sm text-zinc-400">Wants to be friends</p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-auto">
                        <button
                          onClick={() => handleAcceptRequest(request.id)}
                          className="p-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors"
                        >
                          <Check className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          className="p-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Friends List */}
          <div className="bg-zinc-900/50 rounded-xl p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-lg lg:text-xl text-white">Your Friends</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSuggestionsDialog(true)}
                  className="flex-1 sm:flex-none px-3 lg:px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Find Friends</span>
                  <span className="sm:hidden">Find</span>
                </button>
                <button
                  onClick={() => setShowSearchDialog(true)}
                  className="flex-1 sm:flex-none px-3 lg:px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Friend</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {friends.map(friend => {
                const friendSessionData = friendSessions[friend.id] || [];
                const weeklyTotal = getWeeklyTotal(friendSessionData);

                return (
                  <div
                    key={friend.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 lg:p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {friend.avatarUrl ? (
                        <img
                          src={friend.avatarUrl}
                          alt={friend.username}
                          className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover"
                        />
                      ) : (
                        <InitialsAvatar name={friend.username} size={48} className="w-10 h-10 lg:w-12 lg:h-12 rounded-full" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm lg:text-base truncate">{friend.username}</p>
                        <p className="text-xs lg:text-sm text-zinc-400">
                          {weeklyTotal} push-ups this week
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFriend(friend.id)}
                      className="self-end sm:self-auto px-3 lg:px-4 py-1.5 lg:py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
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
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setShowSuggestionsDialog(true)}
                    className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                  >
                    Find Friends
                  </button>
                  <button
                    onClick={() => setShowSearchDialog(true)}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                  >
                    Search by Username
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Search Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Search Users</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Search for users by username
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <Input
                type="text"
                placeholder="Enter username..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                className="pl-10 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            {searching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              </div>
            )}
            {!searching && searchResults.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <InitialsAvatar name={user.username} size={40} className="w-10 h-10 rounded-full" />
                      )}
                      <div>
                        <p className="text-white">{user.username}</p>
                        <p className="text-xs text-zinc-400">{user.email}</p>
                      </div>
                    </div>
                    {isAlreadyFriend(user.id) ? (
                      <span className="text-sm text-zinc-500">Already friends</span>
                    ) : hasPendingRequest(user.id) ? (
                      <span className="text-sm text-zinc-500">Request sent</span>
                    ) : (
                      <button
                        onClick={() => handleSendFriendRequest(user.id, user.username, user.avatarUrl)}
                        disabled={pendingRequests.has(user.id)}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
                      >
                        {pendingRequests.has(user.id) ? 'Sending...' : 'Add'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!searching && searchQuery && searchResults.length === 0 && (
              <p className="text-center text-zinc-400 py-4">No users found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Suggestions Dialog */}
      <Dialog open={showSuggestionsDialog} onOpenChange={setShowSuggestionsDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Friend Suggestions</DialogTitle>
            <DialogDescription className="text-zinc-400">
              People you might know
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {loadingSuggestions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {suggestions.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <InitialsAvatar name={user.username} size={40} className="w-10 h-10 rounded-full" />
                      )}
                      <div>
                        <p className="text-white">{user.username}</p>
                        <p className="text-xs text-zinc-400">{user.email}</p>
                      </div>
                    </div>
                    {isAlreadyFriend(user.id) ? (
                      <span className="text-sm text-zinc-500">Already friends</span>
                    ) : hasPendingRequest(user.id) ? (
                      <span className="text-sm text-zinc-500">Request sent</span>
                    ) : (
                      <button
                        onClick={() => handleSendFriendRequest(user.id, user.username, user.avatarUrl)}
                        disabled={pendingRequests.has(user.id)}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
                      >
                        {pendingRequests.has(user.id) ? 'Sending...' : 'Add'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-zinc-400 py-8">No suggestions available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
