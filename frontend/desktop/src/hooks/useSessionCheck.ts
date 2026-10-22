import { checkSessionStatus } from '@/api/auth';
import useSessionStore from '@/stores/session';
import { useEffect, useRef, useState } from 'react';

// One check per desktop mount, including when StrictMode replays effects.
// Workspace changes, window focus and reconnects do not trigger another check.
export function useSessionCheck() {
  const { session, token } = useSessionStore();
  const enabled = !!session?.user && !session.isGuest && !!token;
  const check = useRef<Promise<boolean> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    if (!check.current) {
      check.current = checkSessionStatus(session?.kubeconfig || '')
        .then((result) => result?.code === 200)
        .catch((error) => {
          // Only an authentication failure blocks initialization and redirects
          // through the shared request interceptor. Never log request configs.
          return error?.code !== 401 && error?.response?.status !== 401;
        });
    }
    void check.current.then((valid) => {
      if (active) setReady(valid);
    });
    return () => {
      active = false;
    };
  }, [enabled, session?.kubeconfig]);

  // A 401 clears the store before redirecting. Keep initialization blocked in
  // that interval instead of briefly entering the guest desktop.
  return ready || (!enabled && !check.current);
}
