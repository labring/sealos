import { AuthByDesktopSession } from '@/api/platform';
import { SystemEnvResponse } from '@/pages/api/platform/getEnv';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type State = {
  isAdmin: boolean;
  AuthUser: () => Promise<SystemEnvResponse>;
};

const useSessionStore = create<State>()(
  immer((set, get) => ({
    isAdmin: false,
    AuthUser: async () => {
      const isAdmin = await AuthByDesktopSession();
      set((state) => {
        state.isAdmin = isAdmin;
      });
      return isAdmin;
    }
  }))
);

export default useSessionStore;
