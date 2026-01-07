import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChange } from '../services/authService';
import { getUserProfile, createUserProfile, checkUsernameExists, User } from '../services/firestoreService';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  redirectLoading: boolean; // Keep for backwards compatibility
  redirectError: string | null; // Keep for backwards compatibility
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
  // No longer using redirect flow, but keep for API compatibility
  const [redirectLoading] = useState(false);
  const [redirectError] = useState<string | null>(null);
  
  const isMountedRef = useRef(true);
  const currentUserRef = useRef<FirebaseUser | null>(null);

  const clearRedirectError = useCallback(() => {
    // No-op since we don't use redirect flow anymore
  }, []);

  const refreshUserProfile = useCallback(async (user?: FirebaseUser) => {
    const userToCheck = user || currentUserRef.current;
    if (userToCheck) {
      try {
        let profile = await getUserProfile(userToCheck.uid);
        
        // Create profile if it doesn't exist (only for new users)
        if (!profile && userToCheck.email) {
          let username = userToCheck.displayName || userToCheck.email.split('@')[0];
          // Clean username - remove special characters and spaces
          username = username.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 20);
          
          if (!username) {
            username = 'user';
          }
          
          // Handle username collision
          try {
            let attempts = 0;
            const baseUsername = username;
            
            while (await checkUsernameExists(username) && attempts < 10) {
              username = `${baseUsername}${Math.floor(Math.random() * 10000)}`;
              attempts++;
              //console,log('[AuthContext] Username collision, trying:', username);
            }
          } catch (usernameCheckError) {
            console.error('[AuthContext] Error checking username:', usernameCheckError);
            username = `${username}${Date.now().toString().slice(-6)}`;
          }
          
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

  // No longer using redirect flow - popup works better on all devices

  useEffect(() => {
    isMountedRef.current = true;
    
    // Track the current auth operation to prevent race conditions
    let authOperationId = 0;
    
    const unsubscribe = onAuthStateChange(async (user) => {
      // Increment operation ID to invalidate any in-flight operations
      const currentOperationId = ++authOperationId;
      
     // console.log('[AuthContext] Auth state changed:', user?.email || 'null');
      
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
          
         // console.log('[AuthContext] User profile exists:', !!profile);
          
          // Create profile if it doesn't exist (for Google sign-in users)
          if (!profile && user.email) {
           // console.log('[AuthContext] Creating new profile for:', user.email);
            
            let username = user.displayName || user.email.split('@')[0];
            // Clean username - remove special characters and spaces
            username = username.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 20);
            
            if (!username) {
              username = 'user';
            }
            
            // Handle username collision
            try {
              let attempts = 0;
              const baseUsername = username;
              
              while (await checkUsernameExists(username) && attempts < 10) {
                username = `${baseUsername}${Math.floor(Math.random() * 10000)}`;
                attempts++;
                //console.log('[AuthContext] Username collision, trying:', username);
              }
            } catch (usernameCheckError) {
              console.error('[AuthContext] Error checking username:', usernameCheckError);
              username = `${username}${Date.now().toString().slice(-6)}`;
            }
            
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
            //console.log('[AuthContext] ✅ Profile created successfully:', profile?.username);
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

