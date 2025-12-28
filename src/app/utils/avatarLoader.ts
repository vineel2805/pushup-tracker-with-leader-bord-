/**
 * Avatar loader utility
 * Dynamically loads avatar images from the profile-pics folder
 * 
 * Supports both:
 * - src/profile-pics/ (using Vite's import.meta.glob)
 * - public/profile-pics/ (using static paths)
 */

/**
 * Load avatar images using Vite's import.meta.glob
 * This works for files in src/ directory
 */
const loadAvatarImagesFromSrc = (): string[] => {
  try {
    // Use Vite's glob import to get all images from src/profile-pics
    // The ?url query returns the URL string directly when eager is true
    const avatarModules = import.meta.glob('/src/profile-pics/*.{png,jpg,jpeg,webp,avif}', {
      eager: true,
      query: '?url',
    });

    // When using ?url with eager: true, values are URL strings
    const urls = Object.values(avatarModules) as string[];
    return urls.filter((url): url is string => typeof url === 'string' && url.length > 0);
  } catch (error) {
    console.warn('Failed to load avatars from src:', error);
    return [];
  }
};

/**
 * Static list of avatar images for public/profile-pics/
 * These paths are relative to the public folder root
 */
const PUBLIC_AVATAR_PATHS = [
  '/profile-pics/41e0398984b0f1a0c79acfb0694bfcce.jpg',
  '/profile-pics/cute-woman-avatar-profile-vector-illustration_1058532-14546.avif',
  '/profile-pics/cute-woman-avatar-profile-vector-illustration_1058532-14592.avif',
  '/profile-pics/female-avatar-brunette-woman-portrait-illustration-of-a-female-character-in-a-modern-color-style-vector.jpg',
  '/profile-pics/mans-profile-red-circle-digital-illustration_96461-13196.avif',
  '/profile-pics/portrait-young-man-gentle-smile-spiked-hair-326501367.webp',
  '/profile-pics/stylish-man-flat-vector-profile-picture-ai-generated_606187-308.avif',
];

/**
 * Get all available avatar image URLs
 * Tries src folder first (development), falls back to public folder paths
 */
export const getAvatarImageUrls = (): string[] => {
  // Try loading from src/profile-pics first (works with Vite's glob)
  const srcImages = loadAvatarImagesFromSrc();
  if (srcImages.length > 0) {
    return srcImages;
  }

  // Fall back to public folder paths
  return PUBLIC_AVATAR_PATHS;
};

