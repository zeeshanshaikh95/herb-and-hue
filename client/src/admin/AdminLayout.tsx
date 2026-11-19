import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ADMIN_NAV } from '../lib/env';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { Wordmark } from '../components/brand/Logo';
import { AdminIcon } from './AdminUI';

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = async () => {
    await logout();
    toast.info('Signed out', 'The in-memory session has been cleared.');
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gold/20 px-5 py-6">
        <Link to="/admin" onClick={onNavigate} aria-label="Herb & Hue admin home">
          <Wordmark height={30} />
        </Link>
        <p className="mt-3 text-[9px] uppercase tracking-[0.22em] text-gold/60">Store dashboard</p>
      </div>

      <nav aria-label="Admin" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {ADMIN_NAV.map((item) => (
          <NavLink key={item.href} to={item.href} end={item.href === '/admin'} className="admin-nav-link" onClick={onNavigate}>
            <AdminIcon name={item.icon} className="h-[18px] w-[18px] shrink-0 opacity-75" />
            {item.label}
          </NavLink>
        ))}
        <div className="my-4 h-px bg-gold/15" />
        <Link
          to="/"
          target="_blank"
          rel="noopener noreferrer"
          className="admin-nav-link"
          onClick={onNavigate}
        >
          <AdminIcon name="external" className="h-[18px] w-[18px] shrink-0 opacity-75" />
          View storefront
        </Link>
      </nav>

      <div className="border-t border-gold/20 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 font-serif text-[15px] text-gold">
            {admin?.name.slice(0, 1).toUpperCase() ?? 'H'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium text-ivory">{admin?.name ?? 'Admin'}</p>
            <p className="truncate text-[10px] text-ivory/45">{admin?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center gap-2 rounded-[3px] border border-ivory/15 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-ivory/70 transition-colors hover:border-gold/40 hover:text-gold"
        >
          <AdminIcon name="logout" className="h-4 w-4" /> Sign out
        </button>
        <p className="mt-3 text-[9px] leading-relaxed text-ivory/30">
          Session held in memory only. Refreshing this tab signs you out.
        </p>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  useLockBodyScroll(menuOpen);

  return (
    <div className="min-h-screen bg-[#f5f2e9]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-forest lg:block">
        <SidebarContent />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-forest/10 bg-[#f5f2e9]/95 px-4 backdrop-blur sm:px-6 lg:hidden">
          <Link to="/admin" aria-label="Herb & Hue admin home">
            <span className="flex items-center gap-2.5">
              <Wordmark height={22} className="shrink-0" />
              <span className="font-serif text-[19px] text-forest-dark">Herb &amp; Hue</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-[3px] border border-forest/15 text-forest"
            aria-label="Open admin menu"
            aria-expanded={menuOpen}
          >
            <AdminIcon name="menu" className="h-5 w-5" />
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
          <Outlet />
        </main>
      </div>

      <div
        className={`fixed inset-0 z-50 bg-forest transition-opacity duration-300 lg:hidden ${
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="flex h-full flex-col">
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center text-ivory/80 hover:text-gold"
            aria-label="Close admin menu"
          >
            <AdminIcon name="close" className="h-5 w-5" />
          </button>
          <SidebarContent onNavigate={() => setMenuOpen(false)} />
        </div>
      </div>
    </div>
  );
}
