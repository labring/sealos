import create from 'zustand';
import { persist } from 'zustand/middleware';
import { Session } from '../interfaces/session';

interface SessionState {
  session: Session | null;
  setSession: (ss: Session) => void;
  delSession: () => void;
  isUserLogin: () => boolean;
}

const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      session: null,
      setSession: (ss) => set(() => ({ session: ss })),
      delSession: () => set(() => ({ session: null })),
      isUserLogin: () => (get().session === null ? false : true)
    }),
    {
      name: 'session',
      getStorage: () => localStorage
    }
  )
);

export { useSessionStore };
