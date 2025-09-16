import { getResourcePrice } from '@/api/platform';
import { userPriceType } from '@/types/user';
import { WorkspaceQuotaItem } from '@/types/workspace';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  userSourcePrice: userPriceType | undefined;
  loadUserSourcePrice: () => Promise<null>;
  userQuota: WorkspaceQuotaItem[];
  loadUserQuota: () => Promise<null>;
  checkExceededQuotas: (
    request: Partial<Record<'cpu' | 'memory' | 'gpu' | 'nodeport' | 'storage' | 'traffic', number>>
  ) => WorkspaceQuotaItem[];
};

let retryGetPrice = 3;

export const useUserStore = create<State>()(
  devtools(
    immer((set, get) => ({
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
      userQuota: [],
      loadUserQuota: async () => {
        const response = await sealosApp.getWorkspaceQuota();

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
