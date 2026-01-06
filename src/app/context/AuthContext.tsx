import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChange, handleGoogleRedirectResult } from '../services/authService';
import { getUserProfile, createUserProfile, User } from '../services/firestoreService';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  redirectLoading: boolean;
  redirectError: string | null;
  refreshUserProfile: () => Promise<void>;
  clearRedirectError: () => void;
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
  const [redirectLoading, setRedirectLoading] = useState(true);
  const [redirectError, setRedirectError] = useState<string | null>(null);
  
  const isMountedRef = useRef(true);
  const currentUserRef = useRef<FirebaseUser | null>(null);
  const redirectHandledRef = useRef(false);

  const clearRedirectError = useCallback(() => {
    setRedirectError(null);
  }, []);

  const refreshUserProfile = useCallback(async (user?: FirebaseUser) => {
    const userToCheck = user || currentUserRef.current;
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
        
        if (isMountedRef.current) {
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        if (isMountedRef.current) {
          setUserProfile(null);
        }
      }
    } else {
      if (isMountedRef.current) {
        setUserProfile(null);
      }
    }
  }, []);

  // Handle Google redirect result on app initialization
  useEffect(() => {
    const handleRedirect = async () => {
      if (redirectHandledRef.current) {
        setRedirectLoading(false);
        return;
      }
      
      redirectHandledRef.current = true;
      
      try {
        console.log('[AuthContext] Checking for Google redirect result...');
        const result = await handleGoogleRedirectResult();
        
        if (result) {
          console.log('[AuthContext] Google redirect successful:', result.email);
          // The onAuthStateChange will handle setting the user
        } else {
          console.log('[AuthContext] No pending Google redirect');
        }
      } catch (error: any) {
        console.error('[AuthContext] Google redirect error:', error);
        if (isMountedRef.current) {
          setRedirectError(error.message || 'Failed to complete Google sign-in');
        }
      } finally {
        if (isMountedRef.current) {
          setRedirectLoading(false);
        }
      }
    };

    handleRedirect();
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Track the current auth operation to prevent race conditions
    let authOperationId = 0;
    
    const unsubscribe = onAuthStateChange(async (user) => {
      // Increment operation ID to invalidate any in-flight operations
      const currentOperationId = ++authOperationId;
      
      console.log('[AuthContext] Auth state changed:', user?.email || 'null');
      
      // Update refs immediately (synchronous)
      currentUserRef.current = user;
      
      if (!isMountedRef.current) return;
      
      setCurrentUser(user);
      setLoading(true);

      if (user) {
        try {
          let profile = await getUserProfile(user.uid);
          
          // Check if this operation is still valid and component is mounted
          if (currentOperationId !== authOperationId || !isMountedRef.current) return;
          
          console.log('[AuthContext] User profile exists:', !!profile);
          
          // Create profile if it doesn't exist (for Google sign-in users)
          if (!profile && user.email) {
            console.log('[AuthContext] Creating new profile for:', user.email);
            const username = user.displayName || user.email.split('@')[0];
            await createUserProfile(user.uid, {
              username: username,
              email: user.email,
              bio: '',
              avatarUrl: user.photoURL || null,
              publicProfile: true,
              showOnLeaderboard: true,
              showGraphs: true,
            });
            
            // Check again after async operation
            if (currentOperationId !== authOperationId || !isMountedRef.current) return;
            
            profile = await getUserProfile(user.uid);
            console.log('[AuthContext] Profile created successfully');
          }
          
          // Final check before setting state
          if (currentOperationId === authOperationId && isMountedRef.current) {
            setUserProfile(profile);
            setLoading(false);
          }
        } catch (error) {
          console.error('[AuthContext] Error fetching/creating user profile:', error);
          if (currentOperationId === authOperationId && isMountedRef.current) {
            setUserProfile(null);
            setLoading(false);
          }
        }
      } else {
        if (isMountedRef.current) {
          setUserProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    redirectLoading,
    redirectError,
    refreshUserProfile,
    clearRedirectError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

