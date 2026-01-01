/**
 * Centralized Firebase Authentication Error Handler
 * Maps Firebase error codes to user-friendly messages
 * Prevents exposing raw Firebase error codes to UI
 */

export interface AuthError {
  code: string;
  message: string;
  userFriendlyMessage: string;
}

/**
 * Maps Firebase Auth error codes to user-friendly messages
 * Prevents email enumeration by using generic messages where appropriate
 */
export function getAuthErrorMessage(error: any): string {
  const errorCode = error?.code || '';
  const errorMessage = error?.message || 'An unexpected error occurred';

  // Handle Firebase Auth errors
  if (errorCode.startsWith('auth/')) {
    const code = errorCode.replace('auth/', '');

    switch (code) {
      // Authentication errors - generic to prevent enumeration
      case 'user-not-found':
      case 'wrong-password':
      case 'invalid-credential':
        return 'Invalid email or password. Please try again.';

      case 'email-already-in-use':
        return 'An account with this email already exists.';

      case 'weak-password':
        return 'Password is too weak. Please use a stronger password.';

      case 'invalid-email':
        return 'Please enter a valid email address.';

      case 'operation-not-allowed':
        return 'This sign-in method is not enabled. Please contact support.';

      case 'too-many-requests':
        return 'Too many failed attempts. Please try again later.';

      // Email verification errors
      case 'email-already-verified':
        return 'This email is already verified.';

      // Password reset errors - generic to prevent enumeration
      case 'user-disabled':
        return 'This account has been disabled. Please contact support.';

      // Reauthentication errors
      case 'requires-recent-login':
        return 'For security, please log in again to continue.';

      case 'invalid-verification-code':
        return 'Invalid verification code. Please try again.';

      case 'invalid-verification-id':
        return 'Verification session expired. Please try again.';

      // OAuth errors
      case 'account-exists-with-different-credential':
        return 'An account already exists with this email. Please sign in with your original method.';

      case 'popup-closed-by-user':
        return 'Sign-in popup was closed. Please try again.';

      case 'popup-blocked':
        return 'Pop-up was blocked. Please allow pop-ups and try again.';

      case 'cancelled-popup-request':
        return 'Sign-in was cancelled. Please try again.';

      // Network errors
      case 'network-request-failed':
        return 'Network error. Please check your connection and try again.';

      // Generic auth errors
      case 'internal-error':
        return 'An internal error occurred. Please try again later.';

      default:
        // For unknown auth errors, return a generic message
        return 'Authentication failed. Please try again.';
    }
  }

  // Handle custom application errors
  if (errorMessage.includes('No user logged in')) {
    return 'You must be logged in to perform this action.';
  }

  if (errorMessage.includes('Email not verified')) {
    return 'Please verify your email address before continuing.';
  }

  // For non-Firebase errors, return sanitized message
  // Never expose raw error messages that might contain sensitive info
  if (errorMessage.includes('Failed to')) {
    return errorMessage;
  }

  // Default fallback - never expose raw Firebase errors
  return 'An error occurred. Please try again.';
}

/**
 * Creates a standardized error object
 */
export function createAuthError(error: any): AuthError {
  const code = error?.code || 'unknown';
  const message = error?.message || 'An unexpected error occurred';
  const userFriendlyMessage = getAuthErrorMessage(error);

  return {
    code,
    message,
    userFriendlyMessage,
  };
}

/**
 * Throws a user-friendly error
 */
export function throwAuthError(error: any): never {
  throw new Error(getAuthErrorMessage(error));
}

