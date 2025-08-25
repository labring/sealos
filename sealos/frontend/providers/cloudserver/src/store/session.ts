import type { SessionV1 } from 'sealos-desktop-sdk';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type SessionState = {
  session: SessionV1 | undefined;
  setSession: (ss: SessionV1) => void;
  delSession: () => void;
  token: string;
  setToken: (token: string) => void;
  delToken: () => void;
};

const useSessionStore = create<SessionState>()(
  immer((set, get) => ({
    session: {} as SessionV1,
    token: '',
    setSession: (ss: SessionV1) => set({ session: ss }),
    delSession: () => {
      set({ session: undefined });
    },
    setToken: (token) => set({ token: token }),
    delToken: () => {
      set({ token: '' });
    }
  }))
);

export default useSessionStore;
