import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { UserQuotaItemType } from '@/types/user';
import { getUserQuota, getResourcePrice } from '@/api/platform';
import type { userPriceType } from '@/types/user';
import { AppEditType } from '@/types/app';

type State = {
  balance: number;
  userQuota: UserQuotaItemType[];
  loadUserQuota: () => Promise<null>;
  userSourcePrice: userPriceType | undefined;
  loadUserSourcePrice: () => Promise<null>;
  checkQuotaAllow: (request: AppEditType, usedData?: AppEditType) => string;
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
      checkQuotaAllow: ({ cpu, memory, gpu, storeList, replicas, hpa }, usedData) => {
        const quote = get().userQuota;

        const requestReplicas = Number(hpa.use ? hpa.maxReplicas : replicas);
        const request = {
          cpu: (cpu / 1000) * requestReplicas,
          memory: (memory / 1024) * requestReplicas,
          gpu: (gpu?.type ? gpu.amount : 0) * requestReplicas,
          storage: storeList.reduce((sum, item) => sum + item.value, 0) * requestReplicas
        };

        if (usedData) {
          const { cpu, memory, gpu, storeList, replicas, hpa } = usedData;
          const requestReplicas = Number(hpa.use ? hpa.maxReplicas : replicas);

          request.cpu -= (cpu / 1000) * requestReplicas;
          request.memory -= (memory / 1024) * requestReplicas;
          request.gpu -= (gpu?.type ? gpu.amount : 0) * requestReplicas;
          request.storage -= storeList.reduce((sum, item) => sum + item.value, 0) * requestReplicas;
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
