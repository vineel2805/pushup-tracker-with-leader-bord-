import { useState, useEffect } from 'react';
import { Calendar, Clock, TrendingUp, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeToSessions, Session } from '../services/firestoreService';

export function HistoryPage() {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'week' | 'month'>('all');

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToSessions(currentUser.uid, (updatedSessions) => {
      setSessions(updatedSessions);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const filteredSessions = sessions.filter(session => {
    if (filter === 'all') return true;
    
    const sessionDate = new Date(session.date);
    const now = new Date();
    
    if (filter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return sessionDate >= weekAgo;
    }
    
    if (filter === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return sessionDate >= monthAgo;
    }
    
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group sessions by date
  const groupedSessions = filteredSessions.reduce((acc, session) => {
    if (!acc[session.date]) {
      acc[session.date] = [];
    }
    acc[session.date].push(session);
    return acc;
  }, {} as Record<string, typeof sessions>);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl text-white mb-2">History</h1>
        <p className="text-zinc-400 text-sm lg:text-base">View all your push-up sessions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
        <div className="flex items-center gap-2 text-zinc-400">
          <Filter className="w-5 h-5" />
          <span className="text-sm lg:text-base">Filter:</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter('all')}
            className={`flex-shrink-0 px-3 lg:px-4 py-2 rounded-lg transition-colors text-sm ${
              filter === 'all'
                ? 'bg-emerald-500 text-white'
                : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setFilter('month')}
            className={`flex-shrink-0 px-3 lg:px-4 py-2 rounded-lg transition-colors text-sm ${
              filter === 'month'
                ? 'bg-emerald-500 text-white'
                : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Last Month
          </button>
          <button
            onClick={() => setFilter('week')}
            className={`flex-shrink-0 px-3 lg:px-4 py-2 rounded-lg transition-colors text-sm ${
              filter === 'week'
                ? 'bg-emerald-500 text-white'
                : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Last Week
          </button>
        </div>
      </div>

      {/* Calendar View Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <div className="bg-zinc-900/50 rounded-xl p-4 lg:p-6">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-emerald-500" />
            <span className="text-zinc-400 text-sm lg:text-base">Total Sessions</span>
          </div>
          <p className="text-2xl lg:text-3xl text-white">{filteredSessions.length}</p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 lg:p-6">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <span className="text-zinc-400 text-sm lg:text-base">Total Push-Ups</span>
          </div>
          <p className="text-2xl lg:text-3xl text-white">
            {filteredSessions.reduce((sum, s) => sum + s.pushUps, 0)}
          </p>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 lg:p-6">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-5 h-5 text-emerald-500" />
            <span className="text-zinc-400 text-sm lg:text-base">Total Time</span>
          </div>
          <p className="text-2xl lg:text-3xl text-white">
            {Math.floor(filteredSessions.reduce((sum, s) => sum + s.duration, 0) / 60)}m
          </p>
        </div>
      </div>

      {/* Session List */}
      <div className="space-y-4 lg:space-y-6">
        {Object.entries(groupedSessions).map(([date, daySessions]) => (
          <div key={date} className="bg-zinc-900/50 rounded-xl p-4 lg:p-6">
            <h3 className="text-base lg:text-lg text-white mb-3 lg:mb-4">{formatDate(date)}</h3>
            <div className="space-y-2 lg:space-y-3">
              {daySessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 lg:p-4 bg-zinc-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                      <span className="text-lg lg:text-xl text-emerald-500">{session.pushUps}</span>
                    </div>
                    <div>
                      <p className="text-white text-sm lg:text-base">Push-Ups</p>
                      <p className="text-xs lg:text-sm text-zinc-400">
                        {session.sets} {session.sets === 1 ? 'set' : 'sets'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm lg:text-base">{formatDuration(session.duration)}</p>
                    <p className="text-xs lg:text-sm text-zinc-400">Duration</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-zinc-800/60 flex justify-between text-sm">
              <span className="text-zinc-400">Daily Total</span>
              <span className="text-emerald-500">
                {daySessions.reduce((sum, s) => sum + s.pushUps, 0)} push-ups
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredSessions.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400">No sessions found</p>
        </div>
      )}
    </div>
  );
}
