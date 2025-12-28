import { useMemo } from 'react';
import { generateInitialsAvatar, getInitials } from '../utils/avatarUtils';

interface InitialsAvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export function InitialsAvatar({ name, size = 64, className = '' }: InitialsAvatarProps) {
  const avatarUrl = useMemo(() => {
    const initials = getInitials(name);
    return generateInitialsAvatar(initials, size);
  }, [name, size]);

  return (
    <img
      src={avatarUrl}
      alt={name || 'User'}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}

