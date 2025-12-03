import { SessionV1 } from 'sealos-desktop-sdk';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  session: SessionV1 | null;
  setSession: (session: SessionV1) => void;
};

export const useUserStore = create<State>()(
  devtools(
    immer((set) => ({
      session: null,
      setSession: (session: SessionV1) => {
        set({ session });
      }
    }))
  )
);
