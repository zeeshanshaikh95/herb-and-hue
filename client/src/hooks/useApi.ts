import { useCallback, useEffect, useRef, useState } from 'react';
import { isAbortError } from '../api/client';

interface ApiState<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
}

/**
 * Runs an abortable request when deps change. Stale responses are ignored and
 * obsolete requests are aborted, so rapid filter changes cannot race.
 */
export function useApi<T>(
  request: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
  options: { enabled?: boolean; initialData?: T | null } = {},
) {
  const { enabled = true, initialData = null } = options;
  const [state, setState] = useState<ApiState<T>>({
    data: initialData,
    error: null,
    loading: enabled,
  });
  const [reloadToken, setReloadToken] = useState(0);
  const requestRef = useRef(request);
  requestRef.current = request;

  useEffect(() => {
    if (!enabled) {
      setState((previous) => ({ ...previous, loading: false }));
      return;
    }
    const controller = new AbortController();
    let active = true;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    requestRef
      .current(controller.signal)
      .then((data) => {
        if (!active) return;
        setState({ data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (!active || isAbortError(error)) return;
        setState((previous) => ({ data: previous.data, error, loading: false }));
      });

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  const setData = useCallback((data: T | null) => {
    setState((previous) => ({ ...previous, data }));
  }, []);

  return { ...state, reload, setData };
}
