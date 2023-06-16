import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Session, sessionKey } from '@/types';
import { Provider } from '@/types/user';
const yaml = require('js-yaml');


type SessionState = {
  session: Session;
  provider?: Provider;
  oauth_state: string;
  newUser?: boolean;
  updateUser:()=>void;
  setSession: (ss: Session) => void;
  setSessionProp: (key: keyof Session, value: any) => void;
  getSession: () => Session;
  delSession: () => void;
  isUserLogin: () => boolean;
  getKubeconfigToken: () => string;
  generateState: () => string;
  compareState: (state: string) => boolean;
  setProvider: (provider?: 'github' | 'wechat' | 'phone') => void;
};

const useSessionStore = create<SessionState>()(
  devtools(
    persist(
      immer((set, get) => ({
        session: {} as Session,
        provider: undefined,
        oauth_state: '',
        newUser: false,
        setSession: (ss: Session) => set({ session: ss }),
        updateUser:()=>set((state)=>{state.newUser = true}),
        setSessionProp: (key: keyof Session, value: any) => {
          set((state) => {
            state.session[key] = value;
          });
        },
        getSession: () => get().session,
        delSession: () => {
          set({ session: undefined });
        },
        isUserLogin: () => get().session?.user?.id !== undefined,
        getKubeconfigToken: () => {
          if (get().session?.kubeconfig === '') {
            return '';
          }
          const doc = yaml.load(get().session.kubeconfig);
          return doc?.users[0]?.user?.token;
        },
        generateState: () => {
          const state = ((new Date()).getTime()).toString();
          set({ oauth_state: state });
          return state;
        },
        compareState: (state: string) => {
          let result = state === get().oauth_state;
          set({ oauth_state: undefined });
          return result
        },
        setProvider: (provider?: Provider) => {
          set({ provider });
        }
      })),
      {
        name: sessionKey
      }
    )
  )
);

export default useSessionStore;
