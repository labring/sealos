import { Session, sessionKey } from '@/types';
import { OauthProvider } from '@/types/user';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type SessionState = {
  session: Session;
  provider?: OauthProvider;
  oauth_state: string;
  setSession: (ss: Session) => void;
  setSessionProp: <T extends keyof Session>(key: T, value: Session[T]) => void;
  getSession: () => Session;
  delSession: () => void;
  isUserLogin: () => boolean;
  generateState: () => string;
  compareState: (state: string) => boolean;
  setProvider: (provider?: OauthProvider) => void;
};

const useSessionStore = create<SessionState>()(
  persist(
    immer((set, get) => ({
      session: {} as Session,
      provider: undefined,
      oauth_state: '',
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
      isUserLogin: () => !!get().session?.user,
      generateState: () => {
        const state = new Date().getTime().toString();
        set({ oauth_state: state });
        return state;
      },
      compareState: (state: string) => {
        let result = state === get().oauth_state;
        set({ oauth_state: undefined });
        return result;
      },
      setProvider: (provider?: OauthProvider) => {
        set({ provider });
      }
    })),
    {
      name: sessionKey
    }
  )
);

export default useSessionStore;
