import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Session, sessionKey } from '@/types';
import { OauthProvider, Provider } from '@/types/user';

type SessionState = {
  session?: Session;
  token: string;
  provider?: OauthProvider;
  oauth_state: string;
  setSession: (ss: Session) => void;
  setSessionProp: <T extends keyof Session>(key: T, value: Session[T]) => void;
  delSession: () => void;
  isUserLogin: () => boolean;
  /*
      when proxy oauth2.0 ,the domainState need to be used 
  */
  generateState: (domainState?: string) => string;
  compareState: (state: string) => boolean;
  setProvider: (provider?: OauthProvider) => void;
  setToken: (token: string) => void;
  setState: (state: string) => void;
  lastWorkSpaceId: string;
  setWorkSpaceId: (id: string) => void;
};

const useSessionStore = create<SessionState>()(
  persist(
    immer((set, get) => ({
      session: undefined,
      provider: undefined,
      oauth_state: '',
      token: '',
      lastWorkSpaceId: '',
      setSession: (ss: Session) => set({ session: ss }),
      setSessionProp: (key: keyof Session, value: any) => {
        set((state) => {
          if (state.session) {
            state.session[key] = value;
          }
        });
      },
      delSession: () => {
        set({ session: undefined });
      },
      isUserLogin: () => !!get().session?.user,
      generateState: (domainState) => {
        let state = new Date().getTime().toString();
        console.log(domainState);
        if (!!domainState) state = domainState;
        set({ oauth_state: state });
        return state;
      },
      setState: (state) => {
        set({ oauth_state: state });
      },
      compareState: (state: string) => {
        let result = state === get().oauth_state;
        console.log(result, get().oauth_state, state, 'compareState');
        set({ oauth_state: undefined });
        return result;
      },
      setProvider: (provider?: OauthProvider) => {
        set({ provider });
      },
      setToken: (token) => {
        set({ token });
      },
      setWorkSpaceId: (id) => {
        set({ lastWorkSpaceId: id });
      }
    })),
    {
      name: sessionKey
    }
  )
);

export default useSessionStore;
