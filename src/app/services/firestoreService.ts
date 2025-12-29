import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  addDoc,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
  bio?: string;
  publicProfile: boolean;
  showOnLeaderboard: boolean;
  showGraphs: boolean;
  friends?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Session {
  id: string;
  userId: string;
  date: string;
  pushUps: number;
  duration: number;
  sets: number;
  createdAt: Timestamp;
}

export interface Friend {
  id: string;
  username: string;
  avatarUrl?: string | null;
  email: string;
  showOnLeaderboard?: boolean;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromAvatarUrl?: string | null;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp;
}

// User operations
export const createUserProfile = async (userId: string, userData: Partial<User>): Promise<void> => {
  try {
    // Check if username already exists
    if (userData.username) {
      const existingUser = await getUserByUsername(userData.username);
      if (existingUser && existingUser.id !== userId) {
        throw new Error('Username already exists. Please choose a different username.');
      }
    }

    const userRef = doc(db, 'users', userId);
    const userDoc = {
      ...userData,
      friends: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    await setDoc(userRef, userDoc);
  } catch (error: any) {
    // Re-throw with original message if it's our custom error
    if (error.message.includes('already exists')) {
      throw error;
    }
    throw new Error(`Failed to create user profile: ${error.message}`);
  }
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() } as User;
    }
    return null;
  } catch (error: any) {
    throw new Error(`Failed to get user profile: ${error.message}`);
  }
};

export const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error: any) {
    throw new Error(`Failed to update user profile: ${error.message}`);
  }
};

export const getUserByUsername = async (username: string): Promise<User | null> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as User;
    }
    return null;
  } catch (error: any) {
    throw new Error(`Failed to get user by username: ${error.message}`);
  }
};

export const checkUsernameExists = async (username: string): Promise<boolean> => {
  try {
    const user = await getUserByUsername(username);
    return user !== null;
  } catch (error: any) {
    throw new Error(`Failed to check username: ${error.message}`);
  }
};

export const searchUsersByUsername = async (
  searchQuery: string,
  currentUserId: string,
  limitCount: number = 10
): Promise<User[]> => {
  try {
    if (!searchQuery || searchQuery.trim().length === 0) {
      return [];
    }

    const usersRef = collection(db, 'users');
    // Firestore prefix search - case sensitive
    // For case-insensitive, you'd need to store a lowercase version
    const q = query(
      usersRef,
      where('username', '>=', searchQuery),
      where('username', '<=', searchQuery + '\uf8ff'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);

    const users: User[] = [];
    querySnapshot.forEach((doc) => {
      const userData = { id: doc.id, ...doc.data() } as User;
      // Exclude current user from results
      if (userData.id !== currentUserId) {
        users.push(userData);
      }
    });

    return users;
  } catch (error: any) {
    throw new Error(`Failed to search users: ${error.message}`);
  }
};

export const getFriendSuggestions = async (
  currentUserId: string,
  limitCount: number = 10
): Promise<User[]> => {
  try {
    // Get current user's friends
    const currentUser = await getUserProfile(currentUserId);
    if (!currentUser) {
      return [];
    }

    const friendIds = currentUser.friends || [];
    const allFriendIds = new Set([...friendIds, currentUserId]);

    // Get all users
    const usersRef = collection(db, 'users');
    const q = query(usersRef, limit(limitCount * 3)); // Get more to filter
    const querySnapshot = await getDocs(q);

    const suggestions: User[] = [];
    querySnapshot.forEach((doc) => {
      const userData = { id: doc.id, ...doc.data() } as User;
      // Exclude current user and existing friends
      if (!allFriendIds.has(userData.id) && userData.publicProfile !== false) {
        suggestions.push(userData);
      }
      if (suggestions.length >= limitCount) {
        return;
      }
    });

    return suggestions.slice(0, limitCount);
  } catch (error: any) {
    throw new Error(`Failed to get friend suggestions: ${error.message}`);
  }
};

// Session operations
export const addSession = async (session: Omit<Session, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const sessionsRef = collection(db, 'sessions');
    const newSession = {
      ...session,
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(sessionsRef, newSession);
    return docRef.id;
  } catch (error: any) {
    throw new Error(`Failed to add session: ${error.message}`);
  }
};

export const getSessions = async (userId: string): Promise<Session[]> => {
  try {
    const sessionsRef = collection(db, 'sessions');
    const q = query(
      sessionsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Session[];
  } catch (error: any) {
    throw new Error(`Failed to get sessions: ${error.message}`);
  }
};

export const subscribeToSessions = (
  userId: string,
  callback: (sessions: Session[]) => void
): (() => void) => {
  const sessionsRef = collection(db, 'sessions');
  const q = query(
    sessionsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const sessions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Session[];
      callback(sessions);
    },
    (error) => {
      console.error('Error subscribing to sessions:', error);
      callback([]);
    }
  );
};

// Friend operations
export const getFriends = async (userId: string): Promise<Friend[]> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return [];
    }

    const friendIds = userSnap.data().friends || [];
    if (friendIds.length === 0) {
      return [];
    }

    const friends: Friend[] = [];
    for (const friendId of friendIds) {
      const friendDoc = await getUserProfile(friendId);
      if (friendDoc) {
        friends.push({
          id: friendDoc.id,
          username: friendDoc.username,
          avatarUrl: friendDoc.avatarUrl,
          email: friendDoc.email,
          showOnLeaderboard: friendDoc.showOnLeaderboard ?? true,
        });
      }
    }

    return friends;
  } catch (error: any) {
    throw new Error(`Failed to get friends: ${error.message}`);
  }
};

export const subscribeToFriends = (
  userId: string,
  callback: (friends: Friend[]) => void
): (() => void) => {
  const userRef = doc(db, 'users', userId);

  return onSnapshot(
    userRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const friendIds = snapshot.data().friends || [];
        if (friendIds.length === 0) {
          callback([]);
          return;
        }

        const friends: Friend[] = [];
        for (const friendId of friendIds) {
          try {
            const friendDoc = await getUserProfile(friendId);
            if (friendDoc) {
              friends.push({
                id: friendDoc.id,
                username: friendDoc.username,
                avatarUrl: friendDoc.avatarUrl,
                email: friendDoc.email,
                showOnLeaderboard: friendDoc.showOnLeaderboard ?? true,
              });
            }
          } catch (error) {
            console.error(`Error fetching friend ${friendId}:`, error);
          }
        }
        callback(friends);
      } else {
        callback([]);
      }
    },
    (error) => {
      console.error('Error subscribing to friends:', error);
      callback([]);
    }
  );
};

/**
 * Internal helper to add a friend to a user's friend list
 * WARNING: This is NOT transactional - use only within transactions
 * For public API, use acceptFriendRequest which handles transactions
 */
const addFriend = async (userId: string, friendId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const currentFriends = userSnap.data().friends || [];
      if (!currentFriends.includes(friendId)) {
        await updateDoc(userRef, {
          friends: [...currentFriends, friendId],
          updatedAt: Timestamp.now(),
        });
      }
    }
  } catch (error: any) {
    throw new Error(`Failed to add friend: ${error.message}`);
  }
};

/**
 * Internal helper to remove a friend from a user's friend list
 * WARNING: This is NOT transactional - use only within transactions if needed
 */
const removeFriend = async (userId: string, friendId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const currentFriends = userSnap.data().friends || [];
      await updateDoc(userRef, {
        friends: currentFriends.filter((id: string) => id !== friendId),
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error: any) {
    throw new Error(`Failed to remove friend: ${error.message}`);
  }
};

// Friend request operations
export const sendFriendRequest = async (
  fromUserId: string,
  toUserId: string,
  fromUsername: string,
  fromAvatarUrl: string
): Promise<string> => {
  try {
    const requestsRef = collection(db, 'friendRequests');
    const newRequest = {
      fromUserId,
      toUserId,
      fromUsername,
      fromAvatarUrl,
      status: 'pending',
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(requestsRef, newRequest);
    return docRef.id;
  } catch (error: any) {
    throw new Error(`Failed to send friend request: ${error.message}`);
  }
};

export const getFriendRequests = async (userId: string): Promise<FriendRequest[]> => {
  try {
    const requestsRef = collection(db, 'friendRequests');
    const q = query(
      requestsRef,
      where('toUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FriendRequest[];
  } catch (error: any) {
    throw new Error(`Failed to get friend requests: ${error.message}`);
  }
};

export const subscribeToFriendRequests = (
  userId: string,
  callback: (requests: FriendRequest[]) => void
): (() => void) => {
  const requestsRef = collection(db, 'friendRequests');
  const q = query(
    requestsRef,
    where('toUserId', '==', userId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const requests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FriendRequest[];
      callback(requests);
    },
    (error) => {
      console.error('Error subscribing to friend requests:', error);
      callback([]);
    }
  );
};

export const acceptFriendRequest = async (requestId: string, userId: string): Promise<void> => {
  try {
    const requestRef = doc(db, 'friendRequests', requestId);
    const toUserRef = doc(db, 'users', userId);

    await runTransaction(db, async (transaction) => {
      // GUARD: Read friend request FIRST - this must be read before user documents
      // to validate request exists and get fromUserId for subsequent reads
      const requestSnap = await transaction.get(requestRef);
      if (!requestSnap.exists()) {
        throw new Error('Friend request not found');
      }

      const requestData = requestSnap.data() as FriendRequest;
      
      // Verify the request is for the current user
      if (requestData.toUserId !== userId) {
        throw new Error('Unauthorized: This friend request is not for you');
      }

      // Verify request is still pending
      if (requestData.status !== 'pending') {
        throw new Error(`Friend request already ${requestData.status}`);
      }

      // GUARD: Read user documents AFTER reading request - this ordering ensures
      // we have validated the request before reading user data
      const fromUserRefFinal = doc(db, 'users', requestData.fromUserId);
      const [toUserSnap, fromUserSnap] = await Promise.all([
        transaction.get(toUserRef),
        transaction.get(fromUserRefFinal),
      ]);

      if (!toUserSnap.exists()) {
        throw new Error('Your user profile not found');
      }
      if (!fromUserSnap.exists()) {
        throw new Error('Sender user profile not found');
      }

      const toUserData = toUserSnap.data();
      const fromUserData = fromUserSnap.data();

      // Get current friend lists
      const toUserFriends = toUserData?.friends || [];
      const fromUserFriends = fromUserData?.friends || [];

      // Check if already friends (idempotency)
      if (toUserFriends.includes(requestData.fromUserId) || 
          fromUserFriends.includes(userId)) {
        // Already friends, just update request status
        transaction.update(requestRef, { status: 'accepted' });
        return;
      }

      // Atomically update all three documents
      transaction.update(requestRef, { status: 'accepted' });
      transaction.update(toUserRef, {
        friends: [...toUserFriends, requestData.fromUserId],
        updatedAt: Timestamp.now(),
      });
      transaction.update(fromUserRefFinal, {
        friends: [...fromUserFriends, userId],
        updatedAt: Timestamp.now(),
      });
    });
  } catch (error: any) {
    // Re-throw custom errors as-is
    if (error.message.includes('not found') || 
        error.message.includes('Unauthorized') ||
        error.message.includes('already')) {
      throw error;
    }
    throw new Error(`Failed to accept friend request: ${error.message}`);
  }
};

export const rejectFriendRequest = async (requestId: string, userId: string): Promise<void> => {
  try {
    const requestRef = doc(db, 'friendRequests', requestId);

    await runTransaction(db, async (transaction) => {
      // Read friend request - MUST be first read in transaction
      const requestSnap = await transaction.get(requestRef);
      if (!requestSnap.exists()) {
        throw new Error('Friend request not found');
      }

      const requestData = requestSnap.data() as FriendRequest;
      
      // Validate current user owns the request (is the recipient)
      if (requestData.toUserId !== userId) {
        throw new Error('Unauthorized: This friend request is not for you');
      }

      // Validate request is still pending (idempotency: allow rejecting already-rejected requests)
      if (requestData.status === 'accepted') {
        throw new Error('Cannot reject an already accepted friend request');
      }

      // Update request status to rejected (idempotent - can reject already rejected)
      transaction.update(requestRef, { status: 'rejected' });
    });
  } catch (error: any) {
    // Re-throw custom errors as-is
    if (error.message.includes('not found') || 
        error.message.includes('Unauthorized') ||
        error.message.includes('already accepted')) {
      throw error;
    }
    throw new Error(`Failed to reject friend request: ${error.message}`);
  }
};

// Get friend sessions for leaderboard
export const getFriendSessions = async (friendIds: string[]): Promise<{ [userId: string]: Session[] }> => {
  const result: { [userId: string]: Session[] } = {};
  
  for (const friendId of friendIds) {
    try {
      const sessions = await getSessions(friendId);
      result[friendId] = sessions;
    } catch (error) {
      console.error(`Error fetching sessions for friend ${friendId}:`, error);
      result[friendId] = [];
    }
  }
  
  return result;
};

