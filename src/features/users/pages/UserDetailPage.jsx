import { Link, useParams } from 'react-router-dom';
import { useAppData } from '../../../app/useAppData.js';
import { AddToCircleButton } from '../../circle/components/CircleActions.jsx';
import { Avatar } from '../../../shared/components/Avatar.jsx';

export function UserDetailPage() {
  const { userId } = useParams();
  const { users, status } = useAppData();
  const user = users.find((candidate) => String(candidate.id) === userId);

  if (!user) {
    return (
      <section className="empty-state empty-state--profile">
        <h1>{status.api === 'loading' ? 'Loading profile…' : 'Profile not found'}</h1>
        <p>{status.api === 'unavailable' ? 'The user directory could not be loaded.' : 'This person may no longer be in the directory.'}</p>
        <Link className="button button--secondary" to="/users">Back to people</Link>
      </section>
    );
  }

  return (
    <>
      <Link className="back-link" to="/users"><span aria-hidden="true">←</span> All people</Link>
      <article className="profile-card">
        <div className="profile-card__cover" />
        <div className="profile-card__body">
          <Avatar name={user.name} size="profile" />
          <p className="eyebrow">A LITTLE ABOUT THEM</p>
          <h1>{user.name}</h1>
          <p className="profile-card__role">{user.role} <span>·</span> {user.department}</p>
          <p className="profile-card__bio">{user.bio}</p>
          <div className="profile-actions">
            <AddToCircleButton userId={user.id} />
          </div>

          <div className="profile-details">
            <div className="profile-detail">
              <span className="profile-detail__icon" aria-hidden="true">⌖</span>
              <div><span className="profile-detail__label">Based in</span><strong>{user.location}</strong></div>
            </div>
            <div className="profile-detail">
              <span className="profile-detail__icon" aria-hidden="true">＠</span>
              <div><span className="profile-detail__label">Email</span><a href={`mailto:${user.email}`}>{user.email}</a></div>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
