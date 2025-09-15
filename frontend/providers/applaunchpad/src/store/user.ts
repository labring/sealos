import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { getResourcePrice, getWorkspaceQuota } from '@/api/platform';
import type { userPriceType } from '@/types/user';
import { WorkspaceQuotaItem } from '@/types/workspace';
import { SessionV1 } from 'sealos-desktop-sdk/*';

type State = {
  session: SessionV1 | null;
  setSession: (session: SessionV1) => void;
  userQuota: WorkspaceQuotaItem[];
  loadUserQuota: () => Promise<null>;
  userSourcePrice: userPriceType | undefined;
  loadUserSourcePrice: () => Promise<null>;
  checkExceededQuotas: (
    request: Partial<Record<'cpu' | 'memory' | 'gpu' | 'nodeport' | 'storage' | 'traffic', number>>
  ) => WorkspaceQuotaItem[];
};

let retryGetPrice = 3;

export const useUserStore = create<State>()(
  devtools(
    immer((set, get) => ({
      session: null,
      setSession: (session: SessionV1) => {
        console.log({ setSession: JSON.stringify(session) });
        set({ session });
      },
      userSourcePrice: undefined,
      async loadUserSourcePrice() {
        try {
          const res = await getResourcePrice();
          set((state) => {
            state.userSourcePrice = res;
          });
          // console.log(res);
        } catch (err) {
          // retry fetch
          retryGetPrice--;
          if (retryGetPrice >= 0) {
            setTimeout(() => {
              get().loadUserSourcePrice();
            }, 1000);
          }
        }
        return null;
      },
      balance: 5,
      userQuota: [],
      loadUserQuota: async () => {
        const response = await getWorkspaceQuota();
        set((state) => {
          state.userQuota = response.quota;
        });
        return null;
      },
      checkExceededQuotas: (request) => {
        const quota = get().userQuota;

        const exceededItems = quota.filter((item) => {
          if (!(item.type in request)) return false;

          if (item.limit - item.used < request[item.type as keyof typeof request]!) {
            return true;
          }
        });

        return exceededItems;
      }
    }))
  )
);
