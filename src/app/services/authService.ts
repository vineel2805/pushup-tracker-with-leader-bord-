import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
  sendEmailVerification,
  linkWithCredential,
  linkWithPopup,
  unlink,
  deleteUser,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  AuthCredential,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { throwAuthError, getAuthErrorMessage } from '../utils/authErrors';
import { deleteUserData, getUserProfile } from './firestoreService';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified?: boolean;
}

// Rate limiting for password changes (client-side cooldown)
let lastPasswordChangeTime: number = 0;
const PASSWORD_CHANGE_COOLDOWN_MS = 60000; // 1 minute

/**
 * Validates password strength
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }

  return { valid: true };
}

/**
 * Sign up with email and password
 * Sends verification email immediately after registration
 */
export const signUp = async (
  email: string,
  password: string,
  username: string
): Promise<AuthUser> => {
  try {
    // Validate password strength before creating account
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.error);
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: username,
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    });

    // Send verification email immediately
    try {
      await sendEmailVerification(user);
    } catch (verifyError) {
      // Log but don't fail signup if verification email fails
      console.error('Failed to send verification email:', verifyError);
    }

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
    };
  } catch (error: any) {
    throwAuthError(error);
  }
};

/**
 * Sign in with email and password
 * Supports "Remember Me" via persistence setting
 */
export const logIn = async (
  email: string,
  password: string,
  rememberMe: boolean = false
): Promise<AuthUser> => {
  try {
    // Set persistence based on "Remember Me"
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
    };
  } catch (error: any) {
    throwAuthError(error);
  }
};

/**
 * Sign out
 */
export const logOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    throwAuthError(error);
  }
};

/**
 * Change password with reauthentication and rate limiting
 * Forces logout after successful password change for security
 */
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('No user logged in');
    }

    // Client-side rate limiting
    const now = Date.now();
    const timeSinceLastChange = now - lastPasswordChangeTime;
    if (timeSinceLastChange < PASSWORD_CHANGE_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((PASSWORD_CHANGE_COOLDOWN_MS - timeSinceLastChange) / 1000);
      throw new Error(`Please wait ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''} before changing your password again`);
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.error);
    }

    // Re-authenticate user (enforce recent login)
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    try {
      await reauthenticateWithCredential(user, credential);
    } catch (reauthError: any) {
      // Reauthentication failed - fail loudly
      if (reauthError.code === 'auth/requires-recent-login') {
        throw new Error('For security, please log out and log back in before changing your password');
      }
      throwAuthError(reauthError);
    }

    // Update password
    await updatePassword(user, newPassword);
    
    // Update rate limit timestamp
    lastPasswordChangeTime = now;

    // Force logout after password change for security
    await signOut(auth);
  } catch (error: any) {
    // Re-throw custom errors as-is
    if (error.message.includes('Please wait') || error.message.includes('Password must')) {
      throw error;
    }
    throwAuthError(error);
  }
};

/**
 * Send email verification
 */
export const sendVerificationEmail = async (): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }

    if (user.emailVerified) {
      throw new Error('Email is already verified');
    }

    await sendEmailVerification(user);
  } catch (error: any) {
    throwAuthError(error);
  }
};

/**
 * Resend verification email
 */
export const resendVerificationEmail = async (): Promise<void> => {
  return sendVerificationEmail();
};

/**
 * Get current authenticated user
 */
export const getCurrentAuthUser = (): User | null => {
  return auth.currentUser;
};

/**
 * Subscribe to auth state changes
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Check if running on mobile device
 */
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Sign in with Google
 * Uses redirect on mobile for better UX, popup on desktop
 * Handles email collisions and account linking
 */
export const signInWithGoogle = async (): Promise<AuthUser> => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account'
  });

  try {
    // Use redirect on mobile devices for better compatibility
    if (isMobileDevice()) {
      // Store flag to check redirect result on page load
      sessionStorage.setItem('googleSignInPending', 'true');
      await signInWithRedirect(auth, provider);
      // This won't execute as the page will redirect
      throw new Error('Redirecting to Google...');
    }

    // Use popup on desktop
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
    };
  } catch (error: any) {
    // Clear pending flag on error
    sessionStorage.removeItem('googleSignInPending');
    
    // Handle redirecting message
    if (error.message === 'Redirecting to Google...') {
      throw error;
    }

    // Handle account exists with different credential
    if (error.code === 'auth/account-exists-with-different-credential') {
      const email = error.customData?.email;
      if (email) {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          const methodName = methods[0] === 'password' ? 'email and password' : methods[0];
          throw new Error(
            `An account already exists with ${email}. Please sign in with ${methodName} first, then link your Google account in Settings.`
          );
        } catch (fetchError: any) {
          if (fetchError.message.includes('An account already exists')) {
            throw fetchError;
          }
          throw new Error(`An account already exists with this email. Please try a different sign-in method.`);
        }
      }
    }

    // Handle popup closed
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled. Please try again.');
    }

    // Handle popup blocked
    if (error.code === 'auth/popup-blocked') {
      throw new Error('Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.');
    }

    // Handle network errors
    if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection and try again.');
    }

    // Handle cancelled popup request
    if (error.code === 'auth/cancelled-popup-request') {
      throw new Error('Sign-in was cancelled. Please try again.');
    }

    // Handle unauthorized domain
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error('This domain is not authorized for Google Sign-In. Please contact support.');
    }

    // Handle operation not allowed
    if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Google Sign-In is not enabled. Please contact support.');
    }

    // Handle internal error
    if (error.code === 'auth/internal-error') {
      throw new Error('An internal error occurred. Please try again later.');
    }

    throwAuthError(error);
  }
};

/**
 * Handle Google redirect result
 * Call this on app initialization to handle redirect results
 */
export const handleGoogleRedirectResult = async (): Promise<AuthUser | null> => {
  try {
    const isPending = sessionStorage.getItem('googleSignInPending');
    if (!isPending) {
      return null;
    }

    sessionStorage.removeItem('googleSignInPending');
    
    const result = await getRedirectResult(auth);
    
    if (result && result.user) {
      return {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        emailVerified: result.user.emailVerified,
      };
    }
    
    return null;
  } catch (error: any) {
    sessionStorage.removeItem('googleSignInPending');
    
    // Handle specific redirect errors
    if (error.code === 'auth/account-exists-with-different-credential') {
      const email = error.customData?.email;
      throw new Error(
        `An account already exists with ${email || 'this email'}. Please sign in with your original method.`
      );
    }

    if (error.code === 'auth/credential-already-in-use') {
      throw new Error('This Google account is already linked to another user.');
    }

    throwAuthError(error);
  }
};

/**
 * Link Google account to existing email account
 */
export const linkGoogleAccount = async (): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }

    // Check if already linked
    const providers = user.providerData.map(p => p.providerId);
    if (providers.includes('google.com')) {
      throw new Error('Google account is already linked');
    }

    const provider = new GoogleAuthProvider();
    await linkWithPopup(user, provider);
  } catch (error: any) {
    // Re-throw custom errors as-is
    if (error.message.includes('already linked')) {
      throw error;
    }
    throwAuthError(error);
  }
};

/**
 * Unlink Google account
 */
export const unlinkGoogleAccount = async (): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }

    // Check if Google is linked
    const providers = user.providerData.map(p => p.providerId);
    if (!providers.includes('google.com')) {
      throw new Error('Google account is not linked');
    }

    // Prevent unlinking if it's the only provider
    if (providers.length === 1) {
      throw new Error('Cannot unlink Google account. It is your only sign-in method. Please add email/password first.');
    }

    // Find Google provider
    const googleProvider = user.providerData.find(p => p.providerId === 'google.com');
    if (!googleProvider) {
      throw new Error('Google account not found');
    }

    await unlink(user, 'google.com');
  } catch (error: any) {
    // Re-throw custom errors as-is
    if (error.message.includes('Cannot unlink') || error.message.includes('not linked') || error.message.includes('not found')) {
      throw error;
    }
    throwAuthError(error);
  }
};

/**
 * Send password reset email
 * Prevents email enumeration by using generic messages
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
    // Always return success to prevent email enumeration
    // Even if email doesn't exist, we show the same success message
  } catch (error: any) {
    // For security, show generic message even on error
    // This prevents attackers from enumerating valid emails
    const errorCode = error?.code || '';
    if (errorCode === 'auth/user-not-found') {
      // Silently succeed to prevent enumeration
      return;
    }
    // Only throw for non-enumeration errors
    throwAuthError(error);
  }
};

/**
 * Delete user account
 * Deletes Firebase Auth user and related Firestore data
 * Implements 7-day soft delete using Firestore flag
 */
export const deleteAccount = async (password?: string): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }

    // If user has email/password, require reauthentication
    const providers = user.providerData.map(p => p.providerId);
    if (providers.includes('password') && user.email && password) {
      const credential = EmailAuthProvider.credential(user.email, password);
      try {
        await reauthenticateWithCredential(user, credential);
      } catch (reauthError: any) {
        throw new Error('Incorrect password. Please verify your password and try again.');
      }
    } else if (providers.includes('password') && !password) {
      throw new Error('Password required to delete account');
    }

    // Mark account for soft delete in Firestore (7-day grace period)
    try {
      const userProfile = await getUserProfile(user.uid);
      if (userProfile) {
        const { updateDoc, doc, Timestamp } = await import('firebase/firestore');
        const { db } = await import('../config/firebase');
        const userRef = doc(db, 'users', user.uid);
        const deleteDate = new Date();
        deleteDate.setDate(deleteDate.getDate() + 7); // 7 days from now
        
        await updateDoc(userRef, {
          deletedAt: Timestamp.fromDate(deleteDate),
          isDeleted: true,
        } as any);
      }
    } catch (firestoreError) {
      console.error('Failed to mark account for soft delete:', firestoreError);
      // Continue with hard delete if soft delete fails
    }

    // Delete Firestore user data
    try {
      await deleteUserData(user.uid);
    } catch (deleteError) {
      console.error('Failed to delete user data:', deleteError);
      // Continue with auth deletion even if Firestore deletion fails
    }

    // Delete Firebase Auth user
    await deleteUser(user);
  } catch (error: any) {
    // Re-throw custom errors as-is
    if (error.message.includes('Password required') || error.message.includes('Incorrect password')) {
      throw error;
    }
    throwAuthError(error);
  }
};

/**
 * Export user data before deletion
 */
export const exportUserData = async (): Promise<any> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }

    const userProfile = await getUserProfile(user.uid);
    
    return {
      auth: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        createdAt: user.metadata.creationTime,
        lastSignIn: user.metadata.lastSignInTime,
      },
      profile: userProfile,
      exportedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    throwAuthError(error);
  }
};
