import { Link } from 'react-router-dom';
import { AddToCircleButton, RemoveFromCircleButton } from '../../features/circle/components/CircleActions.jsx';
import { Avatar } from './Avatar.jsx';

export function UserCard({ user, membership, compact = false }) {
  return (
    <article className={`user-card${compact ? ' user-card--compact' : ''}`}>
      <div className="user-card__topline">
        <Avatar name={user.name} size={compact ? 'medium' : 'large'} />
        {membership && (
          <span className={`member-tag${membership.pendingSync ? ' member-tag--pending' : ''}`}>
            <span aria-hidden="true">{membership.pendingSync ? '◷' : '✓'}</span>
            {membership.pendingSync ? 'Waiting to sync' : 'In your circle'}
          </span>
        )}
      </div>
      <div className="user-card__identity">
        <h2>{user.name}</h2>
        <p>{user.role}</p>
      </div>
      <div className="user-card__meta">
        <span>{user.department}</span>
        <span className="meta-separator" aria-hidden="true">·</span>
        <span>{user.location}</span>
      </div>
      <div className="user-card__actions">
        <Link className="text-link" to={`/users/${user.id}`}>
          View profile <span aria-hidden="true">↗</span>
        </Link>
        {compact && membership
          ? <RemoveFromCircleButton membership={membership} />
          : !membership && <AddToCircleButton userId={user.id} />}
      </div>
    </article>
  );
}
