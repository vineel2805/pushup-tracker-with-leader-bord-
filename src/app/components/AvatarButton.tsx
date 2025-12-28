import { useRef } from 'react';
import { Camera } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { InitialsAvatar } from './InitialsAvatar';

interface AvatarButtonProps {
  avatarUrl: string | null;
  alt: string;
  onClick: () => void;
  'aria-label'?: string;
}

export function AvatarButton({ avatarUrl, alt, onClick, 'aria-label': ariaLabel }: AvatarButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={buttonRef}
          onClick={onClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }}
          aria-label={ariaLabel || 'Change profile photo'}
          className="relative group focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-black rounded-full transition-all"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={alt}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <InitialsAvatar name={alt} size={64} className="w-16 h-16 rounded-full" />
          )}
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs">
        Change profile photo
      </TooltipContent>
    </Tooltip>
  );
}

