import { Edit } from 'lucide-react';
import { AvatarButton } from './AvatarButton';

interface ProfileHeaderProps {
  avatarUrl: string | null;
  displayName: string;
  username: string;
  onAvatarClick: () => void;
  onEditClick?: () => void;
}

export function ProfileHeader({
  avatarUrl,
  displayName,
  username,
  onAvatarClick,
  onEditClick,
}: ProfileHeaderProps) {
  return (
    <div className="flex items-start gap-4 pb-4 border-b border-zinc-800/50">
      <AvatarButton
        avatarUrl={avatarUrl}
        alt={displayName}
        onClick={onAvatarClick}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-white truncate">{displayName}</h2>
            <p className="text-sm text-zinc-400 mt-0.5">@{username}</p>
          </div>
          {onEditClick && (
            <button
              onClick={onEditClick}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-white transition-colors"
              aria-label="Edit profile"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

