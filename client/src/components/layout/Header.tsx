import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { NAV_LINKS } from '../../lib/env';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { Wordmark } from '../brand/Logo';
import { Modal } from '../ui/Modal';
import { buildGeneralEnquiry, buildWhatsAppUrl } from '../../lib/whatsapp';
import { trackEvent } from '../../lib/analytics';
import { WhatsAppIcon } from '../ui/WhatsAppLink';

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M13 13l5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconBag() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3.5 6h13l-1 12h-11l-1-12Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M7 6V4.8A3 3 0 0 1 10 2a3 3 0 0 1 3 2.8V6" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function Header() {
  const { count } = useCart();
  const { settings } = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  useLockBodyScroll(menuOpen);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (searchOpen) window.setTimeout(() => searchRef.current?.focus(), 80);
  }, [searchOpen]);

  const whatsappUrl = buildWhatsAppUrl(settings.whatsappNumber, buildGeneralEnquiry(settings));

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const term = searchTerm.trim();
    setSearchOpen(false);
    setSearchTerm('');
    navigate(term ? `/shop?search=${encodeURIComponent(term)}` : '/shop');
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gold/20 bg-forest/95 text-ivory backdrop-blur-md">
        <div className="container-editorial flex h-[72px] items-center justify-between gap-4 sm:h-20">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center text-ivory/80 transition-colors hover:text-gold lg:hidden"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M3 3l14 14M17 3L3 17" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              ) : (
                <svg width="22" height="14" viewBox="0 0 22 14" fill="none" aria-hidden="true">
                  <path d="M0 1h22M0 7h22M0 13h22" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              )}
            </button>

            <Link to="/" aria-label="Herb & Hue home" className="flex shrink-0 items-center">
              {/* The wordmark is transparent, so it blends into the forest header at any width. */}
              <Wordmark
                priority
                className="h-auto w-[118px] sm:w-[132px] lg:w-[152px]"
              />
            </Link>
          </div>

          <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.href} to={link.href} className="nav-link">
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('whatsapp_click', { path: location.pathname })}
                className="hidden h-10 w-10 items-center justify-center text-ivory/75 transition-colors hover:text-gold sm:flex"
                aria-label="Chat with Herb & Hue on WhatsApp"
              >
                <WhatsAppIcon className="h-[18px] w-[18px]" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-10 w-10 items-center justify-center text-ivory/75 transition-colors hover:text-gold"
              aria-label="Search products"
            >
              <IconSearch />
            </button>
            <Link
              to="/cart"
              className="relative flex h-10 items-center gap-2 px-2 text-ivory/85 transition-colors hover:text-gold"
              aria-label={`Shopping bag, ${count} ${count === 1 ? 'item' : 'items'}`}
            >
              <IconBag />
              <span className="hidden text-[10px] font-medium uppercase tracking-[0.16em] sm:inline">Bag</span>
              {count > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-gold px-1 font-sans text-[9px] font-bold text-forest-dark">
                  {count > 99 ? '99+' : count}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        id="mobile-navigation"
        className={`fixed inset-0 z-50 bg-forest text-ivory transition-opacity duration-300 lg:hidden ${
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-[72px] items-center justify-between px-5 sm:px-8">
            <Link to="/" onClick={() => setMenuOpen(false)} aria-label="Herb & Hue home">
              <Wordmark width={124} />
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center text-ivory/80 hover:text-gold"
              aria-label="Close menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 3l14 14M17 3L3 17" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>
          </div>

          <nav aria-label="Mobile" className="flex flex-1 flex-col justify-center gap-1 px-6 py-8">
            {NAV_LINKS.map((link, index) => (
              <NavLink
                key={link.href}
                to={link.href}
                className="group flex items-baseline justify-between border-b border-gold/15 py-4 font-serif text-[clamp(1.8rem,7vw,2.6rem)] font-light text-ivory/90 transition-colors hover:text-gold"
              >
                <span>{link.label}</span>
                <span className="font-sans text-[10px] tracking-[0.2em] text-gold/50">0{index + 1}</span>
              </NavLink>
            ))}
          </nav>

          <div className="space-y-4 border-t border-gold/20 px-6 py-6">
            <Link
              to="/cart"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.16em] text-gold"
            >
              <span>Shopping bag</span>
              <span className="tabular-nums">{count} items</span>
            </Link>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-[12px] text-ivory/70 hover:text-gold"
              >
                <WhatsAppIcon className="h-4 w-4" /> Chat with us on WhatsApp
              </a>
            ) : null}
            {settings.contact.email ? (
              <a
                href={`mailto:${settings.contact.email}`}
                className="block text-[12px] text-ivory/70 hover:text-gold"
              >
                {settings.contact.email}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Search the collection" size="sm">
        <form onSubmit={onSearch} className="space-y-4">
          <label htmlFor="site-search" className="sr-only">
            Search products
          </label>
          <div className="flex items-center border border-forest/25 bg-white px-4">
            <IconSearch />
            <input
              ref={searchRef}
              id="site-search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Serum, cleanser, balm…"
              className="w-full bg-transparent px-3 py-3.5 text-[15px] outline-none placeholder:text-charcoal/40"
              type="search"
              maxLength={120}
            />
          </div>
          <p className="text-[12px] text-muted">Search by name, texture or product detail.</p>
          <button type="submit" className="btn btn-primary w-full">
            Search
          </button>
        </form>
      </Modal>
    </>
  );
}
