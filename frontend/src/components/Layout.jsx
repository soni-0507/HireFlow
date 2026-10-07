import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth.js';
import { useTheme } from '../store/theme.js';
import { initials } from '../lib/format.js';

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/candidates', label: 'Candidates' },
  { to: '/pipeline', label: 'Pipeline', roles: ['recruiter'] },
  { to: '/interviews', label: 'Interviews' },
  { to: '/feedback', label: 'Feedback' },
  { to: '/activity', label: 'Activity', roles: ['recruiter'] },
];

function ThemeToggle() {
  const { mode, toggle } = useTheme();
  return (
    <button onClick={toggle} className="btn-secondary btn-sm" aria-label="Toggle dark mode" title="Toggle dark mode">
      {mode === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const links = NAV.filter((n) => !n.roles || n.roles.includes(user.role));

  // close the mobile drawer on navigation
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setOpen(false);
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <p className="font-display text-xl font-bold text-stone-900 dark:text-stone-50">Hiring Pipeline</p>
        <p className="muted mt-0.5 text-xs capitalize">{user.role} workspace</p>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm font-medium ${
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-200'
                  : 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-stone-200 p-4 dark:border-stone-800">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{initials(user.name)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="muted truncate text-xs">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ThemeToggle />
          <button onClick={logout} className="btn-secondary btn-sm flex-1">Log out</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-stone-200 bg-surface dark:border-stone-800 dark:bg-surface-dark lg:block">
        {sidebar}
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-surface px-4 py-3 dark:border-stone-800 dark:bg-surface-dark lg:hidden">
        <p className="font-display text-lg font-bold">Hiring Pipeline</p>
        <button onClick={() => setOpen(true)} className="btn-secondary btn-sm" aria-label="Open menu">Menu</button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-stone-950/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-surface shadow-xl dark:bg-surface-dark">{sidebar}</aside>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
