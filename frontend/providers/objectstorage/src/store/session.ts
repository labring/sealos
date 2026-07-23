import type { SessionV1 as Session } from 'sealos-desktop-sdk';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type SessionState = {
  session?: Session;
  locale: string;
  setSession: (ss: Session) => void;
  setSessionProp: <T extends keyof Session>(key: T, value: Session[T]) => void;
  delSession: () => void;
  isUserLogin: () => boolean;
};
const useSessionStore = create<SessionState>()(
  devtools(
    persist(
      immer((set, get) => ({
        session: undefined,
        locale: 'zh',
        setSession: (ss: Session) => set({ session: ss }),
        setSessionProp: (key, value) => {
          set((state) => ({
            ...state.session,
            [key]: value
          }));
        },
        delSession: () => {
          set({ session: undefined });
        },
        isUserLogin: () => !!get().session?.user
      })),
      { name: 'sealos-session' }
    )
  )
);

export default useSessionStore;
