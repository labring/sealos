import { getUserQuota } from '@/api/platform';
import { DBEditType } from '@/types/db';
import { UserQuotaItemType } from '@/types/user';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  balance: number;
  userQuota: UserQuotaItemType[];
  loadUserQuota: () => Promise<null>;
  checkQuotaAllow: (request: DBEditType, usedData?: DBEditType) => string;
};

export const useUserStore = create<State>()(
  devtools(
    immer((set, get) => ({
      balance: 5,
      userQuota: [],
      loadUserQuota: async () => {
        const response = await getUserQuota();

        set((state) => {
          state.userQuota = response.quota;
        });
        return null;
      },
      checkQuotaAllow: ({ cpu, memory, storage, replicas }, usedData) => {
        const quote = get().userQuota;

        const request = {
          cpu: (cpu / 1000) * replicas,
          memory: (memory / 1024) * replicas,
          storage: storage * replicas
        };

        if (usedData) {
          const { cpu, memory, storage, replicas } = usedData;
          request.cpu -= (cpu / 1000) * replicas;
          request.memory -= (memory / 1024) * replicas;
          request.storage -= storage * replicas;
        }

        const overLimitTip = {
          cpu: 'app.The applied CPU exceeds the quota',
          memory: 'app.The applied memory exceeds the quota',
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
