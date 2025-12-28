import { useRef } from 'react';
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
      className="relative focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-black rounded-full transition-all hover:opacity-90"
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
    </button>
  );
}

