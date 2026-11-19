import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Seo } from '../components/Seo';
import { Button } from '../components/ui/Button';
import { InlineNotice } from '../components/ui/feedback';
import { Wordmark } from '../components/brand/Logo';

function policyChecks(password: string) {
  return [
    { label: 'At least 12 characters', met: password.length >= 12 },
    { label: 'Upper and lower case', met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: 'A number', met: /[0-9]/.test(password) },
    { label: 'A symbol', met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function ChangePassword() {
  const { changePassword, mustChangePassword, admin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const checks = policyChecks(newPassword);
  const valid = checks.every((check) => check.met) && newPassword === confirm && currentPassword.length > 0;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (newPassword !== confirm) {
      setError('The new passwords do not match.');
      return;
    }
    if (!checks.every((check) => check.met)) {
      setError('The new password does not meet the policy yet.');
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Password updated', 'Other sessions have been signed out.');
      navigate('/admin', { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Seo title="Change password" description="Update your Herb & Hue admin password." path="/admin/change-password" noIndex />
      <div className="flex min-h-screen items-center justify-center bg-ivory px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="rounded-[4px] border border-forest/10 bg-white p-7 shadow-soft sm:p-9">
            <Wordmark height={26} tone="dark" />
            <p className="mt-6 eyebrow">{mustChangePassword ? 'First sign-in' : 'Account security'}</p>
            <h1 className="mt-3 font-serif text-[32px] leading-tight text-forest-dark">
              {mustChangePassword ? 'Choose a new password' : 'Change your password'}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              {mustChangePassword
                ? 'The bootstrap password is temporary. Choose a strong password you have not used elsewhere before continuing.'
                : `Signed in as ${admin?.email ?? 'admin'}. Changing your password revokes all other sessions.`}
            </p>

            {mustChangePassword ? (
              <InlineNotice tone="warning" className="mt-5">
                Dashboard access is locked until this step is complete.
              </InlineNotice>
            ) : null}

            {error ? (
              <InlineNotice tone="error" className="mt-5">
                <span role="alert">{error}</span>
              </InlineNotice>
            ) : null}

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="current-password" className="field-label">
                  Current password
                </label>
                <input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="new-password" className="field-label">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="field"
                />
                <ul className="mt-3 grid grid-cols-2 gap-1.5">
                  {checks.map((check) => (
                    <li
                      key={check.label}
                      className={`flex items-center gap-1.5 text-[11px] ${check.met ? 'text-forest' : 'text-muted'}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`inline-block h-1.5 w-1.5 rounded-full ${check.met ? 'bg-forest' : 'bg-forest/20'}`}
                      />
                      {check.label}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <label htmlFor="confirm-password" className="field-label">
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="field"
                />
              </div>
              <Button type="submit" loading={submitting} disabled={!valid} className="w-full">
                Update password
              </Button>
            </form>

            {!mustChangePassword ? (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="mt-5 w-full text-center text-[11px] uppercase tracking-[0.14em] text-muted hover:text-forest"
              >
                Cancel
              </button>
            ) : null}
          </div>
          <p className="mt-5 text-center text-[10px] uppercase tracking-[0.16em] text-muted">
            Passwords are hashed with bcrypt · Sessions use HS256 JWTs
          </p>
        </div>
      </div>
    </>
  );
}
