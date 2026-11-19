import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Client-side gating is a UX convenience only. Every privileged API request is
 * independently authorized on the server with JWT + token-version checks.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, mustChangePassword } = useAuth();
  const location = useLocation();

  if (status !== 'signed-in') {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  if (mustChangePassword && location.pathname !== '/admin/change-password') {
    return <Navigate to="/admin/change-password" replace />;
  }

  return <>{children}</>;
}
