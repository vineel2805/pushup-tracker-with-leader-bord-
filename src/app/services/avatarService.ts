import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

export const uploadAvatar = async (userId: string, file: File): Promise<string> => {
  try {
    // Strip EXIF data by converting to canvas
    const processedFile = await stripEXIF(file);
    
    // Create storage reference
    const storageRef = ref(storage, `avatars/${userId}/${Date.now()}.jpg`);
    
    // Upload file
    await uploadBytes(storageRef, processedFile, {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000',
    });
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error: any) {
    throw new Error(`Failed to upload avatar: ${error.message}`);
  }
};

export const deleteAvatar = async (avatarUrl: string): Promise<void> => {
  try {
    // Extract path from URL
    const url = new URL(avatarUrl);
    const path = decodeURIComponent(url.pathname.split('/o/')[1]?.split('?')[0] || '');
    
    if (path && path.startsWith('avatars/')) {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    }
  } catch (error: any) {
    // Ignore errors if file doesn't exist
    console.warn('Failed to delete avatar:', error);
  }
};

const stripEXIF = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Crop to square (center)
          const x = (img.width - size) / 2;
          const y = (img.height - size) / 2;
          ctx.drawImage(img, x, y, size, size, 0, 0, size, size);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const newFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
                resolve(newFile);
              } else {
                reject(new Error('Failed to process image'));
              }
            },
            'image/jpeg',
            0.9
          );
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

