import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Session } from '../interfaces/session';
import { sessionKey } from '../interfaces/session';

type SessionState = {
  session: Session;
  setSession: (ss: Session) => void;
  setSessionProp: (key: keyof Session, value: any) => void;
  getSession: () => Session;
  delSession: () => void;
  isUserLogin: () => boolean;
};

const useSessionStore = create<SessionState>()(
  devtools(
    persist(
      immer((set, get) => ({
        session: {} as Session,
        setSession: (ss: Session) => set({ session: ss }),
        setSessionProp: (key: keyof Session, value: any) => {
          set((state) => {
            state.session[key] = value;
          });
        },
        getSession: () => get().session,
        delSession: () => {
          set({ session: undefined });
        },
        isUserLogin: () => get().session?.user?.id !== undefined
      })),
      { name: sessionKey }
    )
  )
);

export default useSessionStore;
