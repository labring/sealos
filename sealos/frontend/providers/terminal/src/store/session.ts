import * as yaml from 'js-yaml';
import type { SessionV1 as Session } from 'sealos-desktop-sdk/*';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type SessionState = {
  session: Session;
  setSession: (ss: Session) => void;
  setSessionProp: (key: keyof Session, value: any) => void;
  getSession: () => Session;
  delSession: () => void;
  isUserLogin: () => boolean;
  getKubeconfigToken: () => string;
};

const useSessionStore = create<SessionState>()(
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
    isUserLogin: () => !!get().session?.user,
    getKubeconfigToken: () => {
      if (get().session?.kubeconfig === '') {
        return '';
      }
      const doc = yaml.load(get().session.kubeconfig);
      //@ts-ignore
      return doc?.users[0]?.user?.token;
    }
  }))
);

export default useSessionStore;
