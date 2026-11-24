import { NavLink, Outlet } from 'react-router-dom';
import { useAppData } from './useAppData.js';

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 36 36" fill="none">
        <circle cx="13" cy="13" r="6" />
        <circle cx="23" cy="13" r="6" />
        <path d="M6 27c0-4 3.1-7 7-7s7 3 7 7" />
        <path d="M16 27c0-4 3.1-7 7-7s7 3 7 7" />
      </svg>
    </span>
  );
}

function ConnectionStatus() {
  const { status } = useAppData();
  const label = {
    loading: 'Connecting',
    connected: 'API connected',
    cached: 'Using saved data',
    partial: 'Partly connected',
    unavailable: 'API unavailable'
  }[status.api];

  return (
    <div className={`connection-status connection-status--${status.api}`} role="status">
      <span className="connection-status__dot" aria-hidden="true" />
      {label}
    </div>
  );
}

export function AppShell() {
  const { memberships, isOfflineSimulated, setOfflineSimulated, pendingOperationCount } = useAppData();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/users" aria-label="Circle Management home">
          <BrandMark />
          <span>circle<span className="brand__light">mate</span></span>
        </NavLink>

        <p className="nav-label">YOUR SPACE</p>
        <nav className="primary-nav" aria-label="Main navigation">
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`} to="/users">
            <span className="nav-link__icon" aria-hidden="true">⌕</span>
            <span>Discover people</span>
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`} to="/circle">
            <span className="nav-link__icon nav-link__icon--circle" aria-hidden="true">◉</span>
            <span>My Circle</span>
            <span className="nav-link__count">{memberships.length}</span>
          </NavLink>
        </nav>

        <div className="sidebar__bottom">
          <div className="sidebar-note">
            <span className="sidebar-note__spark" aria-hidden="true">✳</span>
            <p>Your people make work feel a little more connected.</p>
          </div>
          <div className="sidebar-tools">
            <ConnectionStatus />
            <button
              className={`offline-control${isOfflineSimulated ? ' offline-control--active' : ''}`}
              type="button"
              aria-pressed={isOfflineSimulated}
              onClick={() => setOfflineSimulated((current) => !current)}
            >
              <span>Simulate offline</span>
              <span className="toggle-track" aria-hidden="true"><span /></span>
            </button>
            {pendingOperationCount > 0 && (
              <p className="sync-queue-count">
                {pendingOperationCount} {pendingOperationCount === 1 ? 'change' : 'changes'} waiting to sync
              </p>
            )}
          </div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <span className="topbar__context">PEOPLE DIRECTORY</span>
          <span className="topbar__caption">A thoughtful space for your work circle</span>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
