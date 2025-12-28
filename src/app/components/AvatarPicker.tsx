import { useState, useEffect } from 'react';
import { getAvatarImageUrls } from '../utils/avatarLoader';

interface AvatarPickerProps {
  currentAvatarUrl: string | null;
  onSelect: (avatarUrl: string) => void;
  onRemove?: () => void;
}

export function AvatarPicker({ currentAvatarUrl, onSelect, onRemove }: AvatarPickerProps) {
  const [avatarUrls, setAvatarUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load avatar images
    const images = getAvatarImageUrls();
    setAvatarUrls(images);
    setLoading(false);
  }, []);

  const handleAvatarClick = (avatarUrl: string) => {
    onSelect(avatarUrl);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-zinc-400 text-sm">Loading avatars...</div>
      </div>
    );
  }

  if (avatarUrls.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-zinc-400 text-sm">No avatars available</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Avatar Grid */}
      <div className="grid grid-cols-4 gap-3">
        {avatarUrls.map((url, index) => {
          const isSelected = currentAvatarUrl === url;
          return (
            <button
              key={`${url}-${index}`}
              onClick={() => handleAvatarClick(url)}
              className={`
                relative aspect-square rounded-full overflow-hidden
                transition-all duration-200
                ${isSelected 
                  ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-900 scale-105' 
                  : 'hover:scale-105 hover:ring-2 hover:ring-zinc-600 hover:ring-offset-2 hover:ring-offset-zinc-900'
                }
                focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900
              `}
              aria-label={`Select avatar ${index + 1}`}
              aria-pressed={isSelected}
            >
              <img
                src={url}
                alt={`Avatar ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  // Hide broken images
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {isSelected && (
                <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Remove Button */}
      {currentAvatarUrl && onRemove && (
        <div className="pt-2 border-t border-zinc-800">
          <button
            onClick={onRemove}
            className="w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
            aria-label="Remove avatar"
          >
            Remove Avatar
          </button>
        </div>
      )}
    </div>
  );
}

