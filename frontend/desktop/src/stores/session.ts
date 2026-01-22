import { Session, sessionKey } from '@/types';
import { OauthProvider } from '@/types/user';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import { setSharedAuthCookie } from '@/utils/cookieUtils';

export type OauthAction = 'LOGIN' | 'BIND' | 'UNBIND' | 'PROXY';

type SessionState = {
  session?: Session; // session.token is app token
  token: string; // region token (used for API requests)
  globalToken: string; // global token (used for cross-domain auth cookie)
  provider?: OauthProvider;
  firstUse: Date | null;
  hasEverLoggedIn: boolean;
  setSession: (ss: Session) => void;
  setSessionProp: <T extends keyof Session>(key: T, value: Session[T]) => void;
  delSession: () => void;
  setFirstUse: (d: Date | null) => void;
  setHasEverLoggedIn: (value: boolean) => void;
  isUserLogin: () => boolean;

  generateState: (action?: OauthAction, domainState?: string) => string;
  compareState: (state: string) => {
    action: string;
    statePayload: string[];
  };
  lastSigninProvier?: string;
  setLastSigninProvider: (provider?: string) => void;
  setProvider: (provider?: OauthProvider) => void;
  setToken: (token: string, rememberMe?: boolean) => void; // Sets region token
  setGlobalToken: (token: string) => void; // Sets global token and cookie
  lastWorkSpaceId: string;
  setWorkSpaceId: (id: string) => void;
  setGuestSession: () => void;
  isGuest: () => boolean;
  showGuestLoginModal: boolean;
  openGuestLoginModal: () => void;
  closeGuestLoginModal: () => void;
};

const useSessionStore = create<SessionState>()(
  persist(
    immer((set, get) => ({
      session: undefined,
      provider: undefined,
      lastSigninProvier: undefined,
      firstUse: null,
      hasEverLoggedIn: false,
      token: '', // Region token
      globalToken: '', // Global token
      lastWorkSpaceId: '',
      showGuestLoginModal: false,
      setFirstUse(d) {
        set({
          firstUse: d
        });
      },
      setHasEverLoggedIn(value) {
        set({
          hasEverLoggedIn: value
        });
      },
      setLastSigninProvider(provider?: string) {
        set({ lastSigninProvier: provider });
      },
      setSession: (ss: Session) => set({ session: ss }),
      setSessionProp: <T extends keyof Session>(key: T, value: Session[T]) => {
        set((state) => {
          if (state.session) {
            state.session[key] = value;
          }
        });
      },
      delSession: () => {
        set({ session: undefined });
      },
      isUserLogin: () => {
        const state = get();
        if (state.session?.isGuest) return false;
        return !!state.session?.user;
      },
      // [LOGIN/UNBIND/BIND]_STATE
      // PROXY_DOMAINSTATE, DOMAINSTATE = URL_[LOGIN/UNBIND/BIND]_STATE
      generateState: (action = 'LOGIN', domainState) => {
        let state = action as string;
        if (domainState && action === 'PROXY') {
          state = state + '_' + domainState;
        } else {
          state = state + '_' + new Date().getTime().toString();
        }
        return state;
      },
      compareState: (state: string) => {
        const [action, ...statePayload] = state.split('_');
        return {
          action,
          statePayload
        };
      },
      setProvider: (provider?: OauthProvider) => {
        set({ provider });
      },
      setToken: (token, rememberMe = false) => {
        // Sets region token (used for API requests)
        set({ token });
      },
      setGlobalToken: (token) => {
        // Sets global token and immediately updates cookie
        // Also sets state.token so API requests (getRegionToken, etc.) can use it
        set({ globalToken: token, token: token });
        if (typeof window !== 'undefined') {
          console.log('[SessionStore] Setting global token, state.token, and cookie');
          setSharedAuthCookie(token);
        }
      },
      setWorkSpaceId: (id) => {
        set({ lastWorkSpaceId: id });
      },
      setGuestSession: () => {
        const guestId = `guest_${nanoid()}`;
        set({
          session: {
            isGuest: true,
            guestId,
            token: '',
            user: null,
            kubeconfig: '',
            subscription: null
          }
        });
      },
      isGuest: () => get().session?.isGuest || false,
      openGuestLoginModal: () => {
        set({ showGuestLoginModal: true });
      },
      closeGuestLoginModal: () => {
        set({ showGuestLoginModal: false });
      }
    })),
    {
      name: sessionKey,
      partialize: (state) => {
        const { showGuestLoginModal, globalToken, ...rest } = state;
        // Exclude globalToken and showGuestLoginModal from persistence
        // globalToken is ephemeral and should only exist in memory + cookie
        return rest;
      }
    }
  )
);

export default useSessionStore;
