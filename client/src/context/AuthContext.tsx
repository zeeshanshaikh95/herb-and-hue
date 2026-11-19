import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { setAuthToken, setUnauthorizedHandler } from '../api/client';
import { adminChangePassword, adminLogin, adminLogout } from '../api/admin';
import type { AdminUser } from '../api/types';

interface AuthContextValue {
  admin: AdminUser | null;
  status: 'signed-out' | 'signed-in';
  mustChangePassword: boolean;
  sessionEnded: boolean;
  login: (email: string, password: string) => Promise<{ mustChangePassword: boolean }>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * The JWT is held in memory only. A page refresh therefore ends the admin
 * session by design; there is no token in localStorage for an XSS payload to
 * read. Other admin sessions can be revoked from the server (tokenVersion).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthToken(null);
      setAdmin(null);
      setSessionEnded(true);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await adminLogin(email, password);
    setAuthToken(response.data.token);
    setAdmin(response.data.admin);
    setSessionEnded(false);
    return { mustChangePassword: response.data.mustChangePassword };
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminLogout();
    } catch {
      // Local sign-out must succeed even if the server is unreachable.
    } finally {
      setAuthToken(null);
      setAdmin(null);
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const response = await adminChangePassword(currentPassword, newPassword);
    setAuthToken(response.data.token);
    setAdmin(response.data.admin);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      admin,
      status: admin ? 'signed-in' : 'signed-out',
      mustChangePassword: admin?.mustChangePassword ?? false,
      sessionEnded,
      login,
      logout,
      changePassword,
    }),
    [admin, sessionEnded, login, logout, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
