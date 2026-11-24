import { useAppData } from '../../../app/useAppData.js';
import { UserCard } from '../../../shared/components/UserCard.jsx';

export function CirclePage() {
  const { users, memberships, status } = useAppData();
  const members = memberships
    .map((membership) => ({
      membership,
      user: users.find((candidate) => candidate.id === membership.userId)
    }))
    .filter((entry) => entry.user);

  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">YOUR PEOPLE, ALL IN ONE PLACE</p>
        <div className="page-heading__row">
          <div>
            <h1>My Circle<span className="heading-period">.</span></h1>
            <p className="page-heading__description">A closer view of the people you’ve added to your circle.</p>
          </div>
          <span className="result-count"><strong>{members.length}</strong> {members.length === 1 ? 'member' : 'members'}</span>
        </div>
      </section>

      {status.api === 'loading' && memberships.length === 0 ? (
        <div className="user-grid" aria-label="Loading your circle">
          {Array.from({ length: 2 }, (_, index) => <div className="user-card skeleton" key={index} />)}
        </div>
      ) : members.length > 0 ? (
        <section className="user-grid" aria-label="My Circle members">
          {members.map(({ membership, user }) => (
            <UserCard key={membership.id} user={user} compact membership={membership} />
          ))}
        </section>
      ) : (
        <section className="empty-state">
          <span className="empty-state__symbol" aria-hidden="true">◌</span>
          <h2>{status.api === 'unavailable' ? 'Your Circle could not be loaded' : 'Your circle is just getting started'}</h2>
          <p>{status.api === 'unavailable' ? 'Start the mock API and refresh to load your members.' : 'When you add someone, they’ll be easy to find here.'}</p>
        </section>
      )}
    </>
  );
}
