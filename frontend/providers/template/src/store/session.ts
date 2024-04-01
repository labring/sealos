import * as yaml from 'js-yaml';
import type { SessionV1 } from 'sealos-desktop-sdk';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type SessionState = {
  session: SessionV1;
  locale: string;
  setSession: (ss: SessionV1) => void;
  setSessionProp: (key: keyof SessionV1, value: any) => void;
  getSession: () => SessionV1;
  delSession: () => void;
  isUserLogin: () => boolean;
  getKubeconfigToken: () => string;
};

const useSessionStore = create<SessionState>()(
  immer((set, get) => ({
    session: {} as SessionV1,
    locale: 'zh',
    setSession: (ss: SessionV1) => set({ session: ss }),
    setSessionProp: (key: keyof SessionV1, value: any) => {
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
