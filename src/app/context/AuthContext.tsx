import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChange } from '../services/authService';
import { getUserProfile, createUserProfile, User } from '../services/firestoreService';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserProfile = async (user?: FirebaseUser) => {
    const userToCheck = user || currentUser;
    if (userToCheck) {
      try {
        let profile = await getUserProfile(userToCheck.uid);
        
        // Create profile if it doesn't exist (only for new users)
        if (!profile && userToCheck.email) {
          const username = userToCheck.displayName || userToCheck.email.split('@')[0];
          await createUserProfile(userToCheck.uid, {
            username: username,
            email: userToCheck.email,
            bio: '',
            avatarUrl: userToCheck.photoURL || null,
            publicProfile: true,
            showOnLeaderboard: true,
            showGraphs: true,
          });
          profile = await getUserProfile(userToCheck.uid);
        }
        
        setUserProfile(profile);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUserProfile(null);
      }
    } else {
      setUserProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      setCurrentUser(user);
      setLoading(true);

      if (user) {
        await refreshUserProfile(user);
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

