/**
 * Avatar storage utility
 * Handles localStorage persistence for avatar selection
 */

const AVATAR_STORAGE_KEY = 'selectedAvatarUrl';

/**
 * Save selected avatar URL to localStorage
 */
export const saveAvatarToStorage = (avatarUrl: string | null): void => {
  try {
    if (avatarUrl) {
      localStorage.setItem(AVATAR_STORAGE_KEY, avatarUrl);
    } else {
      localStorage.removeItem(AVATAR_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Failed to save avatar to localStorage:', error);
  }
};

/**
 * Get saved avatar URL from localStorage
 */
export const getAvatarFromStorage = (): string | null => {
  try {
    return localStorage.getItem(AVATAR_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to get avatar from localStorage:', error);
    return null;
  }
};

/**
 * Clear saved avatar from localStorage
 */
export const clearAvatarFromStorage = (): void => {
  try {
    localStorage.removeItem(AVATAR_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear avatar from localStorage:', error);
  }
};

