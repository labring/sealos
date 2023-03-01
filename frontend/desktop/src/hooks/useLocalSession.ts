import { Session } from 'interfaces/session';
import { useEffect, useState } from 'react';
import useSessionStore from 'stores/session';

function useLocalSession() {
  const { session } = useSessionStore((s) => s);
  const [localSession, setLocalSession] = useState<Session>({
    token: {
      access_token: '',
      token_type: '',
      refresh_token: '',
      expiry: ''
    },
    kubeconfig: {
      id: '',
      name: '',
      avatar: ''
    },
    user: {
      id: '',
      name: '',
      avatar: ''
    }
  });
  useEffect(() => {
    setLocalSession(session);
  }, [session]);

  return { localSession };
}

export default useLocalSession;
