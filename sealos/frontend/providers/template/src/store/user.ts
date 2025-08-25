import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { UserQuotaItemType } from '@/types/user';
import { getUserQuota, getResourcePrice } from '@/api/platform';
import type { userPriceType } from '@/types/user';
import { CheckQuotaType } from '@/types/app';

type State = {
  balance: number;
  userQuota: UserQuotaItemType[];
  loadUserQuota: () => Promise<null>;
  userSourcePrice: userPriceType | undefined;
  loadUserSourcePrice: () => Promise<null>;
  checkQuotaAllow: (request: CheckQuotaType, usedData?: CheckQuotaType) => string;
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
      balance: 5,
      userQuota: [],
      loadUserQuota: async () => {
        const response = await getUserQuota();
        set((state) => {
          state.userQuota = response.quota;
          state.balance = response.balance;
        });
        return null;
      },
      checkQuotaAllow: (
        { cpu, memory, storage, gpu }: CheckQuotaType,
        usedData?: CheckQuotaType
      ) => {
        const quote = get().userQuota;

        const request = {
          cpu: cpu / 1000,
          memory: memory / 1024,
          gpu: gpu?.type ? gpu.amount : 0,
          storage: storage / 1024
        };

        if (usedData) {
          const { cpu, memory, gpu, storage } = usedData;

          request.cpu -= cpu / 1000;
          request.memory -= memory / 1024;
          request.gpu -= gpu?.type ? gpu.amount : 0;
          request.storage -= storage;
        }

        const overLimitTip = {
          cpu: 'app.The applied CPU exceeds the quota',
          memory: 'app.The applied memory exceeds the quota',
          gpu: 'app.The applied GPU exceeds the quota',
          storage: 'app.The applied storage exceeds the quota'
        };

        const exceedQuota = quote.find((item) => {
          if (item.used + request[item.type] > item.limit) {
            return true;
          }
        });

        return exceedQuota?.type ? overLimitTip[exceedQuota.type] : '';
      }
    }))
  )
);
