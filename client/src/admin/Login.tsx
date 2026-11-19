import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Seo } from '../components/Seo';
import { Button } from '../components/ui/Button';
import { Wordmark, LeafMark } from '../components/brand/Logo';
import { InlineNotice } from '../components/ui/feedback';
import { cn } from '../lib/cn';

export function AdminLogin() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (status === 'signed-in') return <Navigate to="/admin" replace />;

  const from = (location.state as { from?: string } | null)?.from ?? '/admin';

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      navigate(result.mustChangePassword ? '/admin/change-password' : from, { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Seo title="Admin sign in" description="Herb & Hue store dashboard." path="/admin/login" noIndex />
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden overflow-hidden bg-forest px-12 py-14 text-ivory lg:flex lg:flex-col lg:justify-between">
          <img
            src={`${import.meta.env.BASE_URL}brand/leaf-mark.png`}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 top-16 w-[420px] opacity-[0.07]"
          />
          <div className="relative">
            <Wordmark height={38} />
            <p className="mt-3 text-[10px] uppercase tracking-[0.22em] text-gold/60">Store dashboard</p>
          </div>
          <div className="relative max-w-md">
            <p className="eyebrow eyebrow-light">Private access</p>
            <h1 className="mt-5 font-serif text-[clamp(2.4rem,4vw,3.4rem)] leading-[1.03] text-ivory">
              The quiet machinery behind the storefront.
            </h1>
            <p className="mt-4 text-[13.5px] leading-[1.9] text-ivory/65">
              Manage the catalogue, moderate genuine reviews, replace imagery and keep the WhatsApp order details
              current — all without touching code.
            </p>
            <div className="mt-8 flex items-center gap-3 border-t border-gold/25 pt-5">
              <LeafMark height={26} className="opacity-70" />
              <p className="text-[10px] uppercase tracking-[0.16em] text-ivory/40">
                Every privileged request is authorized server-side.
              </p>
            </div>
          </div>
          <p className="relative text-[10px] uppercase tracking-[0.16em] text-ivory/30">
            Herb &amp; Hue · Botanical skincare
          </p>
        </div>

        <div className="flex items-center justify-center bg-ivory px-5 py-12 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden">
              <span className="inline-flex items-center gap-3 rounded-[3px] bg-forest px-4 py-3">
                <Wordmark height={22} />
              </span>
            </div>
            <p className="eyebrow">Admin</p>
            <h2 className="mt-4 font-serif text-[34px] leading-tight text-forest-dark">Sign in to the dashboard</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Use the owner account configured for this store.
            </p>

            {error ? (
              <InlineNotice tone="error" className="mt-6" >
                <span role="alert">{error}</span>
              </InlineNotice>
            ) : null}

            <form onSubmit={onSubmit} className="mt-7 space-y-5">
              <div>
                <label htmlFor="admin-email" className="field-label">
                  Email
                </label>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="field"
                  placeholder="owner@example.com"
                />
              </div>
              <div>
                <label htmlFor="admin-password" className="field-label">
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="field"
                  placeholder="••••••••••••"
                />
              </div>
              <Button type="submit" loading={submitting} className={cn('w-full')}>
                Sign in
              </Button>
            </form>

            <p className="mt-6 border-t border-gold/25 pt-5 text-[11px] leading-relaxed text-muted">
              Sessions are held in memory and end when this tab is closed or refreshed. Repeated failed attempts
              temporarily lock the account.
            </p>
            <a href="/" className="mt-6 inline-block text-[10px] font-medium uppercase tracking-[0.16em] text-forest hover:text-gold-dark">
              ← Back to storefront
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
