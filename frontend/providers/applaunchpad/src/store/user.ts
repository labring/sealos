import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { getResourcePrice } from '@/api/platform';
import type { userPriceType } from '@/types/user';
import { SessionV1 } from 'sealos-desktop-sdk/*';

type State = {
  session: SessionV1 | null;
  setSession: (session: SessionV1) => void;
  userSourcePrice: userPriceType | undefined;
  loadUserSourcePrice: () => Promise<null>;
};

let retryGetPrice = 3;

export const useUserStore = create<State>()(
  devtools(
    immer((set, get) => ({
      session: null,
      setSession: (session: SessionV1) => {
        set({ session });
      },
      userSourcePrice: undefined,
      async loadUserSourcePrice() {
        try {
          const res = await getResourcePrice();
          set((state) => {
            state.userSourcePrice = res;
          });
        } catch (err) {
          retryGetPrice--;
          if (retryGetPrice >= 0) {
            setTimeout(() => {
              get().loadUserSourcePrice();
            }, 1000);
          }
        }
        return null;
      }
    }))
  )
);
