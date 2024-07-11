import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Session, sessionKey } from '@/types';
import { OauthProvider } from '@/types/user';
type StatePayload = {
  rad: string;
  action: OauthAction;
};
export type OauthAction = 'LOGIN' | 'BIND' | 'UNBIND' | 'PROXY';
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
  generateState: (action?: OauthAction, domainState?: string) => string;
  compareState: (state: string) => {
    isSuccess: boolean;
    action: string;
    statePayload: string[];
  };
  setProvider: (provider?: OauthProvider) => void;
  setToken: (token: string) => void;
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
      // [LOGIN/UNBIND/BIND]_STATE
      // PROXY_DOMAINSTATE, DOMAINSTATE = URL_[LOGIN/UNBIND/BIND]_STATE
      generateState: (action = 'LOGIN', domainState) => {
        let state = action as string;
        if (domainState && action === 'PROXY') {
          state = state + '_' + domainState;
        } else {
          state = state + '_' + new Date().getTime().toString();
        }
        set({ oauth_state: state });
        return state;
      },
      compareState: (state: string) => {
        // fix wechat
        let isSuccess = decodeURIComponent(state) === decodeURIComponent(get().oauth_state);
        console.log(state, get().oauth_state);
        const [action, ...statePayload] = state.split('_');
        set({ oauth_state: undefined });
        return {
          isSuccess,
          action,
          statePayload
        };
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
