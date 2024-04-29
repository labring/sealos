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
    statePayload: StatePayload;
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
      generateState: (action = 'LOGIN', domainState) => {
        const stateObj = { rad: new Date().getTime().toString(), action } satisfies StatePayload;
        if (!!domainState && action === 'PROXY') {
          stateObj.rad = domainState;
        }
        const state = JSON.stringify(stateObj);
        set({ oauth_state: state });
        return state;
      },
      compareState: (state: string) => {
        let isSuccess = state === get().oauth_state;
        const statePayload = JSON.parse(state) as StatePayload;
        console.log(isSuccess, statePayload, state, get().oauth_state);
        set({ oauth_state: undefined });
        return {
          isSuccess,
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
