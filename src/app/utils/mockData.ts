// Mock data and utilities for the push-up tracker

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
  publicProfile: boolean;
  showOnLeaderboard: boolean;
  showGraphs: boolean;
}

export interface Session {
  id: string;
  userId: string;
  date: string;
  pushUps: number;
  duration: number; // in seconds
  sets: number;
}

export interface Friend {
  id: string;
  username: string;
  avatarUrl: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromAvatarUrl: string;
  status: 'pending' | 'accepted' | 'rejected';
}

// Mock current user
const CURRENT_USER_KEY = 'currentUser';
const SESSIONS_KEY = 'sessions';
const FRIENDS_KEY = 'friends';
const FRIEND_REQUESTS_KEY = 'friendRequests';

// Helper to generate dates
const getDaysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

// Initialize mock data
export const initializeMockData = () => {
  if (!localStorage.getItem(CURRENT_USER_KEY)) {
    const currentUser: User = {
      id: 'user-1',
      username: 'FitGuru',
      email: 'fitguru@example.com',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=FitGuru`,
      publicProfile: true,
      showOnLeaderboard: true,
      showGraphs: true,
    };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
  }

  if (!localStorage.getItem(SESSIONS_KEY)) {
    const sessions: Session[] = [
      // This week
      { id: 's1', userId: 'user-1', date: getDaysAgo(0), pushUps: 45, duration: 180, sets: 3 },
      { id: 's2', userId: 'user-1', date: getDaysAgo(1), pushUps: 50, duration: 200, sets: 3 },
      { id: 's3', userId: 'user-1', date: getDaysAgo(2), pushUps: 40, duration: 160, sets: 3 },
      { id: 's4', userId: 'user-1', date: getDaysAgo(4), pushUps: 55, duration: 220, sets: 4 },
      { id: 's5', userId: 'user-1', date: getDaysAgo(6), pushUps: 48, duration: 192, sets: 3 },
      // Last week
      { id: 's6', userId: 'user-1', date: getDaysAgo(8), pushUps: 42, duration: 168, sets: 3 },
      { id: 's7', userId: 'user-1', date: getDaysAgo(10), pushUps: 38, duration: 152, sets: 3 },
      { id: 's8', userId: 'user-1', date: getDaysAgo(12), pushUps: 35, duration: 140, sets: 3 },
      { id: 's9', userId: 'user-1', date: getDaysAgo(14), pushUps: 40, duration: 160, sets: 3 },
      // Two weeks ago
      { id: 's10', userId: 'user-1', date: getDaysAgo(16), pushUps: 30, duration: 120, sets: 2 },
      { id: 's11', userId: 'user-1', date: getDaysAgo(18), pushUps: 32, duration: 128, sets: 3 },
      { id: 's12', userId: 'user-1', date: getDaysAgo(20), pushUps: 28, duration: 112, sets: 2 },
    ];
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }

  if (!localStorage.getItem(FRIENDS_KEY)) {
    const friends: Friend[] = [
      { id: 'user-2', username: 'IronMike', avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=IronMike` },
      { id: 'user-3', username: 'FlexQueen', avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=FlexQueen` },
      { id: 'user-4', username: 'PushUpPro', avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=PushUpPro` },
      { id: 'user-5', username: 'BeastMode', avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=BeastMode` },
    ];
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
  }

  if (!localStorage.getItem(FRIEND_REQUESTS_KEY)) {
    const requests: FriendRequest[] = [
      { 
        id: 'req-1', 
        fromUserId: 'user-6', 
        fromUsername: 'GymBuddy', 
        fromAvatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=GymBuddy`,
        status: 'pending' 
      },
    ];
    localStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(requests));
  }
};

// Mock friend sessions for leaderboards
export const getFriendSessions = (): { [userId: string]: Session[] } => {
  return {
    'user-2': [
      { id: 'f1', userId: 'user-2', date: getDaysAgo(0), pushUps: 60, duration: 240, sets: 4 },
      { id: 'f2', userId: 'user-2', date: getDaysAgo(1), pushUps: 55, duration: 220, sets: 3 },
      { id: 'f3', userId: 'user-2', date: getDaysAgo(2), pushUps: 58, duration: 232, sets: 4 },
      { id: 'f4', userId: 'user-2', date: getDaysAgo(4), pushUps: 62, duration: 248, sets: 4 },
      { id: 'f5', userId: 'user-2', date: getDaysAgo(8), pushUps: 50, duration: 200, sets: 3 },
    ],
    'user-3': [
      { id: 'f6', userId: 'user-3', date: getDaysAgo(0), pushUps: 38, duration: 152, sets: 3 },
      { id: 'f7', userId: 'user-3', date: getDaysAgo(1), pushUps: 40, duration: 160, sets: 3 },
      { id: 'f8', userId: 'user-3', date: getDaysAgo(3), pushUps: 35, duration: 140, sets: 2 },
      { id: 'f9', userId: 'user-3', date: getDaysAgo(5), pushUps: 42, duration: 168, sets: 3 },
    ],
    'user-4': [
      { id: 'f10', userId: 'user-4', date: getDaysAgo(0), pushUps: 70, duration: 280, sets: 5 },
      { id: 'f11', userId: 'user-4', date: getDaysAgo(1), pushUps: 68, duration: 272, sets: 4 },
      { id: 'f12', userId: 'user-4', date: getDaysAgo(2), pushUps: 65, duration: 260, sets: 4 },
      { id: 'f13', userId: 'user-4', date: getDaysAgo(3), pushUps: 72, duration: 288, sets: 5 },
      { id: 'f14', userId: 'user-4', date: getDaysAgo(9), pushUps: 60, duration: 240, sets: 4 },
    ],
    'user-5': [
      { id: 'f15', userId: 'user-5', date: getDaysAgo(0), pushUps: 52, duration: 208, sets: 3 },
      { id: 'f16', userId: 'user-5', date: getDaysAgo(1), pushUps: 48, duration: 192, sets: 3 },
      { id: 'f17', userId: 'user-5', date: getDaysAgo(4), pushUps: 50, duration: 200, sets: 3 },
    ],
  };
};

// API-like functions
export const getCurrentUser = (): User | null => {
  const user = localStorage.getItem(CURRENT_USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const updateCurrentUser = (user: User) => {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
};

export const getSessions = (): Session[] => {
  const sessions = localStorage.getItem(SESSIONS_KEY);
  return sessions ? JSON.parse(sessions) : [];
};

export const addSession = (session: Omit<Session, 'id'>) => {
  const sessions = getSessions();
  const newSession: Session = {
    ...session,
    id: `s${Date.now()}`,
  };
  sessions.push(newSession);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  return newSession;
};

export const getFriends = (): Friend[] => {
  const friends = localStorage.getItem(FRIENDS_KEY);
  return friends ? JSON.parse(friends) : [];
};

export const getFriendRequests = (): FriendRequest[] => {
  const requests = localStorage.getItem(FRIEND_REQUESTS_KEY);
  return requests ? JSON.parse(requests) : [];
};

export const acceptFriendRequest = (requestId: string) => {
  const requests = getFriendRequests();
  const request = requests.find(r => r.id === requestId);
  if (request) {
    request.status = 'accepted';
    localStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(requests));
    
    const friends = getFriends();
    friends.push({
      id: request.fromUserId,
      username: request.fromUsername,
      avatarUrl: request.fromAvatarUrl,
    });
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
  }
};

export const rejectFriendRequest = (requestId: string) => {
  const requests = getFriendRequests();
  const updated = requests.filter(r => r.id !== requestId);
  localStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(updated));
};

export const removeFriend = (friendId: string) => {
  const friends = getFriends();
  const updated = friends.filter(f => f.id !== friendId);
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(updated));
};

export const login = (email: string, password: string): boolean => {
  // Mock login - always succeeds for demo
  return true;
};

export const signup = (username: string, email: string, password: string): boolean => {
  // Mock signup - always succeeds for demo
  const newUser: User = {
    id: `user-${Date.now()}`,
    username,
    email,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    publicProfile: true,
    showOnLeaderboard: true,
    showGraphs: true,
  };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
  // Initialize empty data
  localStorage.setItem(SESSIONS_KEY, JSON.stringify([]));
  localStorage.setItem(FRIENDS_KEY, JSON.stringify([]));
  localStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify([]));
  return true;
};

export const logout = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null;
};
