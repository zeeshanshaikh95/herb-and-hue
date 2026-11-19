import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type Tone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  title: string;
  message?: string;
  tone: Tone;
}

interface ToastContextValue {
  push: (toast: { title: string; message?: string; tone?: Tone }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<Tone, string> = {
  success: 'border-forest/20 bg-forest text-ivory',
  error: 'border-red-900/30 bg-[#3a1414] text-[#f7e8e3]',
  info: 'border-gold/50 bg-ivory text-forest-dark',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback<ToastContextValue['push']>(
    ({ title, message, tone = 'success' }) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((current) => [...current.slice(-2), { id, title, message, tone }]);
      window.setTimeout(() => remove(id), 5200);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (title, message) => push({ title, message, tone: 'success' }),
      error: (title, message) => push({ title, message, tone: 'error' }),
      info: (title, message) => push({ title, message, tone: 'info' }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[120] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-full sm:max-w-sm"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto w-full animate-rise border px-4 py-3.5 shadow-lift ${TONE_STYLES[toast.tone]}`}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-sans text-[12px] font-semibold uppercase tracking-[0.12em]">{toast.title}</p>
                {toast.message ? <p className="mt-1 text-[13px] leading-snug opacity-80">{toast.message}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => remove(toast.id)}
                className="shrink-0 p-1 text-current opacity-60 transition-opacity hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
