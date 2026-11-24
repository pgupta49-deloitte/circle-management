import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppData } from '../../../app/useAppData.js';
import { UserCard } from '../../../shared/components/UserCard.jsx';

export function UsersPage() {
  const { users, memberships, status } = useAppData();
  const [search, setSearch] = useState('');
  const searchInput = useRef(null);
  const membershipByUserId = useMemo(
    () => new Map(memberships.map((membership) => [membership.userId, membership])),
    [memberships]
  );

  useEffect(() => {
    function focusSearch(event) {
      const target = event.target;
      const isTyping = target instanceof HTMLElement && (
        target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      );

      if (event.key === '/' && !isTyping) {
        event.preventDefault();
        searchInput.current?.focus();
      }
    }

    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) =>
      [user.name, user.role, user.department, user.location]
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [search, users]);

  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">GOOD PEOPLE, GOOD WORK</p>
        <div className="page-heading__row">
          <div>
            <h1>Find your people.</h1>
            <p className="page-heading__description">Get to know the people making things happen around you.</p>
          </div>
          <span className="result-count"><strong>{users.length}</strong> people</span>
        </div>
      </section>

      <section className="directory-controls" aria-label="Directory controls">
        <label className="search-box">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.3 4.3" /></svg>
          <span className="sr-only">Search people</span>
          <input
            ref={searchInput}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, role, or team"
          />
          <kbd>/</kbd>
        </label>
        <span className="directory-controls__hint">A little curiosity goes a long way.</span>
      </section>

      {status.api === 'loading' && users.length === 0 ? (
        <div className="user-grid" aria-label="Loading people">
          {Array.from({ length: 6 }, (_, index) => <div className="user-card skeleton" key={index} />)}
        </div>
      ) : filteredUsers.length > 0 ? (
        <section className="user-grid" aria-label="People directory">
          {filteredUsers.map((user) => (
            <UserCard key={user.id} user={user} membership={membershipByUserId.get(user.id)} />
          ))}
        </section>
      ) : (
        <section className="empty-state">
          <span className="empty-state__symbol" aria-hidden="true">⌕</span>
          <h2>{users.length ? 'No one found' : 'The directory is taking a moment'}</h2>
          <p>{users.length ? 'Try another name, role, or team.' : 'Check that the mock API is running, then refresh this page.'}</p>
        </section>
      )}
    </>
  );
}
