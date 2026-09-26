import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { getUserColorClass } from '../utils/user';

interface UserPseudoLinkProps {
  userId?: number | null;
  username: string;
  profil?: number | null;
  className?: string;
  style?: CSSProperties;
}

/**
 * Pseudo cliquable d'un membre menant à son profil public.
 * Conserve la coloration selon le profil (admin, membre d'honneur).
 */
export function UserPseudoLink({ userId, username, profil, className = '', style }: UserPseudoLinkProps) {
  if (!userId) {
    return <span className={className} style={style}>{username}</span>;
  }

  return (
    <Link
      to={`/users/${userId}`}
      data-testid="user-profile-link"
      title={`Voir le profil de ${username}`}
      className={`hover:underline ${getUserColorClass(profil, className)}`}
      style={style}
    >
      {username}
    </Link>
  );
}
