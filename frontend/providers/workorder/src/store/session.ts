import { AuthByDesktopSession } from '@/api/user';
import { AppSession } from '@/types/user';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export const sessionKey = 'session';

type State = {
  session: AppSession | null;
  authUser: (token: string) => void;
  setAppSession: (session: AppSession) => void;
  delAppSession: () => void;
};

const useSessionStore = create<State>()(
  persist(
    immer((set, get) => ({
      session: null,
      authUser: async (token) => {
        const data = await AuthByDesktopSession({ token });
        set((state) => {
          state.session = data;
        });
      },
      setAppSession: (session) => {
        set({ session });
      },
      delAppSession: () => {
        set({ session: null });
      }
    })),
    {
      name: sessionKey
    }
  )
);

export default useSessionStore;
