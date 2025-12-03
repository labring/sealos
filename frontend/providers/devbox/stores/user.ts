import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { getUserIsOutStandingPayment } from '@/api/platform';
import { SessionV1 } from 'sealos-desktop-sdk';

type State = {
  session: SessionV1 | null;
  setSession: (session: SessionV1) => void;
  isOutStandingPayment: boolean;
  loadUserDebt: () => Promise<null>;
};

export const useUserStore = create<State>()(
  devtools(
    immer((set) => ({
      session: null,
      setSession: (session: SessionV1) => {
        set({ session });
      },
      isOutStandingPayment: false,
      loadUserDebt: async () => {
        const response = await getUserIsOutStandingPayment();

        set((state) => {
          state.isOutStandingPayment = response.isOutStandingPayment;
        });
        return null;
      }
    }))
  )
);
